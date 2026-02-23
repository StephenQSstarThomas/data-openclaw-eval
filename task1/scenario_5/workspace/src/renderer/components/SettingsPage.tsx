import React, { useState, useEffect } from 'react';

interface Settings {
  theme: string;
  fontSize: number;
  fontFamily: string;
  editorLineNumbers: boolean;
  editorWordWrap: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  shortcuts: Record<string, string>;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  const updateSetting = async (key: string, value: any) => {
    await window.electronAPI.setSettings(key, value);
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  if (!settings) return <div>加载中...</div>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>设置</h2>

      {/* 外观 */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: '#6366f1' }}>外观</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>主题</label>
            <select value={settings.theme} onChange={e => updateSetting('theme', e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="system">跟随系统</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>字体大小</label>
            <input type="range" min={12} max={20} value={settings.fontSize}
              onChange={e => updateSetting('fontSize', Number(e.target.value))} />
            <span style={{ minWidth: 30, textAlign: 'right' }}>{settings.fontSize}px</span>
          </div>
        </div>
      </section>

      {/* 编辑器 */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: '#6366f1' }}>编辑器</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            显示行号
            <input type="checkbox" checked={settings.editorLineNumbers}
              onChange={e => updateSetting('editorLineNumbers', e.target.checked)} />
          </label>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            自动换行
            <input type="checkbox" checked={settings.editorWordWrap}
              onChange={e => updateSetting('editorWordWrap', e.target.checked)} />
          </label>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            拼写检查
            <input type="checkbox" checked={settings.spellCheck}
              onChange={e => updateSetting('spellCheck', e.target.checked)} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>自动保存间隔</label>
            <select value={settings.autoSaveInterval} onChange={e => updateSetting('autoSaveInterval', Number(e.target.value))}
              style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}>
              <option value={0}>关闭</option>
              <option value={1000}>1 秒</option>
              <option value={3000}>3 秒</option>
              <option value={5000}>5 秒</option>
              <option value={10000}>10 秒</option>
            </select>
          </div>
        </div>
      </section>

      {/* 快捷键 */}
      <section>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: '#6366f1' }}>快捷键</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(settings.shortcuts).map(([action, key]) => (
            <div key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 13 }}>{SHORTCUT_LABELS[action] || action}</span>
              <kbd style={{ padding: '4px 8px', background: '#f3f4f6', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', border: '1px solid #d1d5db' }}>{key}</kbd>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const SHORTCUT_LABELS: Record<string, string> = {
  newNote: '新建笔记',
  search: '全局搜索',
  save: '保存',
  toggleSidebar: '切换侧边栏',
  toggleGraph: '切换图谱',
  quickSwitcher: '快速切换',
  bold: '加粗',
  italic: '斜体',
  codeBlock: '代码块',
};

export default SettingsPage;
