import React, { useState, useRef, useEffect } from 'react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagAdd: (tag: Tag) => void;
  onTagRemove: (tagId: string) => void;
  onTagCreate: (name: string) => void;
}

const TagSelector: React.FC<TagSelectorProps> = ({ selectedTags, onTagAdd, onTagRemove, onTagCreate }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length === 0) {
      setSuggestions([]);
      return;
    }
    // 搜索已有标签
    window.electronAPI.searchTags(query).then((tags: Tag[]) => {
      const filtered = tags.filter(t => !selectedTags.find(s => s.id === t.id));
      setSuggestions(filtered);
    });
  }, [query, selectedTags]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      const existing = suggestions.find(s => s.name.toLowerCase() === query.toLowerCase());
      if (existing) {
        onTagAdd(existing);
      } else {
        onTagCreate(query.trim());
      }
      setQuery('');
      setShowDropdown(false);
    }
    if (e.key === 'Backspace' && query === '' && selectedTags.length > 0) {
      onTagRemove(selectedTags[selectedTags.length - 1].id);
    }
  };

  return (
    <div className="tag-selector" style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 8px',
        border: '1px solid #d1d5db', borderRadius: 6, minHeight: 36,
        alignItems: 'center', background: 'white',
      }}>
        {selectedTags.map(tag => (
          <span key={tag.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 12, fontSize: 12,
            background: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}40`,
          }}>
            {tag.name}
            <button onClick={() => onTagRemove(tag.id)} style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: tag.color, fontSize: 14, lineHeight: 1, padding: 0,
            }}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={selectedTags.length === 0 ? '添加标签...' : ''}
          style={{ border: 'none', outline: 'none', flex: 1, minWidth: 80, fontSize: 13 }}
        />
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 200, overflow: 'auto',
        }}>
          {suggestions.map(tag => (
            <div key={tag.id}
              onClick={() => { onTagAdd(tag); setQuery(''); setShowDropdown(false); }}
              style={{
                padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: tag.color }} />
              {tag.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
