const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 520, height: 420, resizable: false });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
});

app.on('window-all-closed', () => app.quit());
