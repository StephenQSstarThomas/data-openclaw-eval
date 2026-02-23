import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface DocEntry {
  name: string;
  type: 'class' | 'function' | 'interface' | 'type';
  description: string;
  params: { name: string; type: string; description: string }[];
  returns?: { type: string; description: string };
  examples: string[];
  sourceFile: string;
  line: number;
}

const JSDOC_RE = /\/\*\*\s*([\s\S]*?)\s*\*\/\s*(?:export\s+)?(?:(class|function|interface|type)\s+(\w+)|(?:const|let|var)\s+(\w+))/g;
const PARAM_RE = /@param\s+{([^}]+)}\s+(\w+)\s+-?\s*(.*)/;
const RETURNS_RE = /@returns?\s+{([^}]+)}\s*(.*)/;
const EXAMPLE_RE = /@example\s*\n\s*\*?\s*([\s\S]*?)(?=\s*\*\s*@|\s*\*\/)/g;

export function generateDocs(srcDir: string, outputPath: string): void {
  const files = glob.sync(path.join(srcDir, '**/*.ts'), { ignore: ['**/*.test.ts', '**/*.d.ts'] });
  const entries: DocEntry[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relPath = path.relative(srcDir, file);

    let match: RegExpExecArray | null;
    while ((match = JSDOC_RE.exec(content)) !== null) {
      const comment = match[1];
      const type = (match[2] || 'function') as DocEntry['type'];
      const name = match[3] || match[4];
      const line = content.slice(0, match.index).split('\n').length;

      // 提取描述（第一行非 @tag）
      const descLines = comment.split('\n')
        .map(l => l.replace(/^\s*\*\s?/, '').trim())
        .filter(l => l && !l.startsWith('@'));
      const description = descLines.join(' ');

      // 提取参数
      const params: DocEntry['params'] = [];
      for (const line of comment.split('\n')) {
        const pm = line.match(PARAM_RE);
        if (pm) params.push({ type: pm[1], name: pm[2], description: pm[3] });
      }

      // 提取返回值
      const retMatch = comment.match(RETURNS_RE);
      const returns = retMatch ? { type: retMatch[1], description: retMatch[2] } : undefined;

      // 提取示例
      const examples: string[] = [];
      let exMatch;
      while ((exMatch = EXAMPLE_RE.exec(comment)) !== null) {
        examples.push(exMatch[1].replace(/^\s*\*\s?/gm, '').trim());
      }

      entries.push({ name, type, description, params, returns, examples, sourceFile: relPath, line });
    }
  }

  // 生成 Markdown
  let md = '# markdown-cli API 文档\n\n';
  md += `> 自动生成于 ${new Date().toISOString()}\n\n`;

  // 按文件分组
  const byFile = new Map<string, DocEntry[]>();
  for (const entry of entries) {
    const group = byFile.get(entry.sourceFile) || [];
    group.push(entry);
    byFile.set(entry.sourceFile, group);
  }

  for (const [file, fileEntries] of byFile) {
    md += `## ${file}\n\n`;
    for (const entry of fileEntries) {
      md += `### ${entry.type} \`${entry.name}\`\n\n`;
      md += `${entry.description}\n\n`;
      if (entry.params.length > 0) {
        md += '**参数:**\n\n';
        md += '| 参数 | 类型 | 说明 |\n|------|------|------|\n';
        for (const p of entry.params) {
          md += `| \`${p.name}\` | \`${p.type}\` | ${p.description} |\n`;
        }
        md += '\n';
      }
      if (entry.returns) {
        md += `**返回:** \`${entry.returns.type}\` — ${entry.returns.description}\n\n`;
      }
      if (entry.examples.length > 0) {
        md += '**示例:**\n\n';
        for (const ex of entry.examples) {
          md += '