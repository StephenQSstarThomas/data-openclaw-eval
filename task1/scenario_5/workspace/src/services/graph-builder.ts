/**
 * 知识图谱构建器
 * 从笔记和链接数据构建图结构
 */

import { Database, NoteRow, LinkRow } from '../database/database';
import { extractWikiLinks, extractTags } from './link-parser';

export interface GraphNode {
  id: string;
  label: string;
  type: 'note' | 'tag';
  group: string;        // notebook name 或 'tag'
  size: number;         // 连接数决定大小
  wordCount?: number;
  updatedAt?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  type: 'wikilink' | 'tag_link';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;
    clusters: number;
  };
}

export class GraphBuilder {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  buildFullGraph(): GraphData {
    const notes = this.db.listNotes();
    const notebooks = this.db.listNotebooks();
    const notebookMap = new Map(notebooks.map(nb => [nb.id, nb.name]));

    const nodes: Map<string, GraphNode> = new Map();
    const edges: GraphEdge[] = [];
    const degreeCount: Map<string, number> = new Map();

    // 添加笔记节点
    for (const note of notes) {
      nodes.set(note.id, {
        id: note.id,
        label: note.title,
        type: 'note',
        group: note.notebook_id ? (notebookMap.get(note.notebook_id) || '未分类') : '未分类',
        size: 1,
        wordCount: note.word_count,
        updatedAt: note.updated_at,
      });
    }

    // 解析 wiki links 建边
    const titleToId = new Map(notes.map(n => [n.title.toLowerCase(), n.id]));
    for (const note of notes) {
      const wikiLinks = extractWikiLinks(note.content);
      for (const linkTarget of wikiLinks) {
        const targetId = titleToId.get(linkTarget.toLowerCase());
        if (targetId && targetId !== note.id) {
          edges.push({
            source: note.id,
            target: targetId,
            label: linkTarget,
            type: 'wikilink',
          });
          degreeCount.set(note.id, (degreeCount.get(note.id) || 0) + 1);
          degreeCount.set(targetId, (degreeCount.get(targetId) || 0) + 1);
        }
      }

      // 解析 #tags 建立标签节点和边
      const tags = extractTags(note.content);
      for (const tagName of tags) {
        const tagNodeId = `tag:${tagName}`;
        if (!nodes.has(tagNodeId)) {
          nodes.set(tagNodeId, {
            id: tagNodeId,
            label: `#${tagName}`,
            type: 'tag',
            group: 'tag',
            size: 1,
          });
        }
        edges.push({
          source: note.id,
          target: tagNodeId,
          label: tagName,
          type: 'tag_link',
        });
        degreeCount.set(note.id, (degreeCount.get(note.id) || 0) + 1);
        degreeCount.set(tagNodeId, (degreeCount.get(tagNodeId) || 0) + 1);
      }
    }

    // 更新节点大小
    for (const [id, degree] of degreeCount) {
      const node = nodes.get(id);
      if (node) {
        node.size = Math.max(1, Math.log2(degree + 1) * 3);
      }
    }

    const nodeArray = Array.from(nodes.values());
    const totalDegree = Array.from(degreeCount.values()).reduce((a, b) => a + b, 0);

    return {
      nodes: nodeArray,
      edges,
      stats: {
        totalNodes: nodeArray.length,
        totalEdges: edges.length,
        avgDegree: nodeArray.length > 0 ? totalDegree / nodeArray.length : 0,
        clusters: new Set(nodeArray.map(n => n.group)).size,
      },
    };
  }

  getNeighbors(noteId: string, depth: number = 1): GraphData {
    const fullGraph = this.buildFullGraph();
    const visited = new Set<string>([noteId]);
    const queue = [{ id: noteId, d: 0 }];

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d >= depth) continue;

      for (const edge of fullGraph.edges) {
        const neighbor = edge.source === id ? edge.target : edge.target === id ? edge.source : null;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, d: d + 1 });
        }
      }
    }

    const filteredNodes = fullGraph.nodes.filter(n => visited.has(n.id));
    const filteredEdges = fullGraph.edges.filter(e => visited.has(e.source) && visited.has(e.target));

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      stats: {
        totalNodes: filteredNodes.length,
        totalEdges: filteredEdges.length,
        avgDegree: 0,
        clusters: new Set(filteredNodes.map(n => n.group)).size,
      },
    };
  }
}
