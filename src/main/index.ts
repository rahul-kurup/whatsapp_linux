import AutoLaunch from 'auto-launch';
import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import { APP_TITLE, PRELOAD } from '../constants';
import { NotificationData } from '../types/events';
import { clearServiceWorkers } from './session';
import { WhatsappTray } from './tray';
import { loadWhatsApp, sendNotification } from './window';

let waTray: WhatsappTray | null = null;
let waInstance: BrowserWindow | null = null;

const isLinux = process.platform === 'darwin';
const isFirstInstance: boolean = app.requestSingleInstanceLock();

app.disableHardwareAcceleration();

if (!isFirstInstance) {
  console.log('tried triggering multiple instances, quitting.');
  quitApp();
  process.exit(0);
}

app.on('second-instance', (): void => {
  if (waInstance) {
    if (waInstance.isMinimized()) {
      waInstance.restore();
    }
    showApp();
  }
});

async function showApp(): Promise<void> {
  const waWindow: BrowserWindow | null = await Promise.resolve(waInstance);
  if (waWindow) {
    waWindow.show();
    waWindow.focus();
  }
}

function toggleAppVisibility(): void {
  if (waInstance) {
    if (waInstance.isVisible()) {
      waInstance.hide();
    } else {
      showApp();
    }
  }
}

function quitApp(): void {
  waTray?.destroy();
  waInstance?.destroy();
  app?.quit();
}

async function createAndLoadMainWindow(): Promise<void> {
  const shouldStartHidden: boolean = process.argv.includes('--hidden');
  waInstance = await loadWhatsApp({ show: !shouldStartHidden });
  waTray = new WhatsappTray();
  waTray.setMenuItems([
    { label: 'Show', click: showApp },
    'separator',
    { label: 'Quit', click: quitApp },
  ]);
  waTray.updateState('loading');
  waTray.tray.on('click', toggleAppVisibility);
}

app.whenReady().then((): void => {
  createAndLoadMainWindow();

  const autoLauncher = new AutoLaunch({
    name: APP_TITLE,
    path: app.getPath('exe'),
    isHidden: true,
  });

  autoLauncher.isEnabled().then((isEnabled: boolean): void => {
    if (!isEnabled) {
      autoLauncher
        .enable()
        .then((): void => {
          console.log('Auto-launch enabled successfully.');
        })
        .catch((err: Error): void => {
          console.error('Failed to enable auto-launch:', err);
        });
    }
  });

  app.on('activate', (): void => {
    if (BrowserWindow.getAllWindows().length === 0 && !waInstance) {
      createAndLoadMainWindow();
    } else if (waInstance) {
      if (waInstance.isMinimized()) {
        waInstance.restore();
      }
      showApp();
    }
  });
});

app.on('before-quit', clearServiceWorkers);

app.on('window-all-closed', (): void => {
  if (!isLinux) {
    quitApp();
  }
});

ipcMain.on(
  PRELOAD.EVENT_WA_NOTIFY,
  (_event: IpcMainEvent, { title, body, icon }: NotificationData): void => {
    sendNotification(title, body, icon);
  }
);

ipcMain.on(
  PRELOAD.EVENT_UPDATE_BADGE_COUNT,
  (_event: IpcMainEvent, count: number): void => {
    if (app.isReady() && app.setBadgeCount && waTray) {
      if (count) {
        waTray.updateState('new-message');
      } else {
        waTray.updateState('idle');
      }
      app.setBadgeCount(count);
      if (isLinux && count > 0 && waInstance && !waInstance.isFocused()) {
        app.dock?.bounce('informational');
      }
    }
  }
);
