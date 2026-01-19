const { BrowserWindow, shell, Notification } = require("electron");
const path = require("path");
const { getUserAgent } = require("./userAgent");

/** @type{BrowserWindow} */
let whatsappWindow;

async function loadWhatsApp({ show = true }) {
  whatsappWindow = new BrowserWindow({
    show,
    width: 1100,
    height: 800,
    center: true,
    hasShadow: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../assets/512x512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  whatsappWindow.setTitle("WhatsApp");

  whatsappWindow.webContents.once("did-finish-load", () => {
    console.log(
      "Main window finished loading web content. Triggering initial badge update.",
    );
    whatsappWindow.webContents
      .executeJavaScript("window.whatsappApi.triggerInitialBadgeUpdate();")
      .catch((error) =>
        console.error("Error triggering initial badge update:", error),
      );

    checkNotificationPermission();
    setupExternalLinkHandling(whatsappWindow.webContents);
  });

  whatsappWindow.on("close", (event) => {
    event.preventDefault();
    whatsappWindow.hide();
    console.log("Window 'close' event: Window hidden.");
  });

  whatsappWindow.on("closed", () => {
    whatsappWindow = null;
    console.log(
      "Window 'closed' event: Window instance destroyed and set to null.",
    );
  });

  const userAgent = await getUserAgent();

  whatsappWindow.loadURL("https://web.whatsapp.com/", { userAgent });

  return whatsappWindow;
}

function setupExternalLinkHandling(webContents) {
  webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalLink(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

function isExternalLink(url) {
  const whatsappDomains = [
    "whatsapp.com",
    "web.whatsapp.com",
    "chat.whatsapp.com",
  ];
  return !whatsappDomains.some((domain) => url.includes(domain));
}

function checkNotificationPermission() {
  if (Notification.isSupported()) {
    console.log("Native OS Notifications are supported.");
  } else {
    console.log("Native OS Notifications are not supported on this system.");
  }
}

function sendNotification(title, body, iconPath) {
  if (Notification.isSupported()) {
    const notificationOptions = {
      title: title || "WhatsApp Notification",
      body: body || "You have a new message.",
      icon: iconPath || path.join(__dirname, "../assets/512x512.png"),
      silent: false,
    };

    const notification = new Notification(notificationOptions);

    notification.on("click", () => {
      if (whatsappWindow) {
        if (whatsappWindow.isMinimized()) {
          whatsappWindow.restore();
        }
        whatsappWindow.show();
        whatsappWindow.focus();
      } else {
        console.log(
          "Notification clicked, but main window was closed. Cannot show.",
        );
      }
    });
    notification.show();
  }
}

module.exports = { loadWhatsApp, sendNotification };
