import React, { useState, useCallback } from 'react';

interface SearchFilters {
  query: string;
  tags: string[];
  notebookId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  mode: 'fulltext' | 'boolean';
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  tags: { id: string; name: string; color: string }[];
  notebooks: { id: string; name: string }[];
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, tags, notebooks }) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [mode, setMode] = useState<'fulltext' | 'boolean'>('fulltext');

  const doSearch = useCallback(() => {
    onSearch({
      query, tags: selectedTags, notebookId,
      dateFrom: dateFrom || null, dateTo: dateTo || null, mode,
    });
  }, [query, selectedTags, notebookId, dateFrom, dateTo, mode, onSearch]);

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: 8, padding: '0 12px' }}>
          <span style={{ color: '#9ca3af' }}>🔍</span>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
            placeholder={mode === 'boolean' ? '布尔搜索: machine AND learning NOT deep' : '搜索笔记...'}
            style={{ flex: 1, border: 'none', background: 'none', padding: '8px', outline: 'none', fontSize: 13 }}
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{
          padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
          background: showFilters ? '#ede9fe' : 'white', cursor: 'pointer', fontSize: 13,
        }}>筛选</button>
        <select value={mode} onChange={e => setMode(e.target.value as any)} style={{
          padding: '8px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: 'white',
        }}>
          <option value="fulltext">全文搜索</option>
          <option value="boolean">布尔搜索</option>
        </select>
      </div>

      {showFilters && (
        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>笔记本</label>
            <select value={notebookId || ''} onChange={e => setNotebookId(e.target.value || null)} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}>
              <option value="">全部</option>
              {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>标签</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {tags.slice(0, 10).map(tag => (
                <button key={tag.id}
                  onClick={() => setSelectedTags(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                  style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                    border: `1px solid ${tag.color}40`,
                    background: selectedTags.includes(tag.id) ? tag.color + '30' : 'white',
                    color: tag.color,
                  }}>{tag.name}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>日期范围</label>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>至</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
            </div>
          </div>
          <button onClick={doSearch} style={{ padding: '6px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, alignSelf: 'flex-end' }}>搜索</button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
