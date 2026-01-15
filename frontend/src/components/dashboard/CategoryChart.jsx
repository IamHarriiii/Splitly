import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function CategoryChart({ data }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.category))
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']);

    const pie = d3.pie()
      .value(d => parseFloat(d.total_amount || d.total || 0))
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.9);

    const outerArc = d3.arc()
      .innerRadius(radius * 0.95)
      .outerRadius(radius * 0.95);

    // Draw slices
    const arcs = svg.selectAll('arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.category))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('opacity', 0.9)
      .on('mouseover', function() {
        d3.select(this).style('opacity', 1).style('cursor', 'pointer');
      })
      .on('mouseout', function() {
        d3.select(this).style('opacity', 0.9);
      });

    // Add labels
    arcs.append('text')
      .attr('transform', d => {
        const pos = outerArc.centroid(d);
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 1.1 * (midAngle < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .style('text-anchor', d => {
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return midAngle < Math.PI ? 'start' : 'end';
      })
      .style('font-size', '12px')
      .style('fill', '#374151')
      .text(d => d.data.category);

    // Add percentage labels
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .style('font-size', '14px')
      .text(d => `${d.data.percentage?.toFixed(0) || 0}%`);

  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Category Breakdown</h3>
      <div className="flex justify-center">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}
