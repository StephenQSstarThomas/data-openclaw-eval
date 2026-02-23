import { MarkdownParser } from '../src/parser';
import { DEFAULT_CONFIG } from '../src/config';

const parser = new MarkdownParser(DEFAULT_CONFIG);

describe('MarkdownParser', () => {
  test('解析标题层级', () => {
    const result = parser.parse('# H1\n## H2\n### H3');
    const headings = result.metadata.headings;
    expect(headings).toHaveLength(3);
    expect(headings[0]).toEqual({ depth: 1, text: 'H1' });
    expect(headings[1]).toEqual({ depth: 2, text: 'H2' });
    expect(headings[2]).toEqual({ depth: 3, text: 'H3' });
  });

  test('提取文档标题', () => {
    const result = parser.parse('# My Document\n\nSome content.');
    expect(result.metadata.title).toBe('My Document');
  });

  test('无标题文档返回 null', () => {
    const result = parser.parse('Just a paragraph.');
    expect(result.metadata.title).toBeNull();
  });

  test('统计字数', () => {
    const result = parser.parse('Hello world foo bar baz');
    expect(result.metadata.wordCount).toBe(5);
  });

  test('解析代码块及语言标识', () => {
    const result = parser.parse('