#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from './config';
import { MarkdownCLIConfig } from './types';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('markdown-cli')
  .description('A powerful Markdown processing CLI tool')
  .version(pkg.version)
  .option('-c, --config <path>', '配置文件路径')
  .option('--no-color', '禁用颜色输出')
  .option('-t, --theme <theme>', '主题 (default|monokai|github|dracula)', 'default');

// convert 命令 — 转换 Markdown 文件
program
  .command('convert <file>')
  .description('转换 Markdown 文件到终端输出或指定格式')
  .option('-o, --output <file>', '输出到文件')
  .option('-f, --format <format>', '输出格式 (terminal|html|json)', 'terminal')
  .option('--line-numbers', '显示行号')
  .option('--max-width <n>', '最大宽度', '80')
  .action(async (file: string, opts: any) => {
    const config = loadConfig(program.opts().config);
    const { MarkdownParser } = await import('./parser');
    const { TerminalRenderer } = await import('./renderer');
    const { OutputManager } = await import('./output');
    const { PluginLoader } = await import('./plugins/plugin-loader');

    const content = fs.readFileSync(file, 'utf-8');
    const plugins = new PluginLoader(config);
    await plugins.loadAll();

    const parser = new MarkdownParser(config);
    let result = parser.parse(content);
    result = plugins.runAfterParse(result);

    const renderer = new TerminalRenderer({
      theme: (program.opts().theme || config.theme) as any,
      lineNumbers: opts.lineNumbers || config.lineNumbers,
      maxWidth: parseInt(opts.maxWidth) || config.maxWidth,
      colorEnabled: program.opts().color !== false && config.output.colorEnabled,
    });

    let tokens = plugins.runBeforeRender(result.tokens);
    let output = renderer.render(tokens);
    output = plugins.runAfterRender(output);

    const outputManager = new OutputManager();
    if (opts.output) {
      await outputManager.write({ target: 'file', filePath: opts.output, format: opts.format }, output);
    } else {
      await outputManager.write({ target: 'stdout', format: opts.format }, output);
    }
  });

// format 命令 — 格式化 Markdown 文件
program
  .command('format <files...>')
  .description('格式化 Markdown 文件（原地修改或输出）')
  .option('-w, --write', '原地修改文件')
  .option('--check', '仅检查，不修改')
  .action(async (files: string[], opts: any) => {
    const config = loadConfig(program.opts().config);
    const { MarkdownFormatter } = await import('./formatter');
    const formatter = new MarkdownFormatter(config);

    let hasErrors = false;
    for (const pattern of files) {
      const { glob } = await import('glob');
      const matched = await glob(pattern);
      for (const file of matched) {
        const content = fs.readFileSync(file, 'utf-8');
        const formatted = formatter.format(content);
        if (content !== formatted) {
          if (opts.check) {
            console.log(chalk.yellow(`✗ ${file} — 需要格式化`));
            hasErrors = true;
          } else if (opts.write) {
            fs.writeFileSync(file, formatted, 'utf-8');
            console.log(chalk.green(`✓ ${file} — 已格式化`));
          } else {
            process.stdout.write(formatted);
          }
        } else {
          console.log(chalk.gray(`○ ${file} — 无需修改`));
        }
      }
    }
    if (opts.check && hasErrors) process.exit(1);
  });

// lint 命令 — 检查 Markdown 规范
program
  .command('lint <files...>')
  .description('检查 Markdown 文件规范')
  .action(async (files: string[]) => {
    const config = loadConfig(program.opts().config);
    const { MarkdownParser } = await import('./parser');
    const parser = new MarkdownParser(config);

    let totalErrors = 0;
    for (const file of files) {
      if (!fs.existsSync(file)) { console.error(chalk.red(`文件不存在: ${file}`)); continue; }
      const content = fs.readFileSync(file, 'utf-8');
      const result = parser.parse(content);
      if (result.errors.length > 0) {
        console.log(chalk.underline(file));
        for (const err of result.errors) {
          const icon = err.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
          console.log(`  ${icon} ${err.line}:${err.column} — ${err.message}`);
        }
        totalErrors += result.errors.length;
      }
    }
    console.log(`\n检查完成: ${totalErrors} 个问题`);
    if (totalErrors > 0) process.exit(1);
  });

// watch 命令 — 监听文件变化
program
  .command('watch <file>')
  .description('监听 Markdown 文件变化并实时预览')
  .action(async (file: string) => {
    const config = loadConfig(program.opts().config);
    const { FileWatcher } = await import('./watcher');
    const watcher = new FileWatcher(config);
    watcher.watch(file);
  });

program.parse();
