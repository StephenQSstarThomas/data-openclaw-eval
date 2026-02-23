/**
 * 导出管理器
 * 支持 Markdown / HTML / PDF 三种格式
 */

import { Database, NoteRow } from '../database/database';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';

export type ExportFormat = 'markdown' | 'html' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  noteIds: string[];
  outputDir: string;
  includeMetadata?: boolean;
  includeLinks?: boolean;
}

export class ExportManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async exportNotes(options: ExportOptions): Promise<string[]> {
    const exportedFiles: string[] = [];
    fs.mkdirSync(options.outputDir, { recursive: true });

    for (const noteId of options.noteIds) {
      const note = this.db.getNote(noteId);
      if (!note) continue;

      const tags = this.db.getNoteTags(noteId);
      let filePath: string;

      switch (options.format) {
        case 'markdown':
          filePath = await this.exportMarkdown(note, tags, options);
          break;
        case 'html':
          filePath = await this.exportHTML(note, tags, options);
          break;
        case 'pdf':
          filePath = await this.exportPDF(note, tags, options);
          break;
      }
      exportedFiles.push(filePath);
    }
    return exportedFiles;
  }

  private async exportMarkdown(note: NoteRow, tags: any[], options: ExportOptions): Promise<string> {
    let content = '';
    if (options.includeMetadata) {
      content += `---\ntitle: "${note.title}"\ntags: [${tags.map(t => t.name).join(', ')}]\ncreated: ${note.created_at}\nupdated: ${note.updated_at}\n---\n\n`;
    }
    content += `# ${note.title}\n\n${note.content}`;

    const filename = this.sanitizeFilename(note.title) + '.md';
    const filePath = path.join(options.outputDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  private async exportHTML(note: NoteRow, tags: any[], options: ExportOptions): Promise<string> {
    const htmlContent = marked(note.content);
    const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>${note.title}</title>
<style>body{max-width:800px;margin:0 auto;padding:20px;font-family:system-ui;color:#333;line-height:1.6}
h1{border-bottom:2px solid #6366f1;padding-bottom:8px}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}
pre{background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:8px;overflow-x:auto}
.meta{color:#6b7280;font-size:14px;margin-bottom:16px}.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;margin-right:4px}</style>
</head><body>
<h1>${note.title}</h1>
<div class="meta">创建于 ${note.created_at} | 更新于 ${note.updated_at} | ${note.word_count} 字</div>
<div class="tags">${tags.map(t => `<span class="tag" style="background:${t.color}20;color:${t.color}">${t.name}</span>`).join('')}</div>
${htmlContent}
</body></html>`;

    const filename = this.sanitizeFilename(note.title) + '.html';
    const filePath = path.join(options.outputDir, filename);
    fs.writeFileSync(filePath, html, 'utf-8');
    return filePath;
  }

  private async exportPDF(note: NoteRow, tags: any[], options: ExportOptions): Promise<string> {
    // 先生成 HTML，然后用 Electron 的 printToPDF
    const htmlPath = await this.exportHTML(note, tags, { ...options, format: 'html' });
    const { BrowserWindow } = require('electron');
    const win = new BrowserWindow({ show: false, width: 800, height: 600 });
    await win.loadFile(htmlPath);
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true, pageSize: 'A4', margins: { top: 20, bottom: 20, left: 20, right: 20 },
    });
    win.destroy();
    const pdfPath = htmlPath.replace('.html', '.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    fs.unlinkSync(htmlPath); // 清理临时 HTML
    return pdfPath;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100);
  }
}
