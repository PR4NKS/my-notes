import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Maximize2, RotateCcw, Settings2 } from 'lucide-react';

export default function GraphView({ networkData, currentNoteId, onSelectNote }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!networkData || !networkData.nodes || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 280;
    const height = 240;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.4, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Deep copy data for D3 mutation
    const nodes = networkData.nodes.map(d => ({ ...d }));
    const links = networkData.links.map(d => ({ ...d }));

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(45).strength(0.7))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(18));

    // Draw links
    const link = g.append('g')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.2)
      .selectAll('line')
      .data(links)
      .join('line');

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Circle styling
    node.append('circle')
      .attr('r', d => (d.id === currentNoteId ? 8.5 : 5.5))
      .attr('fill', d => {
        if (d.id === currentNoteId) return '#881337'; // Active note maroon
        if (d.status === 'draft') return '#d97706';
        return '#0284c7'; // Cyan/slate
      })
      .attr('stroke', d => (d.id === currentNoteId ? '#fda4af' : '#ffffff'))
      .attr('stroke-width', d => (d.id === currentNoteId ? 2.5 : 1.2))
      .attr('class', 'transition-all duration-200 hover:scale-125');

    // Small label for active or main note
    node.append('text')
      .text(d => (d.title.length > 12 ? d.title.slice(0, 11) + '..' : d.title))
      .attr('x', 9)
      .attr('y', 3.5)
      .attr('font-size', '9.5px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#475569')
      .attr('opacity', d => (d.id === currentNoteId ? 1 : 0.75));

    // Hover tooltip
    node
      .on('mouseenter', (event, d) => {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 28,
        });
        setHoveredNode(d);
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
      })
      .on('click', (event, d) => {
        if (onSelectNote) {
          onSelectNote(d.id || d.slug);
        }
      });

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [networkData, currentNoteId, onSelectNote]);

  const handleResetZoom = () => {
    if (!svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth || 280;
    const height = 240;
    svg.transition().duration(400).call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(0, 0).scale(1)
    );
  };

  return (
    <div className="relative flex flex-col rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/40 p-2.5 shadow-sm">
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-300/60 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span className="tracking-wide">Graph View</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetZoom}
            title="Reset View"
            className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            title="Settings"
            className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full h-[240px] overflow-hidden rounded bg-slate-200/80 dark:bg-slate-900/60 border border-slate-300/50 dark:border-slate-800">
        {networkData?.nodes?.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-400">
            No notes or relationships yet
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full block" />
        )}

        {hoveredNode && (
          <div
            className="absolute pointer-events-none px-2 py-1 rounded bg-slate-900 text-white text-[11px] font-medium shadow-md -translate-x-1/2 z-20 whitespace-nowrap border border-slate-700"
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            {hoveredNode.title}
          </div>
        )}
      </div>
    </div>
  );
}
