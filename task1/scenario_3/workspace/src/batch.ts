import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { MarkdownCLIConfig } from './types';
import { MarkdownParser } from './parser';
import { TerminalRenderer } from './renderer';

interface BatchResult {
  file: string;
  success: boolean;
  error?: string;
  wordCount?: number;
  lintErrors?: number;
}

export class BatchProcessor {
  private config: MarkdownCLIConfig;
  private parser: MarkdownParser;
  private concurrency: number;

  constructor(config: MarkdownCLIConfig, concurrency: number = 4) {
    this.config = config;
    this.parser = new MarkdownParser(config);
    this.concurrency = concurrency;
  }

  async processGlob(pattern: string, handler: (file: string, content: string) => Promise<string | void>): Promise<BatchResult[]> {
    const files = await glob(pattern, { ignore: this.config.watch.ignorePatterns.map(p => `**/${p}/**`) });
    const mdFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.markdown'));

    console.log(chalk.cyan(`找到 ${mdFiles.length} 个 Markdown 文件\n`));

    const results: BatchResult[] = [];
    // 并发控制
    for (let i = 0; i < mdFiles.length; i += this.concurrency) {
      const batch = mdFiles.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(
        batch.map(file => this.processFile(file, handler))
      );
      results.push(...batchResults);
    }

    // 汇总
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`\n${chalk.green(`✓ ${success}`)} 成功 | ${chalk.red(`✗ ${failed}`)} 失败`);

    return results;
  }

  private async processFile(file: string, handler: (file: string, content: string) => Promise<string | void>): Promise<BatchResult> {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const result = this.parser.parse(content);
      const output = await handler(file, content);

      if (output && typeof output === 'string') {
        fs.writeFileSync(file, output, 'utf-8');
      }

      return {
        file, success: true,
        wordCount: result.metadata.wordCount,
        lintErrors: result.errors.length,
      };
    } catch (err: any) {
      return { file, success: false, error: err.message };
    }
  }
}
