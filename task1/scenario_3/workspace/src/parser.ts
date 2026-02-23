import { marked, Tokenizer, TokenizerExtension } from 'marked';
import { ParseResult, Token, DocumentMetadata, ParseError, MarkdownCLIConfig } from './types';

// 自定义扩展：任务列表
const taskListExtension: TokenizerExtension = {
  name: 'task_list_item',
  level: 'block',
  start(src: string) { return src.match(/^- \[[ x]\] /m)?.index; },
  tokenizer(src: string) {
    const match = src.match(/^- \[([ x])\] (.+?)(?:\n|$)/);
    if (match) {
      return { type: 'task_list_item', raw: match[0], checked: match[1] === 'x', text: match[2] };
    }
    return undefined;
  },
};

// 自定义扩展：告警块 (> [!NOTE], > [!WARNING] 等)
const alertExtension: TokenizerExtension = {
  name: 'alert',
  level: 'block',
  start(src: string) { return src.match(/^> \[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]/m)?.index; },
  tokenizer(src: string) {
    const match = src.match(/^> \[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]\s*\n((?:> .*\n?)*)/);
    if (match) {
      const content = match[2].replace(/^> ?/gm, '');
      return { type: 'alert', raw: match[0], alertType: match[1], text: content.trim() };
    }
    return undefined;
  },
};

// 自定义扩展：脚注
const footnoteExtension: TokenizerExtension = {
  name: 'footnote',
  level: 'block',
  start(src: string) { return src.match(/^\[\^[\w-]+\]: /m)?.index; },
  tokenizer(src: string) {
    const match = src.match(/^\[\^([\w-]+)\]: (.+?)(?:\n|$)/);
    if (match) {
      return { type: 'footnote', raw: match[0], id: match[1], text: match[2] };
    }
    return undefined;
  },
};

export class MarkdownParser {
  private config: MarkdownCLIConfig;

  constructor(config: MarkdownCLIConfig) {
    this.config = config;
    marked.use({ extensions: [taskListExtension, alertExtension, footnoteExtension] });
  }

  parse(content: string): ParseResult {
    // 提取 frontmatter
    let body = content;
    let frontmatter: Record<string, unknown> | undefined;
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (fmMatch) {
      body = content.slice(fmMatch[0].length);
      frontmatter = this.parseFrontmatter(fmMatch[1]);
    }

    const rawTokens = marked.lexer(body);
    const tokens = this.convertTokens(rawTokens);
    const metadata = this.extractMetadata(tokens, content, frontmatter);
    const errors = this.lint(content);

    return { tokens, metadata, errors };
  }

  private convertTokens(rawTokens: any[]): Token[] {
    return rawTokens.map(t => ({
      type: t.type as any,
      raw: t.raw,
      text: t.text,
      depth: t.depth,
      lang: t.lang,
      items: t.items ? this.convertTokens(t.items) : undefined,
      rows: t.rows,
      checked: t.checked,
      href: t.href,
    }));
  }

  private extractMetadata(tokens: Token[], content: string, frontmatter?: Record<string, unknown>): DocumentMetadata {
    const lines = content.split('\n');
    const words = content.replace(/[#*`\[\]()]/g, '').split(/\s+/).filter(Boolean);
    const headings = tokens.filter(t => t.type === 'heading').map(t => ({ depth: t.depth!, text: t.text! }));
    const links = tokens.filter(t => t.type === 'link').map(t => ({ href: t.href!, text: t.text! }));
    const images = tokens.filter(t => t.type === 'image').map(t => ({ src: t.href!, alt: t.text! }));
    const codeBlocks = tokens.filter(t => t.type === 'code').map(t => ({ lang: t.lang || 'plain', lines: t.raw.split('\n').length - 2 }));

    return {
      title: headings.find(h => h.depth === 1)?.text || null,
      wordCount: words.length,
      charCount: content.length,
      lineCount: lines.length,
      headings, links, images, codeBlocks, frontmatter,
    };
  }

  private parseFrontmatter(raw: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const line of raw.split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)/);
      if (match) result[match[1]] = match[2].trim();
    }
    return result;
  }

  private lint(content: string): ParseError[] {
    const errors: ParseError[] = [];
    const rules = this.config.lint.rules;
    const lines = content.split('\n');

    lines.forEach((line, i) => {
      if (rules['no-trailing-spaces'] !== 'off' && /\s+$/.test(line)) {
        errors.push({ line: i + 1, column: line.trimEnd().length + 1, message: '行尾有多余空格', severity: rules['no-trailing-spaces'] === 'error' ? 'error' : 'warning' });
      }
    });

    // 连续空行检查
    if (rules['no-multiple-blanks'] !== 'off') {
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].trim() === '' && lines[i + 1]?.trim() === '' && lines[i + 2]?.trim() === '') {
          errors.push({ line: i + 2, column: 1, message: '超过 2 行连续空行', severity: rules['no-multiple-blanks'] === 'error' ? 'error' : 'warning' });
        }
      }
    }

    // 标题级别递增检查
    if (rules['heading-increment'] !== 'off') {
      let lastDepth = 0;
      lines.forEach((line, i) => {
        const hMatch = line.match(/^(#{1,6})\s/);
        if (hMatch) {
          const depth = hMatch[1].length;
          if (lastDepth > 0 && depth > lastDepth + 1) {
            errors.push({ line: i + 1, column: 1, message: `标题级别跳跃: h${lastDepth} -> h${depth}`, severity: rules['heading-increment'] === 'error' ? 'error' : 'warning' });
          }
          lastDepth = depth;
        }
      });
    }

    return errors;
  }
}
