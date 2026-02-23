import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';
import NoteEditor from './NoteEditor';
import Toolbar from './Toolbar';
import NoteCard from './NoteCard';
import TagSelector from './TagSelector';
import GraphView from './GraphView';

type ViewMode = 'list' | 'editor' | 'graph' | 'settings';

const AppLayout: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<any>(null);
  const [noteCount, setNoteCount] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [nbs, tgs] = await Promise.all([
      window.electronAPI.listNotebooks(),
      window.electronAPI.listTags(),
    ]);
    setNotebooks(nbs);
    setTags(tgs);
    loadNotes(selectedNotebookId);
  };

  const loadNotes = async (notebookId: string | null) => {
    const filter = notebookId ? { notebook_id: notebookId } : {};
    const noteList = await window.electronAPI.listNotes(filter);
    setNotes(noteList);
  };

  const openNote = async (id: string) => {
    const note = await window.electronAPI.getNote(id);
    if (note) {
      setSelectedNoteId(id);
      setNoteContent(note.content);
      setViewMode('editor');
    }
  };

  const handleSearch = async (filters: any) => {
    if (filters.mode === 'boolean') {
      const results = await window.electronAPI.searchBoolean(filters.query);
      setNotes(results);
    } else {
      const results = await window.electronAPI.searchFulltext(filters.query);
      setNotes(results);
    }
  };

  const openGraph = async () => {
    const data = await window.electronAPI.buildGraph();
    setGraphData(data);
    setViewMode('graph');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar
        notebooks={notebooks}
        selectedNotebookId={selectedNotebookId}
        onSelectNotebook={(id) => { setSelectedNotebookId(id); loadNotes(id); setViewMode('list'); }}
        onCreateNotebook={(name) => window.electronAPI.createNotebook({ name }).then(loadData)}
        onRenameNotebook={(id, name) => window.electronAPI.updateNotebook(id, { name }).then(loadData)}
        onDeleteNotebook={(id) => window.electronAPI.deleteNotebook(id).then(loadData)}
        noteCount={noteCount}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #e5e7eb', gap: 8 }}>
          <button onClick={() => setViewMode('list')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: viewMode === 'list' ? '#ede9fe' : 'transparent', cursor: 'pointer', fontSize: 13 }}>📋 列表</button>
          <button onClick={openGraph} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: viewMode === 'graph' ? '#ede9fe' : 'transparent', cursor: 'pointer', fontSize: 13 }}>🕸 图谱</button>
          <button onClick={() => setViewMode('settings')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: viewMode === 'settings' ? '#ede9fe' : 'transparent', cursor: 'pointer', fontSize: 13, marginLeft: 'auto' }}>⚙ 设置</button>
        </div>
        <SearchBar onSearch={handleSearch} tags={tags} notebooks={notebooks} />

        {viewMode === 'list' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignContent: 'start' }}>
            {notes.map(note => (
              <NoteCard key={note.id} {...note} tags={[]} updatedAt={note.updated_at} isPinned={!!note.is_pinned} wordCount={note.word_count} onClick={openNote} onPin={() => {}} />
            ))}
          </div>
        )}

        {viewMode === 'editor' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Toolbar onAction={(action, payload) => console.log(action, payload)} />
            <TagSelector selectedTags={noteTags} onTagAdd={() => {}} onTagRemove={() => {}} onTagCreate={() => {}} />
            <NoteEditor content={noteContent} onChange={setNoteContent} />
          </div>
        )}

        {viewMode === 'graph' && graphData && (
          <GraphView nodes={graphData.nodes} edges={graphData.edges} onNodeClick={openNote} />
        )}
      </div>
    </div>
  );
};

export default AppLayout;
