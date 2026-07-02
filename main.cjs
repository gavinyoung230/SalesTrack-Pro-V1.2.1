const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // Keep it highly polished: hides default File/Edit menu
  });

  // Determine development vs distribution loading state
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // In local dev, load the active Vite development server URL
    mainWindow.loadURL('http://localhost:3000');
    // Open Chromium DevTools for debugging
    mainWindow.webContents.openDevTools();
  } else {
    // In built-for-production exe, load the static HTML file
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
