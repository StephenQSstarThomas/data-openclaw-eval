import React, { useState, useEffect } from 'react';

interface Notebook {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string;
  sort_order: number;
}

interface SidebarProps {
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string | null) => void;
  onCreateNotebook: (name: string, parentId?: string) => void;
  onRenameNotebook: (id: string, newName: string) => void;
  onDeleteNotebook: (id: string) => void;
  noteCount: Record<string, number>;
}

const Sidebar: React.FC<SidebarProps> = ({
  notebooks, selectedNotebookId, onSelectNotebook,
  onCreateNotebook, onRenameNotebook, onDeleteNotebook, noteCount
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  // 构建树结构
  const buildTree = (parentId: string | null): Notebook[] => {
    return notebooks
      .filter(nb => nb.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderTree = (parentId: string | null, depth: number = 0): React.ReactNode => {
    const children = buildTree(parentId);
    return children.map(nb => {
      const hasChildren = notebooks.some(n => n.parent_id === nb.id);
      const isExpanded = expanded.has(nb.id);
      const isSelected = selectedNotebookId === nb.id;
      const count = noteCount[nb.id] || 0;

      return (
        <div key={nb.id}>
          <div
            onClick={() => onSelectNotebook(nb.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 8px', paddingLeft: 8 + depth * 16,
              borderRadius: 6, cursor: 'pointer',
              background: isSelected ? '#ede9fe' : 'transparent',
              color: isSelected ? '#6d28d9' : '#374151',
              fontSize: 13,
            }}
          >
            {hasChildren && (
              <span onClick={(e) => { e.stopPropagation(); toggleExpand(nb.id); }}
                style={{ cursor: 'pointer', fontSize: 10, width: 14 }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {!hasChildren && <span style={{ width: 14 }} />}
            <span>{nb.icon}</span>
            {editingId === nb.id ? (
              <input value={editName} autoFocus
                onChange={e => setEditName(e.target.value)}
                onBlur={() => { onRenameNotebook(nb.id, editName); setEditingId(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { onRenameNotebook(nb.id, editName); setEditingId(null); }}}
                style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 4px', fontSize: 13, flex: 1 }}
              />
            ) : (
              <span onDoubleClick={() => { setEditingId(nb.id); setEditName(nb.name); }} style={{ flex: 1 }}>{nb.name}</span>
            )}
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{count}</span>
          </div>
          {hasChildren && isExpanded && renderTree(nb.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="sidebar" style={{
      width: 240, borderRight: '1px solid #e5e7eb', background: '#fafafa',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{ padding: '12px 12px 8px', fontWeight: 600, fontSize: 14, color: '#111', display: 'flex', justifyContent: 'space-between' }}>
        <span>笔记本</span>
        <button onClick={() => setShowNewInput(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#6366f1' }}>+</button>
      </div>

      <div onClick={() => onSelectNotebook(null)} style={{
        padding: '6px 12px', borderRadius: 6, margin: '0 8px', cursor: 'pointer',
        background: selectedNotebookId === null ? '#ede9fe' : 'transparent',
        fontSize: 13, color: selectedNotebookId === null ? '#6d28d9' : '#374151',
      }}>
        📋 所有笔记
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
        {renderTree(null)}
      </div>

      {showNewInput && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb' }}>
          <input value={newName} autoFocus placeholder="新笔记本名称"
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onCreateNotebook(newName.trim()); setNewName(''); setShowNewInput(false); }}}
            onBlur={() => setShowNewInput(false)}
            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
          />
        </div>
      )}
    </div>
  );
};

export default Sidebar;
