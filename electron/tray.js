const { Menu, Tray, nativeImage } = require('electron');

function createTray({ iconPath, getEnabled, getFloatingVisible, onEnable, onDisable, onShow, onHide, onOpen, onQuit }) {
  const fallbackPng = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAcUlEQVR4nO3VuwHAIAwDUQbJTgzC/nUyAD+Z2FiFCre6V0F5Wi2ZlxoX4BTwAhcCQMJmSFQYhtyILxG34lMELSAiPkRQAiLjHUIAAQQQgPIlpACk/4YUAG/EsLEDeCGm+wjgD2S7awFYIPDeCcD1BPgALPxbRysQEFUAAAAASUVORK5CYII=';
  const configuredIcon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  const trayIcon = configuredIcon.isEmpty()
    ? nativeImage.createFromDataURL(`data:image/png;base64,${fallbackPng}`)
    : configuredIcon;
  const tray = new Tray(trayIcon);
  tray.setToolTip('Orbitvoice');
  const updateMenu = () => {
    const enabled = getEnabled();
    const floatingVisible = getFloatingVisible();
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: enabled ? 'Disable Orbitvoice' : 'Enable Orbitvoice', click: enabled ? onDisable : onEnable },
      { label: floatingVisible ? 'Hide Floating Microphone' : 'Show Floating Microphone', click: floatingVisible ? onHide : onShow },
      { type: 'separator' },
      { label: 'Open Settings', click: onOpen },
      { type: 'separator' },
      { label: 'Quit Application', click: onQuit }
    ]));
  };
  tray.on('click', onOpen);
  tray.updateMenu = updateMenu;
  updateMenu();
  return tray;
}

module.exports = { createTray };
