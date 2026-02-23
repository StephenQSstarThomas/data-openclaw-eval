import { MarkdownCLIConfig } from './types';

export class MarkdownFormatter {
  private config: MarkdownCLIConfig;

  constructor(config: MarkdownCLIConfig) {
    this.config = config;
  }

  format(content: string): string {
    let result = content;
    result = this.normalizeLineEndings(result);
    result = this.trimTrailingSpaces(result);
    result = this.normalizeBlankLines(result);
    result = this.formatTables(result);
    result = this.formatCodeBlocks(result);
    result = this.normalizeHeadings(result);
    result = this.ensureTrailingNewline(result);
    return result;
  }

  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  private trimTrailingSpaces(content: string): string {
    return content.split('\n').map(line => line.trimEnd()).join('\n');
  }

  private normalizeBlankLines(content: string): string {
    return content.replace(/\n{3,}/g, '\n\n');
  }

  private normalizeHeadings(content: string): string {
    return content.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
  }

  private formatTables(content: string): string {
    const tableRegex = /(\|.+\|)\n(\|[-: |]+\|)\n((?:\|.+\|\n)*)/g;
    return content.replace(tableRegex, (match, header, separator, body) => {
      const headerCells = this.parseCells(header);
      const bodyCells = body.trim().split('\n').map((r: string) => this.parseCells(r));
      const allRows = [headerCells, ...bodyCells];
      const colWidths = headerCells.map((_: string, i: number) =>
        Math.max(...allRows.map(row => (row[i] || '').length))
      );
      const formatRow = (cells: string[]) =>
        '| ' + cells.map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |';
      const sepRow = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';
      return [formatRow(headerCells), sepRow, ...bodyCells.map(formatRow)].join('\n') + '\n';
    });
  }

  private parseCells(row: string): string[] {
    return row.split('|').slice(1, -1).map(c => c.trim());
  }

  private formatCodeBlocks(content: string): string {
    return content.replace(/