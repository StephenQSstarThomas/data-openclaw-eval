/**
 * 高级搜索引擎
 * 支持布尔查询 (AND / OR / NOT) 和 FTS5 排名
 */

import { Database, NoteRow } from '../database/database';

export interface SearchOptions {
  query: string;
  mode: 'fulltext' | 'boolean';
  notebookId?: string;
  tagIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  notes: NoteRow[];
  total: number;
  query: string;
  took: number; // ms
}

interface BooleanToken {
  type: 'term' | 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN';
  value: string;
}

export class SearchEngine {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  search(options: SearchOptions): SearchResult {
    const start = Date.now();
    let notes: NoteRow[];

    if (options.mode === 'boolean') {
      notes = this.booleanSearch(options);
    } else {
      notes = this.fulltextSearch(options);
    }

    // 应用后置过滤
    notes = this.applyFilters(notes, options);

    const total = notes.length;
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    notes = notes.slice(offset, offset + limit);

    return {
      notes,
      total,
      query: options.query,
      took: Date.now() - start,
    };
  }

  private fulltextSearch(options: SearchOptions): NoteRow[] {
    const conn = this.db.getConnection();
    const sanitized = options.query.replace(/"/g, '""');

    try {
      return conn.prepare(`
        SELECT n.* FROM notes n
        JOIN notes_fts fts ON n.rowid = fts.rowid
        WHERE notes_fts MATCH '"${sanitized}"'
        ORDER BY rank
      `).all() as NoteRow[];
    } catch {
      return conn.prepare(`
        SELECT * FROM notes WHERE title LIKE ? OR content LIKE ?
        ORDER BY updated_at DESC
      `).all(`%${options.query}%`, `%${options.query}%`) as NoteRow[];
    }
  }

  private booleanSearch(options: SearchOptions): NoteRow[] {
    const tokens = this.tokenize(options.query);
    const allNotes = this.db.listNotes();
    return allNotes.filter(note => this.evaluateBoolean(tokens, note));
  }

  private tokenize(query: string): BooleanToken[] {
    const tokens: BooleanToken[] = [];
    const words = query.match(/\(|\)|"[^"]+"|AND|OR|NOT|\S+/gi) || [];

    for (const word of words) {
      if (word === '(') tokens.push({ type: 'LPAREN', value: '(' });
      else if (word === ')') tokens.push({ type: 'RPAREN', value: ')' });
      else if (word.toUpperCase() === 'AND') tokens.push({ type: 'AND', value: 'AND' });
      else if (word.toUpperCase() === 'OR') tokens.push({ type: 'OR', value: 'OR' });
      else if (word.toUpperCase() === 'NOT') tokens.push({ type: 'NOT', value: 'NOT' });
      else tokens.push({ type: 'term', value: word.replace(/^"|"$/g, '') });
    }
    return tokens;
  }

  private evaluateBoolean(tokens: BooleanToken[], note: NoteRow): boolean {
    const text = `${note.title} ${note.content}`.toLowerCase();
    let idx = 0;

    const parseExpression = (): boolean => {
      let result = parseTerm();
      while (idx < tokens.length) {
        if (tokens[idx]?.type === 'OR') { idx++; result = parseTerm() || result; }
        else if (tokens[idx]?.type === 'AND') { idx++; result = parseTerm() && result; }
        else break;
      }
      return result;
    };

    const parseTerm = (): boolean => {
      if (idx >= tokens.length) return true;
      const token = tokens[idx];
      if (token.type === 'NOT') {
        idx++;
        return !parseTerm();
      }
      if (token.type === 'LPAREN') {
        idx++;
        const result = parseExpression();
        if (tokens[idx]?.type === 'RPAREN') idx++;
        return result;
      }
      if (token.type === 'term') {
        idx++;
        return text.includes(token.value.toLowerCase());
      }
      return true;
    };

    return parseExpression();
  }

  private applyFilters(notes: NoteRow[], options: SearchOptions): NoteRow[] {
    let result = notes;
    if (options.notebookId) {
      result = result.filter(n => n.notebook_id === options.notebookId);
    }
    if (options.dateFrom) {
      result = result.filter(n => n.updated_at >= options.dateFrom!);
    }
    if (options.dateTo) {
      result = result.filter(n => n.updated_at <= options.dateTo!);
    }
    return result;
  }
}
