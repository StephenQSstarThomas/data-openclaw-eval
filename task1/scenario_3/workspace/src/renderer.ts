import chalk from 'chalk';
import { Token, RenderOptions } from './types';

// 主题颜色方案
const THEMES: Record<string, ThemeColors> = {
  default: {
    heading: chalk.bold.cyan,
    code: chalk.green,
    codeBlock: chalk.gray,
    codeBorder: chalk.dim,
    link: chalk.underline.blue,
    emphasis: chalk.italic,
    strong: chalk.bold,
    blockquote: chalk.dim.italic,
    listBullet: chalk.yellow,
    hr: chalk.dim,
    table: chalk.white,
    tableHeader: chalk.bold.white,
    tableBorder: chalk.dim,
    alert: { NOTE: chalk.blue, WARNING: chalk.yellow, TIP: chalk.green, IMPORTANT: chalk.magenta, CAUTION: chalk.red },
    taskDone: chalk.green.strikethrough,
    taskPending: chalk.white,
    footnote: chalk.dim,
  },
  monokai: {
    heading: chalk.bold.hex('#F92672'),
    code: chalk.hex('#A6E22E'),
    codeBlock: chalk.hex('#75715E'),
    codeBorder: chalk.hex('#49483E'),
    link: chalk.underline.hex('#66D9EF'),
    emphasis: chalk.italic.hex('#E6DB74'),
    strong: chalk.bold.hex('#F8F8F2'),
    blockquote: chalk.hex('#75715E'),
    listBullet: chalk.hex('#FD971F'),
    hr: chalk.hex('#49483E'),
    table: chalk.hex('#F8F8F2'),
    tableHeader: chalk.bold.hex('#A6E22E'),
    tableBorder: chalk.hex('#49483E'),
    alert: { NOTE: chalk.hex('#66D9EF'), WARNING: chalk.hex('#E6DB74'), TIP: chalk.hex('#A6E22E'), IMPORTANT: chalk.hex('#AE81FF'), CAUTION: chalk.hex('#F92672') },
    taskDone: chalk.hex('#A6E22E').strikethrough,
    taskPending: chalk.hex('#F8F8F2'),
    footnote: chalk.hex('#75715E'),
  },
  github: {
    heading: chalk.bold.hex('#0969DA'),
    code: chalk.hex('#CF222E'),
    codeBlock: chalk.hex('#24292F'),
    codeBorder: chalk.hex('#D0D7DE'),
    link: chalk.underline.hex('#0969DA'),
    emphasis: chalk.italic,
    strong: chalk.bold,
    blockquote: chalk.hex('#656D76'),
    listBullet: chalk.hex('#0969DA'),
    hr: chalk.hex('#D0D7DE'),
    table: chalk.hex('#24292F'),
    tableHeader: chalk.bold,
    tableBorder: chalk.hex('#D0D7DE'),
    alert: { NOTE: chalk.hex('#0969DA'), WARNING: chalk.hex('#9A6700'), TIP: chalk.hex('#1A7F37'), IMPORTANT: chalk.hex('#8250DF'), CAUTION: chalk.hex('#CF222E') },
    taskDone: chalk.hex('#1A7F37').strikethrough,
    taskPending: chalk.hex('#24292F'),
    footnote: chalk.hex('#656D76'),
  },
  dracula: {
    heading: chalk.bold.hex('#BD93F9'),
    code: chalk.hex('#50FA7B'),
    codeBlock: chalk.hex('#6272A4'),
    codeBorder: chalk.hex('#44475A'),
    link: chalk.underline.hex('#8BE9FD'),
    emphasis: chalk.italic.hex('#F1FA8C'),
    strong: chalk.bold.hex('#F8F8F2'),
    blockquote: chalk.hex('#6272A4'),
    listBullet: chalk.hex('#FFB86C'),
    hr: chalk.hex('#44475A'),
    table: chalk.hex('#F8F8F2'),
    tableHeader: chalk.bold.hex('#BD93F9'),
    tableBorder: chalk.hex('#44475A'),
    alert: { NOTE: chalk.hex('#8BE9FD'), WARNING: chalk.hex('#F1FA8C'), TIP: chalk.hex('#50FA7B'), IMPORTANT: chalk.hex('#BD93F9'), CAUTION: chalk.hex('#FF5555') },
    taskDone: chalk.hex('#50FA7B').strikethrough,
    taskPending: chalk.hex('#F8F8F2'),
    footnote: chalk.hex('#6272A4'),
  },
};

interface ThemeColors {
  heading: chalk.Chalk; code: chalk.Chalk; codeBlock: chalk.Chalk; codeBorder: chalk.Chalk;
  link: chalk.Chalk; emphasis: chalk.Chalk; strong: chalk.Chalk; blockquote: chalk.Chalk;
  listBullet: chalk.Chalk; hr: chalk.Chalk; table: chalk.Chalk; tableHeader: chalk.Chalk;
  tableBorder: chalk.Chalk; alert: Record<string, chalk.Chalk>; taskDone: chalk.Chalk;
  taskPending: chalk.Chalk; footnote: chalk.Chalk;
}

