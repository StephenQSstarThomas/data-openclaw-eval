import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { OutputOptions } from './types';

export class OutputManager {
  async write(options: OutputOptions, content: string): Promise<void> {
    switch (options.target) {
      case 'stdout':
        process.stdout.write(content);
        break;
      case 'file':
        if (!options.filePath) throw new Error('filePath is required for file output');
        fs.mkdirSync(path.dirname(options.filePath), { recursive: true });
        fs.writeFileSync(options.filePath, content, 'utf-8');
        console.log(`已写入: ${options.filePath}`);
        break;
      case 'clipboard':
        await this.copyToClipboard(content);
        console.log('已复制到剪贴板');
        break;
    }
  }

  private copyToClipboard(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = process.platform === 'darwin' ? 'pbcopy'
        : process.platform === 'win32' ? 'clip'
        : 'xclip -selection clipboard';

      const child = exec(cmd, (err) => {
        if (err) reject(err);
        else resolve();
      });
      child.stdin?.write(text);
      child.stdin?.end();
    });
  }
}
