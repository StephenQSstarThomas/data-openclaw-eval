import { definePlugin } from '../plugin-api';
import { ParseResult, Token } from '../../types';

export default definePlugin({
  name: 'toc',
  version: '1.0.0',
  hooks: {
    afterParse(result: ParseResult): ParseResult {
      const headings = result.metadata.headings;
      if (headings.length === 0) return result;

      // 生成目录 tokens
      const tocLines = headings.map(h => {
        const indent = '  '.repeat(Math.max(0, h.depth - 1));
        return `${indent}- ${h.text}`;
      });

      const tocToken: Token = {
        type: 'paragraph',
        raw: tocLines.join('\n'),
        text: '📑 目录\n' + tocLines.join('\n'),
      };

      // 将 TOC 插入到第一个 heading 之后
      const firstHeadingIdx = result.tokens.findIndex(t => t.type === 'heading');
      if (firstHeadingIdx >= 0) {
        result.tokens.splice(firstHeadingIdx + 1, 0, { type: 'hr', raw: '---' }, tocToken, { type: 'hr', raw: '---' });
      }
      return result;
    },
  },
});
