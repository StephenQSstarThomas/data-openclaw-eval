import { definePlugin } from '../plugin-api';

export default definePlugin({
  name: 'word-count',
  version: '1.0.0',
  hooks: {
    afterRender(output: string): string {
      // 统计渲染后输出的字数和阅读时间
      const plainText = output.replace(/\x1B\[[0-9;]*m/g, ''); // 去除 ANSI 颜色
      const chars = plainText.replace(/\s/g, '').length;
      const words = plainText.split(/\s+/).filter(Boolean).length;
      const cjkChars = (plainText.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;

      // 阅读时间：英文 200 wpm，中文 400 cpm
      const readingMinutes = Math.ceil((words - cjkChars) / 200 + cjkChars / 400);

      const stats = `\n─── 统计 ───\n字符: ${chars} | 词数: ${words} | 中文字符: ${cjkChars} | 阅读时间: ~${readingMinutes} 分钟\n`;
      return output + stats;
    },
  },
});
