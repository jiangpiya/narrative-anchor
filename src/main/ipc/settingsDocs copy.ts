import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDb } from '../database/db';
import { SettingsDocModel } from '../database/models/SettingsDocModel';

// 确保目录存在
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 处理文件名冲突：若文件已存在，生成带时间戳的新文件名
function resolveFileNameConflict(dir: string, originalName: string): string {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  let finalName = originalName;
  let counter = 1;
  while (fs.existsSync(path.join(dir, finalName))) {
    finalName = `${baseName}_${Date.now()}_${counter}${ext}`;
    counter++;
  }
  return finalName;
}

/**
 * 注册设定文档相关的 IPC 处理器
 */
export function registerSettingsDocsHandlers() {
  // 保存文档
  ipcMain.handle('settings:saveDoc', async (event, fileName: string, content: string, isCore: boolean) => {
    try {
      // 1. 确定保存目录
      const userDataPath = app.getPath('userData');
      const settingsDir = path.join(userDataPath, 'settings');
      ensureDir(settingsDir);

      // 2. 处理文件名冲突
      const finalFileName = resolveFileNameConflict(settingsDir, fileName);
      const filePath = path.join(settingsDir, finalFileName);

      // 3. 写入文件
      fs.writeFileSync(filePath, content, 'utf8');

      // 4. 保存记录到数据库
      const db = getDb();
      const docModel = new SettingsDocModel(db);
      const docId = docModel.create(finalFileName, filePath, isCore);

      // 5. 获取完整记录并转换为驼峰命名
      const savedDoc = docModel.getById(docId);
      if (!savedDoc) throw new Error('Failed to retrieve saved document');

      return {
        id: savedDoc.id,
        filename: savedDoc.filename,
        filePath: savedDoc.file_path,
        isCore: savedDoc.is_core === 1,
        enabled: savedDoc.enabled === 1,
        isCleaned: savedDoc.is_cleaned === 1,
      };
    } catch (error) {
      console.error('[IPC] settings:saveDoc error:', error);
      throw new Error(`Failed to save document: ${error.message}`);
    }
  });

  // 获取所有文档
  ipcMain.handle('settings:getDocs', async () => {
    try {
      const db = getDb();
      const docModel = new SettingsDocModel(db);
      const rows = docModel.getAll();
      // 转换为驼峰命名
      return rows.map(row => ({
        id: row.id,
        filename: row.filename,
        filePath: row.file_path,
        isCore: row.is_core === 1,
        enabled: row.enabled === 1,
        isCleaned: row.is_cleaned === 1,
      }));
    } catch (error) {
      console.error('[IPC] settings:getDocs error:', error);
      throw new Error('Failed to fetch documents');
    }
  });
}