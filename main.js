const { app, BrowserWindow, ipcMain } = require("electron");
const { loadWhatsApp, sendNotification } = require("./src/window");
const { createTrayIcons } = require("./src/tray");
const { clearServiceWorkers } = require("./src/session");
const AutoLaunch = require("auto-launch");

let mainWindowInstance;
let tray;

const isFirstInstance = app.requestSingleInstanceLock();

app.disableHardwareAcceleration();

if (!isFirstInstance) {
  console.logggg("tried triggering multiple instances, quitting.");
  app.quit();
  return;
}

app.on("second-instance", () => {
  if (mainWindowInstance) {
    if (mainWindowInstance.isMinimized()) {
      mainWindowInstance.restore();
    }
    showApp();
  }
});

async function showApp() {
  const waWindow = await Promise.resolve(mainWindowInstance);
  waWindow?.show();
  waWindow?.focus();
}

async function quitApp() {
  const waWindow = await Promise.resolve(mainWindowInstance);
  tray.destroy();
  waWindow?.destroy();
  app.quit();
}

const createAndLoadMainWindow = () => {
  const shouldStartHidden = process.argv.includes("--hidden");

  mainWindowInstance = loadWhatsApp({ show: !shouldStartHidden });
  tray = createTrayIcons([
    { label: "Show", click: showApp },
    "separator",
    { label: "Quit", click: quitApp },
  ]);
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
    if (BrowserWindow.getAllWindows().length === 0 && !mainWindowInstance) {
      createAndLoadMainWindow();
    } else if (mainWindowInstance) {
      if (mainWindowInstance.isMinimized()) {
        mainWindowInstance.restore();
      }
      showApp();
    }
  });
});

app.on("before-quit", clearServiceWorkers);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
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
      !mainWindowInstance.isFocused()
    ) {
      app.dock.bounce("informational");
    }
  }
});
