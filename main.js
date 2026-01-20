const { app, BrowserWindow, ipcMain } = require("electron");
const { loadWhatsApp, sendNotification } = require("./src/window");
const { createTray } = require("./src/tray");
const { clearServiceWorkers } = require("./src/session");
const AutoLaunch = require("auto-launch");

/** @type{BrowserWindow} */
let whatsappInstance;

/** @type{Electron.Tray} */
let tray;

const isFirstInstance = app.requestSingleInstanceLock();

app.disableHardwareAcceleration();

if (!isFirstInstance) {
  console.log("tried triggering multiple instances, quitting.");
  quitApp();
  return;
}

app.on("second-instance", () => {
  if (whatsappInstance) {
    if (whatsappInstance.isMinimized()) {
      whatsappInstance.restore();
    }
    showApp();
  }
});

function showApp() {
  if (whatsappInstance) {
    whatsappInstance.show();
    whatsappInstance.focus();
  }
}

function toggleAppVisibility() {
  if (whatsappInstance) {
    if (whatsappInstance.isVisible()) {
      whatsappInstance.hide();
    } else {
      showApp();
    }
  }
}

function quitApp() {
  tray?.destroy();
  whatsappInstance?.destroy();
  app.quit();
}

const createAndLoadMainWindow = async () => {
  const shouldStartHidden = process.argv.includes("--hidden");

  whatsappInstance = await loadWhatsApp({ show: !shouldStartHidden });
  tray = createTray([
    { label: "Show", click: showApp },
    "separator",
    { label: "Quit", click: quitApp },
  ]);

  tray.on("click", toggleAppVisibility);
};

app.whenReady().then(() => {
  createAndLoadMainWindow();

  const autoLauncher = new AutoLaunch({
    name: "WhatsApp",
    path: app.getPath("exe"),
    isHidden: true,
  });

  autoLauncher.isEnabled().then((isEnabled) => {
    if (!isEnabled) {
      autoLauncher
        .enable()
        .then(() => {
          console.log("Auto-launch enabled successfully.");
        })
        .catch((err) => {
          console.error("Failed to enable auto-launch:", err);
        });
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && !whatsappInstance) {
      createAndLoadMainWindow();
    } else if (whatsappInstance) {
      if (whatsappInstance.isMinimized()) {
        whatsappInstance.restore();
      }
      showApp();
    }
  });
});

app.on("before-quit", clearServiceWorkers);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    quitApp();
  }
});

ipcMain.on(
  "whatsapp-notification-from-renderer",
  (event, { title, body, icon }) => {
    sendNotification(title, body, icon);
  },
);

ipcMain.on("update-badge-count", (event, count) => {
  if (app.isReady() && app.setBadgeCount) {
    app.setBadgeCount(count);
    if (
      process.platform === "darwin" &&
      count > 0 &&
      !whatsappInstance.isFocused()
    ) {
      app.dock.bounce("informational");
    }
  }
});
