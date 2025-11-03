import { ipcMain, dialog, type BrowserWindow } from 'electron';

/**
 * UI Handlers - File dialogs, window controls, etc.
 */

export function setupUIHandlers(mainWindow: BrowserWindow): void {
  // Show file open dialog
  ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  // Show file save dialog
  ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });
}
