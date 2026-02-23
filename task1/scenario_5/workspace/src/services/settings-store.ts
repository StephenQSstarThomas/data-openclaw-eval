/**
 * 设置持久化存储
 * 使用 electron-store 保存用户偏好
 */

import Store from 'electron-store';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  editorLineNumbers: boolean;
  editorWordWrap: boolean;
  sidebarWidth: number;
  defaultNotebook: string | null;
  autoSaveInterval: number;   // ms, 0 = disabled
  spellCheck: boolean;
  shortcuts: ShortcutMap;
}

export interface ShortcutMap {
  newNote: string;
  search: string;
  save: string;
  toggleSidebar: string;
  toggleGraph: string;
  quickSwitcher: string;
  bold: string;
  italic: string;
  codeBlock: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  editorLineNumbers: true,
  editorWordWrap: true,
  sidebarWidth: 240,
  defaultNotebook: null,
  autoSaveInterval: 3000,
  spellCheck: false,
  shortcuts: {
    newNote: 'CmdOrCtrl+N',
    search: 'CmdOrCtrl+Shift+F',
    save: 'CmdOrCtrl+S',
    toggleSidebar: 'CmdOrCtrl+\\',
    toggleGraph: 'CmdOrCtrl+G',
    quickSwitcher: 'CmdOrCtrl+P',
    bold: 'CmdOrCtrl+B',
    italic: 'CmdOrCtrl+I',
    codeBlock: 'CmdOrCtrl+Shift+K',
  },
};

class SettingsStore {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'settings',
      defaults: DEFAULT_SETTINGS,
    });
  }

  getAll(): AppSettings {
    return {
      theme: this.store.get('theme', DEFAULT_SETTINGS.theme),
      fontSize: this.store.get('fontSize', DEFAULT_SETTINGS.fontSize),
      fontFamily: this.store.get('fontFamily', DEFAULT_SETTINGS.fontFamily),
      editorLineNumbers: this.store.get('editorLineNumbers', DEFAULT_SETTINGS.editorLineNumbers),
      editorWordWrap: this.store.get('editorWordWrap', DEFAULT_SETTINGS.editorWordWrap),
      sidebarWidth: this.store.get('sidebarWidth', DEFAULT_SETTINGS.sidebarWidth),
      defaultNotebook: this.store.get('defaultNotebook', DEFAULT_SETTINGS.defaultNotebook),
      autoSaveInterval: this.store.get('autoSaveInterval', DEFAULT_SETTINGS.autoSaveInterval),
      spellCheck: this.store.get('spellCheck', DEFAULT_SETTINGS.spellCheck),
      shortcuts: this.store.get('shortcuts', DEFAULT_SETTINGS.shortcuts),
    };
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key, DEFAULT_SETTINGS[key]);
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  reset(): void {
    this.store.clear();
  }
}

export const settingsStore = new SettingsStore();
