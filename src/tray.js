const { Tray, Menu, MenuItem } = require("electron");
const path = require("path");

/**
 *
 * @param {Array<{label: string; click: () => void} | "separator">} menuItems
 * @returns
 */
function createTrayIcons(menuItems = []) {
  const tray = new Tray(path.join(__dirname, "../assets/512x512.png"));

  const menuItemTemplate = [...menuItems].map((item) => {
    if (item === "separator") {
      return {
        type: "separator",
      };
    }
    return new MenuItem(item);
  });

  const contextMenu = Menu.buildFromTemplate(menuItemTemplate);

  tray.setContextMenu(contextMenu);

  return tray;
}

module.exports = { createTrayIcons };
