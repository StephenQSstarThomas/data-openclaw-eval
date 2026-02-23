import { TerminalRenderer } from '../src/renderer';
import { Token } from '../src/types';

const renderer = new TerminalRenderer({
  theme: 'default', lineNumbers: false, maxWidth: 80, colorEnabled: false,
});

describe('TerminalRenderer', () => {
  test('渲染标题', () => {
    const tokens: Token[] = [{ type: 'heading', raw: '# Hello', text: 'Hello', depth: 1 }];
    const output = renderer.render(tokens);
    expect(output).toContain('Hello');
    expect(output).toContain('#');
  });

  test('渲染代码块带语言标识', () => {
    const tokens: Token[] = [{ type: 'code', raw: '