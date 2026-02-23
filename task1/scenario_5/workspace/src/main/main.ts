import { app, BrowserWindow, ipcMain } from 'electron';
import { windowManager } from './window-manager';
import { IPC_CHANNELS } from './ipc-channels';
import { Database } from '../database/database';
import { runMigrations } from '../database/migrate';

let db: Database;

async function initializeApp() {
  // 初始化数据库
  db = new Database();
  runMigrations(db.getConnection());

  // 创建窗口
  windowManager.createMainWindow();

  // 注册 IPC 处理器
  registerIPCHandlers();
}

function registerIPCHandlers() {
  // 笔记 CRUD
  ipcMain.handle(IPC_CHANNELS.NOTE_CREATE, async (_event, data) => {
    return db.createNote(data);
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_UPDATE, async (_event, id, data) => {
    return db.updateNote(id, data);
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, async (_event, id) => {
    return db.deleteNote(id);
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_GET, async (_event, id) => {
    return db.getNote(id);
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_LIST, async (_event, filter) => {
    return db.listNotes(filter);
  });

  // 笔记本
  ipcMain.handle(IPC_CHANNELS.NOTEBOOK_CREATE, async (_event, data) => {
    return db.createNotebook(data);
  });
  ipcMain.handle(IPC_CHANNELS.NOTEBOOK_LIST, async () => {
    return db.listNotebooks();
  });

  // 标签
  ipcMain.handle(IPC_CHANNELS.TAG_LIST, async () => {
    return db.listTags();
  });
  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, async (_event, name, color) => {
    return db.createTag(name, color);
  });

  // 搜索
  ipcMain.handle(IPC_CHANNELS.SEARCH_FULLTEXT, async (_event, query) => {
    return db.searchFulltext(query);
  });

  // 窗口控制
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => windowManager.minimize());
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => windowManager.maximize());
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => windowManager.close());
}

app.whenReady().then(initializeApp);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow();
  }
});
