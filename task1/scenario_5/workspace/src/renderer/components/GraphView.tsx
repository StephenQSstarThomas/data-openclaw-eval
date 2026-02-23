import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  label: string;
  type: 'note' | 'tag';
  group: string;
  size: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'wikilink' | 'tag_link';
}

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const COLOR_SCALE = d3.scaleOrdinal(d3.schemeTableau10);

const GraphView: React.FC<GraphViewProps> = ({ nodes, edges, onNodeClick, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom 行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // 力导向模拟
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(edges).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size * 3 + 10));

    // 边
    const link = g.append('g').selectAll('line')
      .data(edges).join('line')
      .attr('stroke', (d: any) => d.type === 'wikilink' ? '#6366f1' : '#a5b4fc')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1.5);

    // 节点
    const node = g.append('g').selectAll('g')
      .data(nodes).join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d: any) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d: any) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d: any) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    node.append('circle')
      .attr('r', (d) => Math.max(5, d.size * 2))
      .attr('fill', (d) => d.type === 'tag' ? '#f59e0b' : COLOR_SCALE(d.group))
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    node.append('text')
      .text(d => d.label.length > 15 ? d.label.slice(0, 15) + '...' : d.label)
      .attr('x', (d) => d.size * 2 + 6)
      .attr('y', 4)
      .attr('font-size', 12)
      .attr('fill', '#374151');

    node.on('click', (_event, d) => onNodeClick?.(d.id));

    simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges, width, height, onNodeClick]);

  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
      <svg ref={svgRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
};

export default GraphView;
