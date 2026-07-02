/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart2, 
  PieChart as PieIcon, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp,
  Percent,
  Calendar,
  Layers
} from 'lucide-react';
import { Order, Expense } from '../types';

interface AnalyticsViewProps {
  orders: Order[];
  expenses: Expense[];
  categoryColors?: Record<string, string>;
  onChangeCategoryColor?: (category: string, color: string) => void;
}

interface MonthData {
  monthKey: string; // "2025-05"
  monthName: string; // "May 2025" or "May"
  revenue: number;
  expenses: number;
  profit: number;
}

export default function AnalyticsView({ orders, expenses, categoryColors = {}, onChangeCategoryColor }: AnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories'>('overview');
  const [barHoverIndex, setBarHoverIndex] = useState<number | null>(null);
  const [pieHoverCategory, setPieHoverCategory] = useState<string | null>(null);

  // Month formatter helper
  const getMonthAndYearName = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short' });
    } catch {
      return dateStr.substring(5, 7);
    }
  };

  const getMonthYearKey = (dateStr: string) => {
    return dateStr.substring(0, 7); // "YYYY-MM"
  };

  // Grouped monthly numbers
  const monthlyData: MonthData[] = useMemo(() => {
    const dataMap: { [key: string]: { revenue: number; expenses: number } } = {};

    // Base pre-populated months to guarantee keys sorted chronologically
    const knownMonths = ['2026-03', '2026-04', '2026-05'];
    knownMonths.forEach(m => {
      dataMap[m] = { revenue: 0, expenses: 0 };
    });

    // Aggregate Completed Orders as Revenue
    orders.forEach(order => {
      if (order.status !== 'Completed') return; // Only count completed sales
      const key = getMonthYearKey(order.date);
      if (!dataMap[key]) {
        dataMap[key] = { revenue: 0, expenses: 0 };
      }
      dataMap[key].revenue += order.amount;
    });

    // Aggregate Expenses
    expenses.forEach(exp => {
      const key = getMonthYearKey(exp.date);
      if (!dataMap[key]) {
        dataMap[key] = { revenue: 0, expenses: 0 };
      }
      dataMap[key].expenses += exp.amount;
    });

    return Object.keys(dataMap)
      .sort() // Chronological YYYY-MM order
      .map(key => {
        const parts = key.split('-');
        let name = key;
        if (parts.length === 2) {
          const mNum = parseInt(parts[1], 10) - 1;
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          if (mNum >= 0 && mNum < 12) {
            name = `${months[mNum]} ${parts[0].substring(2)}`;
          }
        }
        return {
          monthKey: key,
          monthName: name,
          revenue: dataMap[key].revenue,
          expenses: dataMap[key].expenses,
          profit: dataMap[key].revenue - dataMap[key].expenses
        };
      });
  }, [orders, expenses]);

  // Expenses by Category breakdown metrics
  const categoryBreakdown = useMemo(() => {
    const breakdown: { [key: string]: number } = {};
    let total = 0;

    expenses.forEach(exp => {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
      total += exp.amount;
    });

    const categoryList = Object.keys(breakdown);
    
    return categoryList.map(cat => {
      const amt = breakdown[cat] || 0;
      return {
        category: cat,
        amount: amt,
        percentage: total > 0 ? Math.round((amt / total) * 100) : 0
      };
    }).sort((a, b) => b.amount - a.amount); // Higher expenses first
  }, [expenses]);

  const totalExpenseSum = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const maxChartValue = useMemo(() => {
    const values = monthlyData.flatMap(d => [d.revenue, d.expenses]);
    const max = Math.max(...values, 500); // base min height
    return Math.ceil(max / 500) * 500 + 100; // Pad round to 500
  }, [monthlyData]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amt);
  };

  // Pie chart arc offsets calculation for custom SVG circles
  const pieCircles = useMemo(() => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius; // ~376.99
    let accumulatedLength = 0;

    const defaultColors: Record<string, string> = {
      'Inventory': '#4169E1', // royal blue
      'Marketing': '#06b6d4', // cyan-400
      'Software': '#a855f7', // purple-500
      'Utilities': '#eab308', // yellow-500
      'Other': '#6b7280' // grey-500
    };

    return categoryBreakdown.map(item => {
      const percentageDecimal = item.percentage / 100;
      const length = percentageDecimal * circumference;
      const offset = -accumulatedLength;
      accumulatedLength += length;

      return {
        ...item,
        color: categoryColors[item.category] || defaultColors[item.category] || '#3b82f6',
        strokeDasharray: `${length} ${circumference}`,
        strokeDashoffset: offset
      };
    });
  }, [categoryBreakdown, categoryColors]);

  return (
    <div id="analytics-view-container" className="space-y-6">
      
      {/* Header section */}
      <div id="analytics-header-block" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 id="analytics-title" className="text-3xl font-display font-bold text-white tracking-tight">Interactive Analytics</h1>
          <p id="analytics-subtitle" className="text-gray-400 mt-1">Cross-reference monthly earnings flow against categorized operational overheads.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-black/30 border border-[#1e3a8a]/50 rounded-lg p-0.5 self-stretch sm:self-auto">
          <button
            id="tab-btn-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs rounded-md font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#1e3a8a] text-white font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart2 size={14} />
            <span>Revenue vs Expenses</span>
          </button>
          <button
            id="tab-btn-categories"
            onClick={() => setActiveTab('categories')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs rounded-md font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-[#1e3a8a] text-white font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <PieIcon size={14} />
            <span>Expenses Breakdown</span>
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div id="analytics-overview-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Bar Chart Box */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e3a8a] p-6 rounded-[16px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-display font-medium text-white">Monthly Comparison</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Showing completed sales vs logged expenditures.</p>
                </div>

                {/* Legend indicator */}
                <div className="flex gap-4 text-xs font-semibold font-sans">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-[#4169E1] rounded"></span>
                    <span className="text-gray-300">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-[#1e3a8a]/40 border border-[#1e3a8a]/60 rounded"></span>
                    <span className="text-gray-300">Expenses</span>
                  </div>
                </div>
              </div>

              {/* Custom SVG Bar Chart */}
              <div className="relative h-72 w-full pt-4">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-[#1e3a8a]/30 pb-6 pr-2">
                  {[4, 3, 2, 1, 0].map(multiplier => {
                    const lineVal = (maxChartValue / 4) * multiplier;
                    return (
                      <div key={multiplier} className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-mono text-gray-500 w-12 text-left">{formatCurrency(lineVal)}</span>
                        <div className="flex-1 border-t border-[#1e3a8a]/10"></div>
                      </div>
                    );
                  })}
                </div>

                {/* Interactive bar vectors container */}
                <div className="absolute bottom-6 left-12 right-2 top-0 flex justify-around items-end">
                  {monthlyData.map((d, index) => {
                    // Normalize heights based on maxChartValue
                    const revenueRawPercentage = (d.revenue / maxChartValue) * 100;
                    const expensesRawPercentage = (d.expenses / maxChartValue) * 100;

                    // Constrain min display height if values are > 0
                    const revenueHeight = d.revenue > 0 ? Math.max(revenueRawPercentage, 3) : 0;
                    const expensesHeight = d.expenses > 0 ? Math.max(expensesRawPercentage, 3) : 0;

                    return (
                      <div 
                        key={d.monthKey} 
                        className="flex flex-col items-center justify-end h-full relative group"
                        style={{ width: `${80 / monthlyData.length}%` }}
                        onMouseEnter={() => setBarHoverIndex(index)}
                        onMouseLeave={() => setBarHoverIndex(null)}
                      >
                        {/* Tooltip Card Overlay for interactive feedback */}
                        {barHoverIndex === index && (
                          <div className="absolute top-0 transform -translate-y-12 bg-[#0f172a] border border-[#1e3a8a] px-3 py-2 rounded-lg text-xs space-y-1 z-30 shadow-2xl min-w-[140px] pointer-events-none">
                            <p className="font-bold text-gray-200 border-b border-[#1e3a8a]/50 pb-1">{d.monthName}</p>
                            <p className="flex justify-between gap-3">
                              <span className="text-gray-400">Revenue:</span>
                              <span className="font-mono text-[#4169E1] font-bold">{formatCurrency(d.revenue)}</span>
                            </p>
                            <p className="flex justify-between gap-3">
                              <span className="text-gray-400">Expense:</span>
                              <span className="font-mono text-rose-400 font-bold">{formatCurrency(d.expenses)}</span>
                            </p>
                            <p className="flex justify-between gap-3 pt-0.5 border-t border-[#1e3a8a]/20">
                              <span className="text-gray-400">Net Profit:</span>
                              <span className={`font-mono font-bold ${d.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(d.profit)}
                              </span>
                            </p>
                          </div>
                        )}

                        <div className="flex items-end gap-1.5 sm:gap-3 w-full justify-center h-full max-w-[120px]">
                          {/* Revenue Bar */}
                          <div 
                            className={`w-4 sm:w-8 bg-[#4169E1] rounded-t transition-all duration-300 relative overflow-hidden group-hover:bg-[#4169E1]/85`}
                            style={{ height: `${revenueHeight}%` }}
                          />
                          {/* Expense Bar */}
                          <div 
                            className="w-4 sm:w-8 bg-[#1e3a8a]/20 border border-[#1e3a8a]/40 rounded-t transition-all duration-300 group-hover:bg-[#1e3a8a]/45"
                            style={{ height: `${expensesHeight}%` }}
                          />
                        </div>

                        {/* Label name tag */}
                        <span className="absolute transform translate-y-5 text-xs text-gray-400 font-medium font-sans uppercase">
                          {d.monthName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#1e3a8a]/40 mt-10 text-xs text-gray-500 flex items-center gap-1.5">
              <span>📊 Hover over the individual bars to audit detailed net aggregates per month.</span>
            </div>
          </div>

          {/* Snapshot Metric columns */}
          <div className="space-y-6">
            
            {/* Dynamic trend widget */}
            <div className="bg-[#0f172a] border border-[#1e3a8a] p-6 rounded-[16px] flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-display font-medium text-white">Profit Metrics</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-sans">Accumulated profit tracking across current registers.</p>
                </div>

                <div className="space-y-3.5">
                  {monthlyData.map((d, i) => {
                    const percentOfRevenue = d.revenue > 0 ? Math.round((d.profit / d.revenue) * 100) : 0;
                    return (
                      <div key={d.monthKey} className="p-3.5 bg-black/20 border border-[#1e3a8a]/40 rounded-lg flex items-center justify-between hover:border-[#1e3a8a]/80 transition-colors">
                        <div>
                          <span className="text-xs font-bold text-gray-400 font-sans block">{d.monthName} Sales Cycle</span>
                          <span className="font-mono font-bold text-white text-base mt-0.5 block">{formatCurrency(d.profit)}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold ${
                            d.profit >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-505'
                          }`}>
                            {d.profit >= 0 ? '+' : ''}{percentOfRevenue}% margins
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div id="annual-forecast-card" className="mt-6 border-t border-[#1e3a8a]/40 pt-5 text-gray-300">
                <span className="text-xs uppercase font-semibold text-[#4169E1] tracking-wider font-display">Operational Performance</span>
                <p className="text-xs text-gray-400 mt-2.5 leading-relaxed font-sans">
                  Excellent overhead discipline. Expense ratios are currently optimized with high inventory allocations supporting physical 3D and laser custom product operations.
                </p>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div id="analytics-categories-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* SVG Pie/Donut Chart Container */}
          <div className="bg-[#0f172a] border border-[#1e3a8a] p-6 rounded-[16px] flex flex-col items-center justify-between min-h-[360px]">
            <div className="w-full text-center sm:text-left">
              <h2 className="text-lg font-display font-medium text-white text-left">Overhead Categories</h2>
              <p className="text-xs text-gray-400 mt-0.5 text-left font-sans">Visual percentage allocation of total expenditures ({formatCurrency(totalExpenseSum)}).</p>
            </div>

            {/* Render Circle Arc Pie chart */}
            <div className="relative w-48 h-48 my-6 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Background loop spacer */}
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="transparent"
                  stroke="#131b2e"
                  strokeWidth="20"
                />

                {/* Segment paths rendering */}
                {totalExpenseSum > 0 ? (
                  pieCircles.map((circle) => {
                    const isHovered = pieHoverCategory === circle.category;
                    return (
                      <circle
                        key={circle.category}
                        cx="80"
                        cy="80"
                        r="60"
                        fill="transparent"
                        stroke={circle.color}
                        strokeWidth={isHovered ? "24" : "20"}
                        strokeDasharray={circle.strokeDasharray}
                        strokeDashoffset={circle.strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setPieHoverCategory(circle.category)}
                        onMouseLeave={() => setPieHoverCategory(null)}
                      />
                    );
                  })
                ) : (
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="transparent"
                    stroke="#1e3a8a"
                    strokeWidth="20"
                  />
                )}
              </svg>

              {/* Inside Donut Center readout values */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-mono font-bold text-white">
                  {pieHoverCategory 
                    ? `${categoryBreakdown.find(c => c.category === pieHoverCategory)?.percentage || 0}%`
                    : '100%'
                  }
                </span>
                <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  {pieHoverCategory || 'Total Overhead'}
                </span>
              </div>
            </div>

            <div className="w-full text-center text-xs text-gray-500 font-sans">
              <span>🎯 Hover over segments of the donut to expand specific allocations.</span>
            </div>
          </div>

          {/* Breakdown data rows */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e3a8a] p-6 rounded-[16px] flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-display font-medium text-white">Overhead Allocation</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-sans">Absolute totals ranked from highest to lowest cash utilization.</p>
              </div>

              {/* Progress Rows */}
              <div className="space-y-4">
                {pieCircles.map((catItem) => {
                  const isHovered = pieHoverCategory === catItem.category;
                  return (
                    <div 
                      key={catItem.category}
                      onMouseEnter={() => setPieHoverCategory(catItem.category)}
                      onMouseLeave={() => setPieHoverCategory(null)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isHovered 
                          ? 'bg-black/20 border-[#1e3a8a] shadow-lg shadow-blue-500/5 translate-x-1' 
                          : 'bg-black/10 border-transparent hover:border-[#1e3a8a]/40'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs sm:text-sm font-sans mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="relative group cursor-pointer" title="Change category color">
                            <input
                              type="color"
                              value={catItem.color}
                              onChange={(e) => onChangeCategoryColor?.(catItem.category, e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <span className="w-3 h-3 rounded-full block border border-white/20" style={{ backgroundColor: catItem.color }} />
                          </div>
                          <span className="font-semibold text-white">{catItem.category}</span>
                        </div>
                        <div className="flex items-center gap-3 font-semibold text-gray-300">
                          <span className="text-gray-400 text-xs">{catItem.percentage}%</span>
                          <span className="font-mono text-white text-xs sm:text-sm">{formatCurrency(catItem.amount)}</span>
                        </div>
                      </div>

                      {/* Progress bar line */}
                      <div className="w-full bg-[#131b2e] h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${catItem.percentage}%`,
                            backgroundColor: catItem.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#1e3a8a]/40 mt-6 text-xs text-blue-300 leading-relaxed font-sans">
              ℹ️ Categorized items represent individual business operations. Analyze your custom category distribution above to understand specific cash outflows and cost drivers.
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
