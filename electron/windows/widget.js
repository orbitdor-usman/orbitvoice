const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { readSettings, writeSettings } = require('../../backend/config/settings');

function clampPosition(point) {
  const area = screen.getDisplayNearestPoint({ x: Math.round(point.x), y: Math.round(point.y) }).workArea;
  return { x: Math.round(Math.max(area.x, Math.min(point.x, area.x + area.width - 64))), y: Math.round(Math.max(area.y, Math.min(point.y, area.y + area.height - 64))) };
}

function createWidgetWindow({ rendererUrl, onReady }) {
  const display = screen.getPrimaryDisplay();
  const { workArea } = display;
  const position = clampPosition(readSettings().widgetPosition || { x: workArea.x + workArea.width - 88, y: workArea.y + workArea.height - 108 });
  const widget = new BrowserWindow({
    width: 64,
    height: 64,
    x: position.x,
    y: position.y,
    show: false,
    minWidth: 64,
    minHeight: 64,
    maxWidth: 64,
    maxHeight: 64,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  widget.setAlwaysOnTop(true, 'floating');
  widget.setMenuBarVisibility(false);
  widget.loadURL(`${rendererUrl}/widget/`);
  widget.webContents.once('did-finish-load', () => {
    onReady?.(widget);
  });
  const reposition = () => {
    if (widget.isDestroyed()) return;
    const [x, y] = widget.getPosition();
    const next = clampPosition({ x, y });
    widget.setPosition(next.x, next.y);
    writeSettings({ widgetPosition: next });
  };
  screen.on('display-removed', reposition);
  screen.on('display-metrics-changed', reposition);
  widget.on('closed', () => { screen.removeListener('display-removed', reposition); screen.removeListener('display-metrics-changed', reposition); });
  return widget;
}

module.exports = { createWidgetWindow, clampPosition };
