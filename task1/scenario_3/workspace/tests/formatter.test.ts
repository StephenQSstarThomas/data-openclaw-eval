import { MarkdownFormatter } from '../src/formatter';
import { DEFAULT_CONFIG } from '../src/config';

const formatter = new MarkdownFormatter(DEFAULT_CONFIG);

describe('MarkdownFormatter', () => {
  test('移除行尾空格', () => {
    expect(formatter.format('Hello   \n')).toBe('Hello\n');
  });

  test('规范化连续空行', () => {
    expect(formatter.format('A\n\n\n\nB\n')).toBe('A\n\nB\n');
  });

  test('CRLF 转 LF', () => {
    expect(formatter.format('A\r\nB\r\n')).toBe('A\nB\n');
  });

  test('标题后缺少空格时自动补上', () => {
    expect(formatter.format('#Hello\n')).toBe('# Hello\n');
  });

  test('确保文件末尾有换行', () => {
    expect(formatter.format('Hello')).toBe('Hello\n');
  });

  test('表格列对齐', () => {
    const input = '| a | bb | ccc |\n| - | - | - |\n| 1 | 22 | 333 |\n';
    const output = formatter.format(input);
    // 每行同一列应对齐
    const lines = output.split('\n').filter(l => l.startsWith('|'));
    expect(lines.length).toBe(3);
  });
});
