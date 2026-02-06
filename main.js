const { app, BrowserWindow, screen, ipcMain, desktopCapturer } = require('electron');

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: 300,     
    height: 300,      

    minWidth: 50,
    minHeight: 50,

    x: width - 320,    //  right corner
    y: height - 320,   // bottom corner
    transparent: true,  // Transparent Window (Important)
    frame: false,      // Delete Frame (Important)
    alwaysOnTop: true, // Always on Top
    hasShadow: false,  // No Shadow (Important)
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // need to be true when release
    }
  });

  win.loadFile('index.html');
  
  // For Development: Open DevTools (Uncomment to use)
  // win.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.handle('GET_SOURCES', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return sources;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('EXIT_APP', () => {
  app.quit();
});

ipcMain.on('RESIZE_WINDOW', (event, { deltaX }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  win.setMinimumSize(50, 50);

  const [currentW, currentH] = win.getSize();
  
  let newWidth = currentW + deltaX;
  if (newWidth < 100) newWidth = 100;

  win.setSize(newWidth, newWidth); 
});

ipcMain.on('MOVE_WINDOW', (event, { deltaX, deltaY }) => {

  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const [currentX, currentY] = win.getPosition();
  const newX = currentX + deltaX;
  const newY = currentY + deltaY;

  win.setPosition(newX, newY);

});

ipcMain.on('SET_IGNORE_MOUSE_EVENTS', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  win.setIgnoreMouseEvents(ignore, options);
});