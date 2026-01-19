import { MenuItemConstructorOptions } from 'electron';

export interface LoadWhatsAppOptions {
  show?: boolean;
}

export type TrayMenuItem = MenuItemConstructorOptions | 'separator';

export interface CacheData {
  ts: number;
  ua: string;
}

export interface CustomWAapi {
  triggerInitialBadgeUpdate: () => void;
  cleanup: () => void;
}
