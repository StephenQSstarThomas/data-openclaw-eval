import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface Commit { hash: string; type: string; scope: string; message: string; }

function getCommitsSinceTag(): Commit[] {
  let range: string;
  try {
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    range = `${lastTag}..HEAD`;
  } catch {
    range = 'HEAD~50..HEAD';
  }

  const log = execSync(`git log ${range} --format="%H|%s" --no-merges`, { encoding: 'utf-8' });
  return log.trim().split('\n').filter(Boolean).map(line => {
    const [hash, ...rest] = line.split('|');
    const subject = rest.join('|');
    const match = subject.match(/^(\w+)(?:\(([^)]+)\))?\s*:\s*(.+)/);
    if (match) {
      return { hash: hash.slice(0, 7), type: match[1], scope: match[2] || '', message: match[3] };
    }
    return { hash: hash.slice(0, 7), type: 'other', scope: '', message: subject };
  });
}

function generateChangelog(): string {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
  const commits = getCommitsSinceTag();
  const date = new Date().toISOString().slice(0, 10);

  const groups: Record<string, Commit[]> = {};
  const labels: Record<string, string> = {
    feat: '✨ 新功能', fix: '🐛 修复', perf: '⚡ 性能', refactor: '♻️ 重构',
    docs: '📝 文档', test: '✅ 测试', chore: '🔧 杂项', ci: '👷 CI',
  };

  for (const commit of commits) {
    const key = labels[commit.type] || '📦 其他';
    (groups[key] ||= []).push(commit);
  }

  let md = `## v${pkg.version} (${date})\n\n`;
  for (const [label, items] of Object.entries(groups)) {
    md += `### ${label}\n\n`;
    for (const item of items) {
      const scope = item.scope ? `**${item.scope}:** ` : '';
      md += `- ${scope}${item.message} (\`${item.hash}\`)\n`;
    }
    md += '\n';
  }

  // 追加到 CHANGELOG.md
  const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');
  const existing = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf-8') : '# Changelog\n\n';
  const insertPoint = existing.indexOf('\n\n') + 2;
  const updated = existing.slice(0, insertPoint) + md + existing.slice(insertPoint);
  fs.writeFileSync(changelogPath, updated, 'utf-8');

  console.log(`Changelog 已更新: ${Object.values(groups).flat().length} 个提交`);
  return md;
}

generateChangelog();
