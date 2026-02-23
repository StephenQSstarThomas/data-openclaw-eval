import BetterSqlite3 from 'better-sqlite3';

interface Migration {
  version: number;
  name: string;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      -- 笔记本表
      CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES notebooks(id) ON DELETE SET NULL,
        icon TEXT DEFAULT '📁',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      -- 笔记表
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        notebook_id TEXT REFERENCES notebooks(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_pinned INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0
      );

      -- FTS5 全文搜索虚拟表
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        content,
        tokenize='unicode61'
      );

      -- 标签表
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#6366f1',
        created_at TEXT NOT NULL
      );

      -- 笔记-标签关联表
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (note_id, tag_id)
      );

      -- 笔记间链接表
      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        source_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        target_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        link_text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        UNIQUE(source_note_id, target_note_id)
      );

      -- 索引
      CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);
      CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned DESC, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
      CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_note_id);
      CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_note_id);
      CREATE INDEX IF NOT EXISTS idx_notebooks_parent ON notebooks(parent_id);

      -- 迁移记录表
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `
  }
];

export function runMigrations(db: BetterSqlite3.Database): void {
  // 确保迁移表存在
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL
  )`);

  const applied = db.prepare('SELECT version FROM _migrations ORDER BY version').all() as { version: number }[];
  const appliedVersions = new Set(applied.map(m => m.version));

  const pending = MIGRATIONS.filter(m => !appliedVersions.has(m.version));
  if (pending.length === 0) return;

  const applyMigration = db.transaction((migration: Migration) => {
    db.exec(migration.up);
    db.prepare('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)')
      .run(migration.version, migration.name, new Date().toISOString());
  });

  for (const migration of pending) {
    console.log(`[migrate] Applying migration ${migration.version}: ${migration.name}`);
    applyMigration(migration);
  }
  console.log(`[migrate] ${pending.length} migration(s) applied`);
}
