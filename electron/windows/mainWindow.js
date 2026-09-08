const { BrowserWindow } = require('electron');
const path = require('path');

function createMainWindow({ rendererUrl }) {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 640,
    minHeight: 620,
    show: false,
    backgroundColor: '#101114',
    title: 'Orbitvoice',
    // Supplying the ICO here is what makes the app identity appear correctly
    // in the Windows taskbar, Alt+Tab, and the window switcher.
    icon: path.join(__dirname, '..', 'assets', 'orbitvoice.ico'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`${rendererUrl}/`);
  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) mainWindow.show();
  });
  return mainWindow;
}

module.exports = { createMainWindow };
