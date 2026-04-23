import { app, ipcMain, dialog } from 'electron';  // 补充 app
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { SettingsDocModel } from '../database/models/SettingsDocModel';  // 修正路径
import { getDb } from '../database/db';

console.log('settingsDocs module loaded');

const db = getDb();
const settingsDocModel = new SettingsDocModel(db);

// 确保目录存在
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 处理文件名冲突
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

// 辅助函数：读取文件内容（支持 .txt/.md/.docx）
async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else {
    // .txt 或 .md
    return fs.readFileSync(filePath, 'utf-8');
  }
}
/**
 * 注册设定文档相关的 IPC 处理器
 */
export function registerSettingsDocsHandlers() {
// 保存文档（原文档保存）
ipcMain.handle('settings:saveDoc', async (event, name: string, content: string, isCleaned: boolean) => {
  try {

    // 生成存储路径：项目目录下的 userData/settings_docs/
    const userDataPath = app.getPath('userData');
    const docsDir = path.join(userDataPath, 'setting_documents');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    const fileName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = path.join(docsDir, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    const id = settingsDocModel.create(name, content, isCleaned);
    return { success: true, id };
  } catch (error: any) {
    console.error('saveDoc error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:setCore', async (event, id: number, isCore: boolean) => {
  try {
    const db = getDb();
    const docModel = new SettingsDocModel(db);
    docModel.updateCore(id, isCore);
    return { success: true };
  } catch (error) {
    console.error('[IPC] settings:setCore error:', error);
    throw new Error(`Failed to set core flag: ${error.message}`);
  }
});

// 获取所有文档
ipcMain.handle('settings:getDocs', async () => {
  try {
    const db = getDb();
    const docModel = new SettingsDocModel(db);
    const rows = docModel.getAll();
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

  // ========== 新增处理器 ==========

  // 1. 上传文档（使用文件对话框）
  ipcMain.handle('settings:uploadDoc', async (event, isCore: boolean = false) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['txt', 'md', 'docx'] },
        ],
      });
      if (canceled || filePaths.length === 0) return null;

      const filePath = filePaths[0];
      const fileName = path.basename(filePath);
      const content = await readFileContent(filePath);

      // 保存到磁盘
      const userDataPath = app.getPath('userData');
      const settingsDir = path.join(userDataPath, 'settings');
      ensureDir(settingsDir);

      const finalFileName = resolveFileNameConflict(settingsDir, fileName);
      const destPath = path.join(settingsDir, finalFileName);
      fs.writeFileSync(destPath, content, 'utf8');

      // 保存到数据库
      const db = getDb();
      const docModel = new SettingsDocModel(db);
      const docId = docModel.create(finalFileName, destPath, isCore);
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
      console.error('[IPC] settings:uploadDoc error:', error);
      throw new Error(`Failed to upload document: ${error.message}`);
    }
  });


  // 2. 切换启用状态
  ipcMain.handle('settings:toggleDoc', async (event, id: number, enabled: boolean) => {
    try {
      const db = getDb();
      const docModel = new SettingsDocModel(db);
      docModel.updateEnabled(id, enabled);
      return { success: true };
    } catch (error) {
      console.error('[IPC] settings:toggleDoc error:', error);
      throw new Error(`Failed to toggle document: ${error.message}`);
    }
  });

  // 3. 删除文档（同时删除物理文件）
  ipcMain.handle('settings:deleteDoc', async (event, id: number) => {
    try {
      const db = getDb();
      const docModel = new SettingsDocModel(db);
      const doc = docModel.getById(id);
      if (!doc) throw new Error(`Document ${id} not found`);

      // 删除物理文件
      if (fs.existsSync(doc.file_path)) {
        fs.unlinkSync(doc.file_path);
      }

      // 删除数据库记录
      docModel.delete(id);
      return { success: true };
    } catch (error) {
      console.error('[IPC] settings:deleteDoc error:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  });

  // 4. 读取文档内容（用于 AI 清洗）
  ipcMain.handle('settings:readDocFile', async (event, id: number) => {
    try {
      const db = getDb();
      const docModel = new SettingsDocModel(db);
      const doc = docModel.getById(id);
      if (!doc) throw new Error(`Document ${id} not found`);
      const content = fs.readFileSync(doc.file_path, 'utf8');
      return { content };
    } catch (error) {
      console.error('[IPC] settings:readDocFile error:', error);
      throw new Error(`Failed to read document: ${error.message}`);
    }
  });

  // 5. 保存清洗后的版本（新文件，并标记原文档已清洗）
  ipcMain.handle('settings:saveCleaned', async (event, originalId: number, cleanedMarkdown: string ) => {
    try {
      const db = getDb();
      const docModel = new SettingsDocModel(db);
      const originalDoc = docModel.getById(originalId);
      if (!originalDoc) throw new Error(`Original document ${originalId} not found`);

      // 生成新文件名：原文件名（不带扩展名）_cleaned.md
      const originalFileName = originalDoc.filename;
      const ext = path.extname(originalFileName);
      const baseName = path.basename(originalFileName, ext);
      const newFileName = `${baseName}_cleaned.md`;
      const userDataPath = app.getPath('userData');
      const settingsDir = path.join(userDataPath, 'settings');
      ensureDir(settingsDir);

      const finalFileName = resolveFileNameConflict(settingsDir, newFileName);
      const filePath = path.join(settingsDir, finalFileName);
      fs.writeFileSync(filePath, cleanedMarkdown, 'utf8');

      // 创建新文档记录（isCleaned 默认为 0，因为这是清洗后的版本，但它本身可以再清洗？这里设为 isCleaned=0 表示不是清洗后的产物？为了语义，新文档的 isCleaned 设为 0，原文档的 isCleaned 设为 1）
      const newDocId = docModel.create(finalFileName, filePath,originalDoc.is_core === 1, true); 

      const newDoc = docModel.getById(newDocId);
      if (!newDoc) throw new Error('Failed to create cleaned document');

      return {
        id: newDoc.id,
        filename: newDoc.filename,
        filePath: newDoc.file_path,
        isCore: newDoc.is_core === 1,
        enabled: newDoc.enabled === 1,
        isCleaned: newDoc.is_cleaned === 1,
      };
    } catch (error) {
      console.error('[IPC] settings:saveCleaned error:', error);
      throw new Error(`Failed to save cleaned document: ${error.message}`);
    }
  });

// 可选：打开文件对话框并读取内容（用于DocUploader简化版）
ipcMain.handle('dialog:openAndReadFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['txt', 'md', 'docx'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }
  const filePath = result.filePaths[0];
  try {
    const content = await readFileContent(filePath);
    const fileName = path.basename(filePath);
    return { success: true, fileName, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 更新文档内容（覆盖原文件，并可选重置 isCleaned 标记）
ipcMain.handle('settings:updateDoc', async (event, docId: number, newContent: string) => {
  try {
    const db = getDb();
    const docModel = new SettingsDocModel(db);
    const doc = docModel.getById(docId);
    if (!doc) throw new Error(`Document ${docId} not found`);

    // 覆盖文件内容
    fs.writeFileSync(doc.file_path, newContent, 'utf8');

    // 可选：重置 isCleaned 为 false（因为内容已修改，需要重新清洗）
    docModel.updateCleaned(docId, false);

    return { success: true };
  } catch (error: any) {
    console.error('[IPC] settings:updateDoc error:', error);
    return { success: false, error: error.message };
  }
});

}