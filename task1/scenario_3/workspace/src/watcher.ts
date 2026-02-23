import chokidar, { FSWatcher } from 'chokidar';
import fs from 'fs';
import chalk from 'chalk';
import { MarkdownCLIConfig } from './types';
import { MarkdownParser } from './parser';
import { TerminalRenderer } from './renderer';

export class FileWatcher {
  private config: MarkdownCLIConfig;
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private parser: MarkdownParser;
  private renderer: TerminalRenderer;

  constructor(config: MarkdownCLIConfig) {
    this.config = config;
    this.parser = new MarkdownParser(config);
    this.renderer = new TerminalRenderer({
      theme: config.theme,
      lineNumbers: config.lineNumbers,
      maxWidth: config.maxWidth,
      colorEnabled: config.output.colorEnabled,
    });
  }

  watch(filePath: string): void {
    console.log(chalk.cyan(`\n👀 监听中: ${filePath}`));
    console.log(chalk.dim('  按 Ctrl+C 停止\n'));

    // 首次渲染
    this.render(filePath);

    this.watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100 },
    });

    this.watcher.on('change', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        console.clear();
        console.log(chalk.cyan(`\n🔄 文件变化: ${filePath} — ${new Date().toLocaleTimeString()}\n`));
        this.render(filePath);
      }, this.config.watch.debounce);
    });

    this.watcher.on('error', (err) => {
      console.error(chalk.red(`监听错误: ${err.message}`));
    });

    // 优雅退出
    const cleanup = () => { this.stop(); process.exit(0); };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    console.log(chalk.dim('\n监听已停止'));
  }

  private render(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const result = this.parser.parse(content);
      const output = this.renderer.render(result.tokens);
      console.log(output);
      if (result.errors.length > 0) {
        console.log(chalk.yellow(`\n⚠ ${result.errors.length} 个 lint 警告`));
      }
    } catch (err: any) {
      console.error(chalk.red(`渲染失败: ${err.message}`));
    }
  }
}
