import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { X, PieChart, DollarSign, Receipt, TrendingUp } from 'lucide-react';

export default function CategoryChart({ data }) {
  const svgRef = useRef();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Define colors array for legend and chart
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
      .range(colors);

    const pie = d3.pie()
      .value(d => parseFloat(d.total_amount || d.total || 0))
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.9);

    const hoverArc = d3.arc()
      .innerRadius(radius * 0.58)
      .outerRadius(radius * 0.95);

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
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc)
          .style('opacity', 1);
      })
      .on('mouseout', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc)
          .style('opacity', 0.9);
      })
      .on('click', function (event, d) {
        // Find the index of this category for color
        const colorIndex = data.findIndex(item => item.category === d.data.category);
        setSelectedCategory({
          ...d.data,
          color: colors[colorIndex % colors.length]
        });
      });

    // Add labels only for larger slices
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
      .style('font-size', '11px')
      .style('fill', '#374151')
      .style('display', d => d.data.percentage >= 5 ? 'block' : 'none')
      .text(d => d.data.category);

    // Add percentage labels inside slices
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .style('font-size', '14px')
      .style('display', d => d.data.percentage >= 5 ? 'block' : 'none')
      .text(d => `${d.data.percentage?.toFixed(0) || 0}%`);

  }, [data]);

  // Calculate average expense for a category
  const getAverageExpense = (totalAmount, expenseCount) => {
    if (!expenseCount || expenseCount === 0) return 0;
    return totalAmount / expenseCount;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
        <PieChart size={20} className="text-blue-600" />
        Category Breakdown
      </h3>
      <div className="flex justify-center">
        <svg ref={svgRef}></svg>
      </div>

      {/* Legend - Now Clickable */}
      {data && data.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {data.map((item, index) => (
            <div
              key={item.category}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors"
              onClick={() => setSelectedCategory({
                ...item,
                color: colors[index % colors.length]
              })}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-sm text-gray-700">
                {item.category} ({item.percentage?.toFixed(0) || 0}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Category Details Popup */}
      {selectedCategory && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCategory(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Popup Header with Category Color */}
            <div
              className="p-4 rounded-t-xl"
              style={{ background: `linear-gradient(135deg, ${selectedCategory.color}, ${selectedCategory.color}dd)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <PieChart size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">{selectedCategory.category}</h4>
                    <p className="text-white/80 text-sm">{selectedCategory.percentage?.toFixed(1) || 0}% of total spending</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Popup Content */}
            <div className="p-4 space-y-4">
              {/* Total Amount */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${selectedCategory.color}20` }}
                >
                  <DollarSign size={24} style={{ color: selectedCategory.color }} />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Spent</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${parseFloat(selectedCategory.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Expense Count */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt size={16} className="text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">Expenses</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{selectedCategory.expense_count || 0}</p>
                </div>

                {/* Average Expense */}
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <span className="text-xs text-emerald-600 font-medium">Average</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">
                    ${getAverageExpense(
                      parseFloat(selectedCategory.total_amount || 0),
                      selectedCategory.expense_count
                    ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Percentage Visual */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Share of Total Spending</span>
                  <span className="text-sm font-semibold" style={{ color: selectedCategory.color }}>
                    {selectedCategory.percentage?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${selectedCategory.percentage || 0}%`,
                      backgroundColor: selectedCategory.color
                    }}
                  />
                </div>
              </div>

              {/* Tip/Insight */}
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <p className="text-sm text-slate-600">
                  💡 <span className="font-medium">Insight:</span> {
                    selectedCategory.percentage > 50
                      ? `${selectedCategory.category} is your largest spending category. Consider reviewing these expenses.`
                      : selectedCategory.percentage > 20
                        ? `${selectedCategory.category} is a significant part of your budget.`
                        : `${selectedCategory.category} represents a small portion of your total spending.`
                  }
                </p>
              </div>
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setSelectedCategory(null)}
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
