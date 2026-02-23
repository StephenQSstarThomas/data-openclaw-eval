// 默认配置示例文件生成器
import fs from 'fs';
import { DEFAULT_CONFIG } from '../config';

export function generateExampleConfig(outputPath: string): void {
  const configContent = `// .markdownclirc — markdown-cli 配置文件
// 也可以使用 JSON 格式或在 package.json 的 "markdowncli" 字段中配置
{
  "theme": "${DEFAULT_CONFIG.theme}",
  "lineNumbers": ${DEFAULT_CONFIG.lineNumbers},
  "wordWrap": ${DEFAULT_CONFIG.wordWrap},
  "maxWidth": ${DEFAULT_CONFIG.maxWidth},
  "tabSize": ${DEFAULT_CONFIG.tabSize},
  "plugins": ["toc", "word-count"],
  "output": {
    "format": "${DEFAULT_CONFIG.output.format}",
    "colorEnabled": ${DEFAULT_CONFIG.output.colorEnabled}
  },
  "watch": {
    "debounce": ${DEFAULT_CONFIG.watch.debounce},
    "ignorePatterns": ${JSON.stringify(DEFAULT_CONFIG.watch.ignorePatterns)}
  },
  "lint": {
    "rules": ${JSON.stringify(DEFAULT_CONFIG.lint.rules, null, 6).replace(/\n/g, '\n    ')}
  }
}`;
  fs.writeFileSync(outputPath, configContent, 'utf-8');
  console.log(`示例配置已生成: ${outputPath}`);
}

// 示例插件模板
export function generatePluginTemplate(outputPath: string): void {
  const template = `import { definePlugin } from 'markdown-cli/plugins/plugin-api';

export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    beforeParse(content) {
      // 解析前预处理 Markdown 内容
      return content;
    },
    afterParse(result) {
      // 解析后处理结果
      return result;
    },
    beforeRender(tokens) {
      // 渲染前处理 token 列表
      return tokens;
    },
    afterRender(output) {
      // 渲染后处理最终输出
      return output;
    },
  },
});`;
  fs.writeFileSync(outputPath, template, 'utf-8');
  console.log(`插件模板已生成: ${outputPath}`);
}
