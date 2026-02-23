/**
 * IPC 通道定义 — 主进程与渲染进程通信的所有通道名称
 * 统一管理避免硬编码字符串
 */

export const IPC_CHANNELS = {
  // 笔记操作
  NOTE_CREATE: 'note:create',
  NOTE_UPDATE: 'note:update',
  NOTE_DELETE: 'note:delete',
  NOTE_GET: 'note:get',
  NOTE_LIST: 'note:list',
  NOTE_SEARCH: 'note:search',

  // 笔记本操作
  NOTEBOOK_CREATE: 'notebook:create',
  NOTEBOOK_UPDATE: 'notebook:update',
  NOTEBOOK_DELETE: 'notebook:delete',
  NOTEBOOK_LIST: 'notebook:list',

  // 标签操作
  TAG_CREATE: 'tag:create',
  TAG_DELETE: 'tag:delete',
  TAG_LIST: 'tag:list',
  TAG_SEARCH: 'tag:search',

  // 知识图谱
  GRAPH_BUILD: 'graph:build',
  GRAPH_GET_NEIGHBORS: 'graph:neighbors',

  // 导入导出
  EXPORT_MARKDOWN: 'export:markdown',
  EXPORT_HTML: 'export:html',
  EXPORT_PDF: 'export:pdf',
  IMPORT_NOTION: 'import:notion',
  IMPORT_OBSIDIAN: 'import:obsidian',

  // 搜索
  SEARCH_FULLTEXT: 'search:fulltext',
  SEARCH_BY_TAG: 'search:bytag',
  SEARCH_BOOLEAN: 'search:boolean',

  // 设置
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // 系统
  APP_GET_VERSION: 'app:version',
  APP_CHECK_UPDATE: 'app:check-update',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
