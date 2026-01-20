import { useState, useEffect, useRef } from 'react';
import { BarChart3, PieChart, TrendingUp, Users, DollarSign } from 'lucide-react';
import { getGroupAnalytics } from '../../services/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import * as d3 from 'd3';

export default function GroupAnalytics({ groupId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    if (groupId) {
      fetchAnalytics();
    }
  }, [groupId]);

  useEffect(() => {
    if (analytics?.category_breakdown) {
      drawPieChart();
    }
    if (analytics?.member_contributions) {
      drawBarChart();
    }
  }, [analytics]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getGroupAnalytics(groupId);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch group analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const drawPieChart = () => {
    if (!pieChartRef.current || !analytics?.category_breakdown?.length) return;

    // Clear previous chart
    d3.select(pieChartRef.current).selectAll('*').remove();

    const data = analytics.category_breakdown;
    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2;

    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.category))
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']);

    const pie = d3.pie()
      .value(d => d.amount)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.9);

    const svg = d3.select(pieChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const arcs = svg.selectAll('arc')
      .data(pie(data))
      .enter()
      .append('g');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.category))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('opacity', 0.9);
  };

  const drawBarChart = () => {
    if (!barChartRef.current || !analytics?.member_contributions?.length) return;

    // Clear previous chart
    d3.select(barChartRef.current).selectAll('*').remove();

    const data = analytics.member_contributions;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 300 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select(barChartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.user_name))
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.total_paid)])
      .nice()
      .range([height, 0]);

    // Add bars with gradient
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.user_name))
      .attr('y', d => y(d.total_paid))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.total_paid))
      .attr('fill', '#3b82f6')
      .attr('rx', 4);

    // Add x axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-20)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');

    // Add y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d}`))
      .selectAll('text')
      .style('font-size', '10px');
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={24} className="text-indigo-600" />
            Group Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={24} className="text-indigo-600" />
            Group Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 size={24} className="text-indigo-600" />
          Group Analytics
        </CardTitle>
        <p className="text-sm text-gray-600">Spending breakdown and member contributions</p>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">Total</span>
            </div>
            <p className="text-xl font-bold text-blue-900">
              ${parseFloat(analytics?.total_expenses || 0).toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">Average</span>
            </div>
            <p className="text-xl font-bold text-emerald-900">
              ${parseFloat(analytics?.average_expense || 0).toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-purple-600" />
              <span className="text-xs text-purple-700 font-medium">Top Spender</span>
            </div>
            <p className="text-lg font-bold text-purple-900 truncate">
              {analytics?.most_active_member?.user_name || '-'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <PieChart size={16} className="text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">Expenses</span>
            </div>
            <p className="text-xl font-bold text-amber-900">
              {analytics?.expense_count || 0}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-indigo-600" />
              Category Breakdown
            </h4>
            {analytics?.category_breakdown?.length > 0 ? (
              <div className="flex items-center gap-4">
                <div ref={pieChartRef} className="flex-shrink-0"></div>
                <div className="space-y-2 flex-1">
                  {analytics.category_breakdown.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5] }}
                        ></div>
                        <span className="text-gray-700">{cat.category}</span>
                      </div>
                      <span className="font-medium text-gray-900">${parseFloat(cat.total_amount).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No category data</p>
            )}
          </div>

          {/* Member Contributions */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              Member Contributions
            </h4>
            {analytics?.member_contributions?.length > 0 ? (
              <div ref={barChartRef}></div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No contribution data</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
