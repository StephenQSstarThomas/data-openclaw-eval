import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, IPCChannel } from './ipc-channels';

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 笔记
  createNote: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE, data),
  updateNote: (id: string, data: any) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_UPDATE, id, data),
  deleteNote: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),
  getNote: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET, id),
  listNotes: (filter?: any) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_LIST, filter),

  // 笔记本
  createNotebook: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.NOTEBOOK_CREATE, data),
  updateNotebook: (id: string, data: any) => ipcRenderer.invoke(IPC_CHANNELS.NOTEBOOK_UPDATE, id, data),
  deleteNotebook: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTEBOOK_DELETE, id),
  listNotebooks: () => ipcRenderer.invoke(IPC_CHANNELS.NOTEBOOK_LIST),

  // 标签
  createTag: (name: string, color?: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_CREATE, name, color),
  deleteTag: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_DELETE, id),
  listTags: () => ipcRenderer.invoke(IPC_CHANNELS.TAG_LIST),
  searchTags: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_SEARCH, query),

  // 搜索
  searchFulltext: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_FULLTEXT, query),
  searchByTag: (tagIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_BY_TAG, tagIds),
  searchBoolean: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_BOOLEAN, query),

  // 知识图谱
  buildGraph: () => ipcRenderer.invoke(IPC_CHANNELS.GRAPH_BUILD),
  getNeighbors: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.GRAPH_GET_NEIGHBORS, noteId),

  // 导入导出
  exportMarkdown: (noteIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, noteIds),
  exportHTML: (noteIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_HTML, noteIds),
  exportPDF: (noteIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_PDF, noteIds),
  importNotion: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_NOTION, filePath),
  importObsidian: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_OBSIDIAN, dirPath),

  // 设置
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),

  // 窗口
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
});
