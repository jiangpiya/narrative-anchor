import { ipcMain, BrowserWindow, app } from 'electron';

export function registerAppHandlers() {
  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  ipcMain.handle('app:toggleFullscreen', (event) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return false;
    const isFull = win.isFullScreen();
    win.setFullScreen(!isFull);
    return !isFull;
  });

  // 设置窗口模式
  ipcMain.handle('app:setWindowMode', async (event, mode: 'windowed' | 'fullscreen' | 'borderless') => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return false;

    switch (mode) {
      case 'windowed':
        // 退出全屏，并确保窗口有边框（如果之前被隐藏）
        win.setFullScreen(false);
        // 恢复窗口边框（如果之前设置了无边框，需要重建窗口，这里简单处理）
        // 实际项目中可能需要保存窗口大小和位置
        win.setResizable(true);
        win.setMovable(true);
        break;
      case 'fullscreen':
        win.setFullScreen(true);
        break;
      case 'borderless':
        // 无边框全屏：先全屏，再隐藏标题栏（Windows 可能需要额外处理）
        win.setFullScreen(true);
        // 尝试隐藏菜单栏和标题栏
        win.setMenuBarVisibility(false);
        win.setTitleBarStyle('hidden'); // 仅在 macOS 有效，Windows 可尝试
        break;
    }
    return true;
  });

  // 获取当前窗口模式
  ipcMain.handle('app:getWindowMode', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return 'windowed';
    if (win.isFullScreen()) {
      // 进一步判断是否为无边框？这里简化，全屏即返回 'fullscreen'
      return 'fullscreen';
    }
    return 'windowed';
  });
  ipcMain.handle('app:setWindowFullscreen', async (event, fullscreen: boolean) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return false;
    win.setFullScreen(fullscreen);
    return win.isFullScreen();
  });

  // 获取当前全屏状态
  ipcMain.handle('app:isWindowFullscreen', async () => {
    const win = BrowserWindow.getFocusedWindow();
    return win ? win.isFullScreen() : false;
  });
}