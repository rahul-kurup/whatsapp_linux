import { BrowserWindow, nativeTheme, Notification, shell } from 'electron';
import path from 'path';
import { APP_TITLE } from '../constants';
import { LoadWhatsAppOptions } from '../types/common';
import { RendererCode } from '../types/renderer';
import icon from './icon';
import { getUserAgent } from './userAgent';

let whatsappWindow: BrowserWindow | null = null;

function execJs(code: RendererCode) {
  try {
    if (whatsappWindow) {
      whatsappWindow.webContents?.executeJavaScript?.(code).then();
    }
  } catch (error) {
    console.error('Error executing JavaScript:', error);
  }
}

export async function loadWhatsApp({
  show = true,
}: LoadWhatsAppOptions): Promise<BrowserWindow> {
  nativeTheme.themeSource = 'system';

  whatsappWindow = new BrowserWindow({
    show,
    width: 1100,
    height: 800,
    center: true,
    hasShadow: true,
    autoHideMenuBar: true,
    icon: icon.appIcon,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  whatsappWindow.setTitle(APP_TITLE);

  whatsappWindow.webContents.once('did-finish-load', (): void => {
    console.log(
      'Main window finished loading web content. Triggering initial badge update.'
    );
    execJs('wa_api.triggerInitialBadgeUpdate()');
    checkNotificationPermission();
    setupExternalLinkHandling(whatsappWindow!.webContents);
  });

  whatsappWindow.on('close', (event: Electron.Event): void => {
    event.preventDefault();
    whatsappWindow?.hide();
    console.log('Whatsapp hidden/minimized.');
  });

  whatsappWindow.on('closed', (): void => {
    // Cleanup observers before destroying window
    execJs('wa_api.cleanup()');
    whatsappWindow = null;
    console.log('Whatsapp quit');
  });

  const userAgent: string = await getUserAgent();

  whatsappWindow.loadURL('https://web.whatsapp.com/', { userAgent });

  return whatsappWindow;
}

function setupExternalLinkHandling(webContents: Electron.WebContents): void {
  webContents?.setWindowOpenHandler(
    ({ url }: { url: string }): { action: 'deny' | 'allow' } => {
      if (isExternalLink(url)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    }
  );
}

function isExternalLink(url: string): boolean {
  const whatsappDomains: string[] = [
    'whatsapp.com',
    'web.whatsapp.com',
    'chat.whatsapp.com',
  ];
  return !whatsappDomains.some((domain: string): boolean =>
    url.includes(domain)
  );
}

function checkNotificationPermission(): void {
  if (Notification.isSupported()) {
    console.log('Native OS Notifications are supported.');
  } else {
    console.log('Native OS Notifications are not supported on this system.');
  }
}

export function sendNotification(
  title: string,
  body: string,
  iconPath?: string
): void {
  if (Notification.isSupported()) {
    const notificationOptions: Electron.NotificationConstructorOptions = {
      title: title || `${APP_TITLE} Notification`,
      body: body || 'You have a new message.',
      icon:
        iconPath || path.join(__dirname, '..', '..', 'assets', '512x512.png'),
      silent: false,
    };

    const notification = new Notification(notificationOptions);

    notification.on('click', (): void => {
      if (whatsappWindow) {
        if (whatsappWindow.isMinimized()) {
          whatsappWindow.restore();
        }
        whatsappWindow.show();
        whatsappWindow.focus();
      } else {
        console.log(
          'Notification clicked, but main window was closed. Cannot show.'
        );
      }
    });
    notification.show();
  }
}
