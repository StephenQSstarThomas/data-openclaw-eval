/**
 * 笔记链接解析器
 * 解析 [[wiki-links]] 和 #tags 语法
 */

export interface ParsedLink {
  type: 'wikilink' | 'tag';
  raw: string;           // 原始文本 [[xxx]] 或 #xxx
  target: string;        // 链接目标（笔记标题或标签名）
  displayText?: string;  // [[target|display]] 中的 display
  position: { start: number; end: number };
}

// [[链接目标]] 或 [[链接目标|显示文本]]
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
// #标签名（支持中文、字母、数字、连字符、下划线）
const TAG_RE = /(?:^|\s)#([\w\u4e00-\u9fff\u3400-\u4dbf-]+)/g;

export function parseLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];

  // 解析 wiki links
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(content)) !== null) {
    links.push({
      type: 'wikilink',
      raw: match[0],
      target: match[1].trim(),
      displayText: match[2]?.trim(),
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  // 解析 #tags
  while ((match = TAG_RE.exec(content)) !== null) {
    const offset = match[0].startsWith(' ') || match[0].startsWith('\n') ? 1 : 0;
    links.push({
      type: 'tag',
      raw: `#${match[1]}`,
      target: match[1],
      position: { start: match.index + offset, end: match.index + match[0].length },
    });
  }

  return links.sort((a, b) => a.position.start - b.position.start);
}

export function extractWikiLinks(content: string): string[] {
  return parseLinks(content)
    .filter(l => l.type === 'wikilink')
    .map(l => l.target);
}

export function extractTags(content: string): string[] {
  return [...new Set(
    parseLinks(content)
      .filter(l => l.type === 'tag')
      .map(l => l.target)
  )];
}
