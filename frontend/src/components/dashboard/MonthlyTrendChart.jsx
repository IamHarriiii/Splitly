import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function MonthlyTrendChart({ data }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const containerWidth = svgRef.current.parentElement.clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates and prepare data
    const parseDate = d3.timeParse('%Y-%m');
    const parsedData = data.map(d => ({
      date: parseDate(d.month) || new Date(d.month),
      total: parseFloat(d.total_amount || d.total || 0)
    }));

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(parsedData, d => d.date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(parsedData, d => d.total) * 1.1])
      .range([height, 0]);

    // Line generator
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.total))
      .curve(d3.curveMonotoneX);

    // Add gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'line-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', y(0))
      .attr('x2', 0).attr('y2', y(d3.max(parsedData, d => d.total)));

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.8);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#60a5fa')
      .attr('stop-opacity', 0.3);

    // Draw area
    const area = d3.area()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.total))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(parsedData)
      .attr('fill', 'url(#line-gradient)')
      .attr('d', area)
      .attr('opacity', 0.3);

    // Draw line
    svg.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Add dots
    svg.selectAll('circle')
      .data(parsedData)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.total))
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b %Y')))  // Format as "Jan 2026"
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d}`));

  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Monthly Spending Trend</h3>
      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} className="w-full"></svg>
      </div>
    </div>
  );
}
