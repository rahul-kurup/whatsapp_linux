import { contextBridge, ipcRenderer } from 'electron';

export const APP_TITLE = 'WhatsApp';

export const PRELOAD = {
  WA_OBJECT: 'wa_api',
  EVENT_WA_NOTIFY: 'wa:ntfy',
  EVENT_UPDATE_BADGE_COUNT: 'wa:update_badge',
} as const;

if (typeof window !== 'undefined' && window) {
  window.document.title = APP_TITLE;

  const observers: MutationObserver[] = [];

  // Cleanup function to prevent memory leaks
  const cleanup = (): void => {
    observers.forEach((observer) => {
      observer.disconnect();
    });
    observers.length = 0;
  };

  // Clean up observers when window is about to unload
  window.addEventListener('beforeunload', cleanup);

  window.addEventListener('DOMContentLoaded', (): void => {
    const OriginalNotification = window.Notification;

    // Override window.Notification to intercept notifications
    const NotificationConstructor = function (
      this: Notification,
      title: string,
      options?: NotificationOptions
    ) {
      const notificationData = {
        title: title,
        body: options?.body || '',
        icon: (options?.icon as string) || '',
      };

      ipcRenderer.send(PRELOAD.EVENT_WA_NOTIFY, notificationData);

      return new OriginalNotification(title, options);
    };

    // Copy static properties from original Notification
    NotificationConstructor.requestPermission =
      OriginalNotification.requestPermission.bind(OriginalNotification);

    // Define permission as a getter to maintain compatibility
    Object.defineProperty(NotificationConstructor, 'permission', {
      get: () => OriginalNotification.permission,
      enumerable: true,
      configurable: true,
    });

    // Replace window.Notification with our wrapper
    window.Notification =
      NotificationConstructor as unknown as typeof Notification;

    function getUnreadCountFromTitle(): number {
      const match = document.title.match(/^\((\d+)\)/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      return 0;
    }

    let lastSentCount = -1;

    const sendBadgeCount = (): void => {
      const currentCount = getUnreadCountFromTitle();
      if (currentCount !== lastSentCount) {
        ipcRenderer.send(PRELOAD.EVENT_UPDATE_BADGE_COUNT, currentCount);
        lastSentCount = currentCount;
      }
    };

    // Observe title changes to detect unread message count
    const titleElement = document.querySelector('head > title');
    if (titleElement) {
      const observer = new MutationObserver(sendBadgeCount);

      observer.observe(titleElement, {
        characterData: true,
        subtree: true,
        childList: true,
      });
      observers.push(observer);
    } else {
      console.warn(
        'Title element not found directly, observing head for title changes. Initial count might be delayed.'
      );
      const observer = new MutationObserver(sendBadgeCount);
      observer.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observers.push(observer);
    }

    // Expose API to the renderer process
    contextBridge.exposeInMainWorld(PRELOAD.WA_OBJECT, {
      cleanup,
      triggerInitialBadgeUpdate: sendBadgeCount,
    });
  });
}
