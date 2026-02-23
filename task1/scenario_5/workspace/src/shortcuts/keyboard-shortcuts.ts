/**
 * 全局快捷键注册模块
 */

import { globalShortcut, BrowserWindow } from 'electron';
import { settingsStore, ShortcutMap } from '../services/settings-store';

type ShortcutAction = (win: BrowserWindow) => void;

const ACTIONS: Record<keyof ShortcutMap, ShortcutAction> = {
  newNote: (win) => win.webContents.send('shortcut:new-note'),
  search: (win) => win.webContents.send('shortcut:search'),
  save: (win) => win.webContents.send('shortcut:save'),
  toggleSidebar: (win) => win.webContents.send('shortcut:toggle-sidebar'),
  toggleGraph: (win) => win.webContents.send('shortcut:toggle-graph'),
  quickSwitcher: (win) => win.webContents.send('shortcut:quick-switcher'),
  bold: (win) => win.webContents.send('shortcut:bold'),
  italic: (win) => win.webContents.send('shortcut:italic'),
  codeBlock: (win) => win.webContents.send('shortcut:code-block'),
};

export function registerShortcuts(win: BrowserWindow): void {
  const shortcuts = settingsStore.get('shortcuts');

  for (const [action, accelerator] of Object.entries(shortcuts)) {
    const handler = ACTIONS[action as keyof ShortcutMap];
    if (!handler || !accelerator) continue;

    try {
      globalShortcut.register(accelerator, () => handler(win));
    } catch (e) {
      console.warn(`[shortcuts] Failed to register ${action}: ${accelerator}`, e);
    }
  }
  console.log(`[shortcuts] ${Object.keys(shortcuts).length} shortcuts registered`);
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll();
}

export function updateShortcut(action: keyof ShortcutMap, newAccelerator: string, win: BrowserWindow): boolean {
  const shortcuts = settingsStore.get('shortcuts');
  const oldAccelerator = shortcuts[action];

  // 注销旧快捷键
  if (oldAccelerator) {
    try { globalShortcut.unregister(oldAccelerator); } catch {}
  }

  // 注册新快捷键
  try {
    globalShortcut.register(newAccelerator, () => ACTIONS[action](win));
    shortcuts[action] = newAccelerator;
    settingsStore.set('shortcuts', shortcuts);
    return true;
  } catch {
    // 注册失败，恢复旧的
    if (oldAccelerator) {
      try { globalShortcut.register(oldAccelerator, () => ACTIONS[action](win)); } catch {}
    }
    return false;
  }
}
