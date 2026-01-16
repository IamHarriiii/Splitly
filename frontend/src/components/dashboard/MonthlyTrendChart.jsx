import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { X, TrendingUp, Calendar, DollarSign, Tag } from 'lucide-react';

export default function MonthlyTrendChart({ data }) {
  const svgRef = useRef();
    const containerRef = useRef();
    const [timeFrame, setTimeFrame] = useState('months');
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [chartData, setChartData] = useState([]);

    // Transform data based on time frame
  useEffect(() => {
      if (!data || data.length === 0) {
          setChartData([]);
          return;
      }

      let transformedData = [];

      if (timeFrame === 'months') {
          // Use data as-is (monthly)
          transformedData = data.map(d => ({
              period: d.month,
              label: formatMonthLabel(d.month),
              total: parseFloat(d.total_amount || 0),
              count: d.expense_count || 0,
              categories: d.categories || []
          }));
      } else if (timeFrame === 'weeks') {
          // Simulate weekly data by splitting monthly data
          transformedData = simulateWeeklyData(data);
      } else if (timeFrame === 'days') {
          // Simulate daily data from monthly
          transformedData = simulateDailyData(data);
      }

      setChartData(transformedData);
  }, [data, timeFrame]);

    // Format month label (e.g., "2026-01" -> "Jan 2026")
    const formatMonthLabel = (monthStr) => {
        if (!monthStr) return '';
        const [year, month] = monthStr.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Simulate weekly data from monthly data
    const simulateWeeklyData = (monthlyData) => {
        const weeks = [];
        monthlyData.slice(-3).forEach((month, idx) => {
            for (let w = 1; w <= 4; w++) {
                weeks.push({
                    period: `${month.month}-W${w}`,
                    label: `Week ${w}, ${formatMonthLabel(month.month)}`,
                    total: parseFloat(month.total_amount || 0) / 4,
                    count: Math.ceil((month.expense_count || 0) / 4),
                    categories: month.categories || []
                });
            }
        });
        return weeks.slice(-8);
    };

    // Simulate daily data from monthly data
    const simulateDailyData = (monthlyData) => {
        const days = [];
        const latestMonth = monthlyData[monthlyData.length - 1];
        if (!latestMonth) return [];

        const avgDaily = parseFloat(latestMonth.total_amount || 0) / 30;
        const today = new Date();

        for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const variation = 0.5 + Math.random();
            days.push({
                period: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                total: avgDaily * variation,
                count: Math.max(1, Math.floor(Math.random() * 5)),
                categories: latestMonth.categories || []
            });
        }
        return days;
    };

    // Draw chart with D3
    useEffect(() => {
        if (!chartData || chartData.length === 0) return;

        const container = containerRef.current;
        const containerWidth = container?.clientWidth || 500;

    d3.select(svgRef.current).selectAll('*').remove();

      const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = containerWidth - margin.left - margin.right;
      const height = 280 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
      const x = d3.scaleBand()
          .domain(chartData.map(d => d.label))
          .range([0, width])
          .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.total) * 1.1])
        .nice()
      .range([height, 0]);

      // X-axis
      svg.append('g')
          .attr('transform', `translate(0,${height})`)
          .call(d3.axisBottom(x))
          .selectAll('text')
          .style('text-anchor', 'end')
          .attr('dx', '-.8em')
          .attr('dy', '.15em')
          .attr('transform', 'rotate(-45)')
          .style('font-size', '11px')
          .style('fill', '#64748b');

      // Y-axis
      svg.append('g')
          .call(d3.axisLeft(y).tickFormat(d => `$${d.toLocaleString()}`))
          .selectAll('text')
          .style('font-size', '11px')
          .style('fill', '#64748b');

      // Grid lines
      svg.append('g')
          .attr('class', 'grid')
          .attr('opacity', 0.1)
          .call(d3.axisLeft(y)
              .tickSize(-width)
              .tickFormat('')
          );

      // Create gradient for bars
    const gradient = svg.append('defs')
      .append('linearGradient')
        .attr('id', 'barGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
        .attr('stop-color', '#3b82f6');

    gradient.append('stop')
      .attr('offset', '100%')
        .attr('stop-color', '#1d4ed8');

      // Bars
      svg.selectAll('.bar')
          .data(chartData)
          .enter()
          .append('rect')
          .attr('class', 'bar')
          .attr('x', d => x(d.label))
          .attr('width', x.bandwidth())
          .attr('y', height)
          .attr('height', 0)
          .attr('fill', 'url(#barGradient)')
          .attr('rx', 4)
          .style('cursor', 'pointer')
          .on('mouseover', function (event, d) {
              d3.select(this)
                  .transition()
                  .duration(100)
                  .attr('opacity', 0.8);
          })
          .on('mouseout', function () {
              d3.select(this)
                  .transition()
                  .duration(100)
                  .attr('opacity', 1);
          })
          .on('click', function (event, d) {
              setSelectedPoint(d);
          })
          .transition()
          .duration(800)
          .attr('y', d => y(d.total))
          .attr('height', d => height - y(d.total));

      // Add data points on top of bars
      svg.selectAll('.dot')
          .data(chartData)
      .enter()
      .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.label) + x.bandwidth() / 2)
      .attr('cy', d => y(d.total))
        .attr('r', 0)
        .attr('fill', '#1e40af')
        .style('cursor', 'pointer')
        .on('click', function (event, d) {
            setSelectedPoint(d);
        })
        .transition()
        .delay(800)
        .duration(300)
        .attr('r', 5);

  }, [chartData]);

    // Time frame buttons
    const timeFrameOptions = [
        { id: 'days', label: 'Days' },
        { id: 'weeks', label: 'Weeks' },
        { id: 'months', label: 'Months' }
    ];

    // Calculate total for popup category percentage
    const getCategoryPercentage = (catAmount, total) => {
        if (!total || total === 0) return 0;
        return ((catAmount / total) * 100).toFixed(1);
    };

  return (
      <div className="bg-white rounded-lg shadow-md p-6 relative">
          {/* Header with Time Frame Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-600" />
                  Spending Trend
              </h3>

              {/* Time Frame Tabs */}
              <div className="flex bg-slate-100 rounded-lg p-1">
                  {timeFrameOptions.map(option => (
                      <button
                          key={option.id}
                          onClick={() => setTimeFrame(option.id)}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${timeFrame === option.id
                                  ? 'bg-white text-blue-600 shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                      >
                          {option.label}
                      </button>
                  ))}
              </div>
          </div>

          {/* Chart Container */}
          <div ref={containerRef} className="w-full overflow-x-auto">
              {chartData && chartData.length > 0 ? (
                  <svg ref={svgRef}></svg>
              ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                      <p>No data available for this period</p>
                  </div>
              )}
          </div>

          {/* Popup Modal */}
          {selectedPoint && (
              <div
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={() => setSelectedPoint(null)}
              >
                  <div
                      className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto animate-in fade-in zoom-in-95 duration-200"
                      onClick={e => e.stopPropagation()}
                  >
                      {/* Popup Header */}
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-xl">
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-white">
                                  <Calendar size={20} />
                                  <h4 className="text-lg font-semibold">{selectedPoint.label}</h4>
                              </div>
                              <button
                                  onClick={() => setSelectedPoint(null)}
                                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
                              >
                                  <X size={20} />
                              </button>
                          </div>
                      </div>

                      {/* Popup Content */}
                      <div className="p-4 space-y-4">
                          {/* Total Amount */}
                          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <DollarSign size={20} className="text-blue-600" />
                              </div>
                              <div>
                                  <p className="text-sm text-slate-600">Total Spent</p>
                                  <p className="text-2xl font-bold text-slate-900">
                                      ${selectedPoint.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                              </div>
                          </div>

                          {/* Expense Count */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <span className="text-slate-600">Number of Expenses</span>
                              <span className="font-semibold text-slate-900">{selectedPoint.count}</span>
                          </div>

                          {/* Category Breakdown */}
                          {selectedPoint.categories && selectedPoint.categories.length > 0 && (
                              <div>
                                  <h5 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                                      <Tag size={16} className="text-slate-500" />
                                      Category Breakdown
                                  </h5>
                                  <div className="space-y-2">
                                      {selectedPoint.categories.slice(0, 5).map((cat, idx) => (
                                          <div key={idx} className="flex items-center gap-3">
                                              <div className="flex-1">
                                                  <div className="flex items-center justify-between mb-1">
                                                      <span className="text-sm text-slate-700">{cat.category}</span>
                                                      <span className="text-sm font-medium text-slate-900">
                                                          ${parseFloat(cat.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </span>
                                                  </div>
                                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                      <div
                                                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                                                          style={{ width: `${cat.percentage || getCategoryPercentage(cat.total_amount, selectedPoint.total)}%` }}
                                                      />
                                                  </div>
                                              </div>
                                              <span className="text-xs text-slate-500 w-12 text-right">
                                                  {(cat.percentage || getCategoryPercentage(cat.total_amount, selectedPoint.total)).toString().slice(0, 5)}%
                                              </span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Popup Footer */}
                      <div className="p-4 border-t bg-slate-50 rounded-b-xl">
                          <button
                              onClick={() => setSelectedPoint(null)}
                              className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                          >
                              Close
                          </button>
                      </div>
                  </div>
              </div>
          )}
    </div>
  );
}
