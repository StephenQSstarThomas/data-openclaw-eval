import React from 'react';

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  tags: { id: string; name: string; color: string }[];
  updatedAt: string;
  isPinned: boolean;
  wordCount: number;
  onClick: (id: string) => void;
  onPin: (id: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ id, title, content, tags, updatedAt, isPinned, wordCount, onClick, onPin }) => {
  const preview = content.replace(/[#*`\[\]]/g, '').slice(0, 120);
  const timeAgo = formatTimeAgo(updatedAt);

  return (
    <div
      onClick={() => onClick(id)}
      style={{
        padding: '16px', borderRadius: 8, background: 'white',
        border: '1px solid #e5e7eb', cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.1s',
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {isPinned && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}>📌</span>}
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#111' }}>{title}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {preview}...
      </p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {tags.slice(0, 4).map(tag => (
          <span key={tag.id} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, background: tag.color + '15', color: tag.color }}>{tag.name}</span>
        ))}
        {tags.length > 4 && <span style={{ fontSize: 11, color: '#9ca3af' }}>+{tags.length - 4}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
        <span>{timeAgo}</span>
        <span>{wordCount} 字</span>
      </div>
    </div>
  );
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default NoteCard;
