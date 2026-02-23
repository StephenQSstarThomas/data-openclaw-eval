import fs from 'fs';
import path from 'path';
import { MarkdownCLIConfig } from './types';

const CONFIG_FILES = [
  '.markdownclirc',
  '.markdownclirc.json',
  'markdowncli.config.js',
];

const DEFAULT_CONFIG: MarkdownCLIConfig = {
  theme: 'default',
  lineNumbers: false,
  wordWrap: true,
  maxWidth: 80,
  tabSize: 2,
  plugins: [],
  output: {
    format: 'terminal',
    colorEnabled: true,
  },
  watch: {
    debounce: 300,
    ignorePatterns: ['node_modules', '.git', 'dist'],
  },
  lint: {
    rules: {
      'no-trailing-spaces': 'warn',
      'no-multiple-blanks': 'warn',
      'heading-increment': 'error',
      'no-duplicate-heading': 'off',
    },
  },
};

export function loadConfig(configPath?: string): MarkdownCLIConfig {
  // 1. 如果指定了路径，直接加载
  if (configPath) {
    return mergeConfig(loadFile(configPath));
  }

  // 2. 查找配置文件（从当前目录向上搜索）
  let dir = process.cwd();
  while (true) {
    for (const filename of CONFIG_FILES) {
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) {
        return mergeConfig(loadFile(filePath));
      }
    }

    // 3. 检查 package.json 中的 "markdowncli" 字段
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.markdowncli) {
          return mergeConfig(pkg.markdowncli);
        }
      } catch {}
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return DEFAULT_CONFIG;
}

function loadFile(filePath: string): Partial<MarkdownCLIConfig> {
  const ext = path.extname(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');

  if (ext === '.js') {
    return require(filePath);
  }
  return JSON.parse(content);
}

function mergeConfig(partial: Partial<MarkdownCLIConfig>): MarkdownCLIConfig {
  return {
    ...DEFAULT_CONFIG,
    ...partial,
    output: { ...DEFAULT_CONFIG.output, ...partial.output },
    watch: { ...DEFAULT_CONFIG.watch, ...partial.watch },
    lint: {
      rules: { ...DEFAULT_CONFIG.lint.rules, ...partial.lint?.rules },
    },
  };
}

export { DEFAULT_CONFIG };
