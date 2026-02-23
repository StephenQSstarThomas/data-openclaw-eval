import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(app.getPath('userData'), 'knowledgevault.db');

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  notebook_id: string | null;
  created_at: string;
  updated_at: string;
  is_pinned: number;
  is_archived: number;
  word_count: number;
}

export interface TagRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface NotebookRow {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface LinkRow {
  id: string;
  source_note_id: string;
  target_note_id: string;
  link_text: string;
  created_at: string;
}

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath?: string) {
    this.db = new BetterSqlite3(dbPath || DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
  }

  getConnection(): BetterSqlite3.Database {
    return this.db;
  }

  // ==================== 笔记 ====================

  createNote(data: { title: string; content: string; notebook_id?: string }): NoteRow {
    const id = uuidv4();
    const now = new Date().toISOString();
    const wordCount = data.content.split(/\s+/).filter(Boolean).length;

    const stmt = this.db.prepare(`
      INSERT INTO notes (id, title, content, notebook_id, created_at, updated_at, is_pinned, is_archived, word_count)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
    `);
    stmt.run(id, data.title, data.content, data.notebook_id || null, now, now, wordCount);

    // 更新 FTS 索引
    this.db.prepare(`
      INSERT INTO notes_fts (rowid, title, content)
      SELECT rowid, title, content FROM notes WHERE id = ?
    `).run(id);

    return this.getNote(id)!;
  }

  updateNote(id: string, data: { title?: string; content?: string; notebook_id?: string; is_pinned?: boolean }): NoteRow | null {
    const note = this.getNote(id);
    if (!note) return null;

    const title = data.title ?? note.title;
    const content = data.content ?? note.content;
    const notebookId = data.notebook_id ?? note.notebook_id;
    const isPinned = data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : note.is_pinned;
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE notes SET title=?, content=?, notebook_id=?, is_pinned=?, word_count=?, updated_at=? WHERE id=?
    `).run(title, content, notebookId, isPinned, wordCount, now, id);

    // 更新 FTS
    this.db.prepare(`DELETE FROM notes_fts WHERE rowid = (SELECT rowid FROM notes WHERE id = ?)`).run(id);
    this.db.prepare(`
      INSERT INTO notes_fts (rowid, title, content)
      SELECT rowid, title, content FROM notes WHERE id = ?
    `).run(id);

    return this.getNote(id);
  }

  deleteNote(id: string): boolean {
    const result = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getNote(id: string): NoteRow | null {
    return this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | null;
  }

  listNotes(filter?: { notebook_id?: string; is_archived?: boolean; limit?: number; offset?: number }): NoteRow[] {
    let sql = 'SELECT * FROM notes WHERE 1=1';
    const params: any[] = [];

    if (filter?.notebook_id) {
      sql += ' AND notebook_id = ?';
      params.push(filter.notebook_id);
    }
    if (filter?.is_archived !== undefined) {
      sql += ' AND is_archived = ?';
      params.push(filter.is_archived ? 1 : 0);
    }
    sql += ' ORDER BY is_pinned DESC, updated_at DESC';
    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
      if (filter.offset) {
        sql += ' OFFSET ?';
        params.push(filter.offset);
      }
    }
    return this.db.prepare(sql).all(...params) as NoteRow[];
  }

  // ==================== 全文搜索 ====================

  searchFulltext(query: string): NoteRow[] {
    return this.db.prepare(`
      SELECT n.* FROM notes n
      JOIN notes_fts fts ON n.rowid = fts.rowid
      WHERE notes_fts MATCH ?
      ORDER BY rank
      LIMIT 50
    `).all(query) as NoteRow[];
  }

  // ==================== 标签 ====================

  createTag(name: string, color?: string): TagRow {
    const id = uuidv4();
    this.db.prepare('INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)')
      .run(id, name, color || '#6366f1', new Date().toISOString());
    return this.db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow;
  }

  listTags(): TagRow[] {
    return this.db.prepare('SELECT * FROM tags ORDER BY name').all() as TagRow[];
  }

  addTagToNote(noteId: string, tagId: string): void {
    this.db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(noteId, tagId);
  }

  getNoteTags(noteId: string): TagRow[] {
    return this.db.prepare(`
      SELECT t.* FROM tags t
      JOIN note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = ?
      ORDER BY t.name
    `).all(noteId) as TagRow[];
  }

  // ==================== 笔记本 ====================

  createNotebook(data: { name: string; parent_id?: string; icon?: string }): NotebookRow {
    const id = uuidv4();
    const maxOrder = (this.db.prepare('SELECT MAX(sort_order) as m FROM notebooks').get() as any)?.m || 0;
    this.db.prepare('INSERT INTO notebooks (id, name, parent_id, icon, sort_order, created_at) VALUES (?,?,?,?,?,?)')
      .run(id, data.name, data.parent_id || null, data.icon || '📁', maxOrder + 1, new Date().toISOString());
    return this.db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as NotebookRow;
  }

  listNotebooks(): NotebookRow[] {
    return this.db.prepare('SELECT * FROM notebooks ORDER BY sort_order').all() as NotebookRow[];
  }

  // ==================== 链接 ====================

  createLink(sourceId: string, targetId: string, linkText: string): void {
    const id = uuidv4();
    this.db.prepare('INSERT OR IGNORE INTO links (id, source_note_id, target_note_id, link_text, created_at) VALUES (?,?,?,?,?)')
      .run(id, sourceId, targetId, linkText, new Date().toISOString());
  }

  getNoteLinks(noteId: string): { outgoing: LinkRow[]; incoming: LinkRow[] } {
    const outgoing = this.db.prepare('SELECT * FROM links WHERE source_note_id = ?').all(noteId) as LinkRow[];
    const incoming = this.db.prepare('SELECT * FROM links WHERE target_note_id = ?').all(noteId) as LinkRow[];
    return { outgoing, incoming };
  }

  close(): void {
    this.db.close();
  }
}
