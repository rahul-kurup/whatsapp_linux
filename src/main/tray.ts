import { Menu, MenuItemConstructorOptions, Tray } from 'electron';
import { TrayMenuItem } from '../types/common';
import icon from './icon';

export class WhatsappTray {
  #tray: Tray;

  constructor() {
    this.#tray = new Tray(icon.loading);

    return this;
  }

  get tray(): Tray {
    return this.#tray;
  }

  destroy() {
    this.#tray?.destroy?.();
  }

  setMenuItems(menuItems: TrayMenuItem[] = []) {
    const template: MenuItemConstructorOptions[] = menuItems.map(
      (item: TrayMenuItem): MenuItemConstructorOptions => {
        if (item === 'separator') {
          return {
            type: 'separator',
          };
        }
        return item;
      }
    );

    const contextMenu = Menu.buildFromTemplate(template);

    this.#tray.setContextMenu(contextMenu);
  }

  updateState(state: 'idle' | 'new-message' | 'loading') {
    switch (state) {
      case 'loading':
        this.#tray.setImage(icon.loading);
        break;
      case 'new-message':
        this.#tray.setImage(icon.appIconFilled);
        break;
      default:
        this.#tray.setImage(icon.appIcon);
        break;
    }
  }
}
