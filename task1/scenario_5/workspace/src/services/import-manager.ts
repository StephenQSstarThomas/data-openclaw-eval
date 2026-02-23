/**
 * 导入管理器
 * 支持从 Notion JSON 和 Obsidian vault 导入
 */

import { Database } from '../database/database';
import fs from 'fs';
import path from 'path';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export class ImportManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async importNotion(filePath: string): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const pages = Array.isArray(data) ? data : data.results || [data];

      for (const page of pages) {
        try {
          const title = this.extractNotionTitle(page);
          const content = this.extractNotionContent(page);
          if (!title) { result.skipped++; continue; }
          this.db.createNote({ title, content });
          result.imported++;
        } catch (e: any) {
          result.errors.push(`页面导入失败: ${e.message}`);
        }
      }
    } catch (e: any) {
      result.errors.push(`文件读取失败: ${e.message}`);
    }
    return result;
  }

  async importObsidian(dirPath: string): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
    const mdFiles = this.findMarkdownFiles(dirPath);

    for (const filePath of mdFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const title = path.basename(filePath, '.md');
        // 转换 Obsidian 特有语法
        const converted = this.convertObsidianSyntax(content);
        this.db.createNote({ title, content: converted });
        result.imported++;
      } catch (e: any) {
        result.errors.push(`${filePath}: ${e.message}`);
      }
    }
    return result;
  }

  private extractNotionTitle(page: any): string {
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    return page.title || '';
  }

  private extractNotionContent(page: any): string {
    if (page.markdown) return page.markdown;
    if (page.content) return page.content;
    // 简化处理：将 Notion blocks 转为 markdown
    const blocks = page.children || page.blocks || [];
    return blocks.map((b: any) => {
      if (b.type === 'paragraph') return b.paragraph?.rich_text?.map((t: any) => t.plain_text).join('') || '';
      if (b.type === 'heading_1') return `# ${b.heading_1?.rich_text?.map((t: any) => t.plain_text).join('')}`;
      if (b.type === 'heading_2') return `## ${b.heading_2?.rich_text?.map((t: any) => t.plain_text).join('')}`;
      if (b.type === 'code') return `\`\`\`${b.code?.language || ''}\n${b.code?.rich_text?.map((t: any) => t.plain_text).join('')}\n\`\`\``;
      if (b.type === 'bulleted_list_item') return `- ${b.bulleted_list_item?.rich_text?.map((t: any) => t.plain_text).join('')}`;
      return '';
    }).join('\n\n');
  }

  private convertObsidianSyntax(content: string): string {
    let result = content;
    // Obsidian 的 ![[embed]] -> 我们的 [[link]]
    result = result.replace(/!\[\[([^\]]+)\]\]/g, '[[embedded: $1]]');
    // Obsidian callouts -> blockquote
    result = result.replace(/> \[!(\w+)\]\s*(.*)/g, '> **$1**: $2');
    return result;
  }

  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    return files;
  }
}