export class TerminalRenderer {
  private options: RenderOptions;
  private colors: ThemeColors;
  private lineNumber: number = 0;

  constructor(options: RenderOptions) {
    this.options = options;
    this.colors = THEMES[options.theme] || THEMES.default;
  }

  render(tokens: Token[]): string {
    this.lineNumber = 0;
    return tokens.map(t => this.renderToken(t)).join('\n');
  }

  private renderToken(token: Token): string {
    switch (token.type) {
      case 'heading': return this.renderHeading(token);
      case 'paragraph': return this.wrap(token.text || '') + '\n';
      case 'code': return this.renderCodeBlock(token);
      case 'blockquote': return this.renderBlockquote(token);
      case 'list': return this.renderList(token);
      case 'table': return this.renderTable(token);
      case 'hr': return this.colors.hr('─'.repeat(this.options.maxWidth)) + '\n';
      case 'task_list_item': return this.renderTaskItem(token);
      case 'alert': return this.renderAlert(token);
      case 'footnote': return this.colors.footnote(`[^${(token as any).id}]: ${token.text}`) + '\n';
      case 'space': return '\n';
      default: return token.raw || '';
    }
  }

  private renderHeading(token: Token): string {
    const prefix = '#'.repeat(token.depth || 1) + ' ';
    const sizes = ['', '═══ ', '─── ', '── ', '─ ', '· ', '· '];
    return '\n' + this.colors.heading(sizes[token.depth || 1] + prefix + (token.text || '')) + '\n';
  }

  private renderCodeBlock(token: Token): string {
    const border = this.colors.codeBorder;
    const lang = token.lang ? ` ${token.lang} ` : '';
    const top = border(`┌──${lang}${'─'.repeat(Math.max(0, this.options.maxWidth - lang.length - 4))}┐`);
    const bottom = border(`└${'─'.repeat(this.options.maxWidth - 2)}┘`);
    const lines = (token.text || '').split('\n').map((line, i) => {
      const num = this.options.lineNumbers ? chalk.dim(`${(i + 1).toString().padStart(3)} │ `) : border('│ ');
      return num + this.colors.codeBlock(line);
    });
    return [top, ...lines, bottom].join('\n') + '\n';
  }

  private renderBlockquote(token: Token): string {
    const text = token.text || '';
    return text.split('\n').map(line =>
      this.colors.blockquote('│ ' + line)
    ).join('\n') + '\n';
  }

  private renderList(token: Token): string {
    return (token.items || []).map((item, i) => {
      const bullet = this.colors.listBullet(token.raw.match(/^\d/) ? `${i + 1}. ` : '• ');
      return `  ${bullet}${item.text || ''}`;
    }).join('\n') + '\n';
  }

  private renderTable(token: Token): string {
    if (!token.rows || token.rows.length === 0) return '';
    const rows = token.rows;
    const colWidths = rows[0].map((_, ci) => Math.max(...rows.map(r => (r[ci] || '').length)));
    const border = this.colors.tableBorder;
    const sep = border('├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤');
    const top = border('┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐');
    const bottom = border('└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘');

    const formatRow = (row: string[], isHeader: boolean) => {
      const cells = row.map((cell, i) => {
        const padded = (cell || '').padEnd(colWidths[i]);
        return isHeader ? this.colors.tableHeader(padded) : this.colors.table(padded);
      });
      return border('│') + cells.map(c => ` ${c} `).join(border('│')) + border('│');
    };

    const lines = [top, formatRow(rows[0], true), sep];
    for (let i = 1; i < rows.length; i++) {
      lines.push(formatRow(rows[i], false));
    }
    lines.push(bottom);
    return lines.join('\n') + '\n';
  }

  private renderTaskItem(token: Token): string {
    const icon = token.checked ? chalk.green('✓') : chalk.dim('○');
    const text = token.checked ? this.colors.taskDone(token.text!) : this.colors.taskPending(token.text!);
    return `  ${icon} ${text}`;
  }

  private renderAlert(token: Token): string {
    const alertType = (token as any).alertType || 'NOTE';
    const color = this.colors.alert[alertType] || this.colors.alert.NOTE;
    const icons: Record<string, string> = { NOTE: 'ℹ', WARNING: '⚠', TIP: '💡', IMPORTANT: '❗', CAUTION: '🔥' };
    return `\n${color(`${icons[alertType]} [${alertType}]`)}\n${color(token.text || '')}\n`;
  }

  private wrap(text: string): string {
    if (!this.options || text.length <= this.options.maxWidth) return text;
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > this.options.maxWidth) {
        lines.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines.join('\n');
  }
}
