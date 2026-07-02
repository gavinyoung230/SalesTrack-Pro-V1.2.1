/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  ArrowUpRight, 
  ClipboardList,
  Plus,
  Receipt
} from 'lucide-react';
import { Order, Expense, TransactionActivity } from '../types';

interface DashboardViewProps {
  orders: Order[];
  expenses: Expense[];
  onNavigate: (view: 'orders' | 'expenses' | 'analytics') => void;
  onOpenAddOrder: () => void;
  onOpenAddExpense: () => void;
}

export default function DashboardView({
  orders,
  expenses,
  onNavigate,
  onOpenAddOrder,
  onOpenAddExpense
}: DashboardViewProps) {
  // Calculations
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalOrdersCount = orders.length;

  // Recent activity feed: last 5 transactions sorted chronologically
  // Combined list of orders and expenses
  const combinedActivities: TransactionActivity[] = [
    ...orders.map(order => ({
      id: order.id,
      type: 'order' as const,
      title: `Order: ${order.customerName}`,
      subtitle: order.product,
      amount: order.amount,
      date: order.date,
      statusColor: order.status === 'Completed' ? 'text-green-400' : order.status === 'Pending' ? 'text-yellow-400' : 'text-red-400',
      status: order.status
    })),
    ...expenses.map(exp => ({
      id: exp.id,
      type: 'expense' as const,
      title: `Expense: ${exp.category}`,
      subtitle: exp.description,
      amount: exp.amount,
      date: exp.date,
      statusColor: 'text-rose-400'
    }))
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div id="dashboard-view-container" className="space-y-8">
      {/* Welcome Banner */}
      <div id="dashboard-header-block" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 id="dashboard-title" className="text-3xl font-display font-bold text-white tracking-tight">Financial Command Center</h1>
          <p id="dashboard-subtitle" className="text-gray-400 mt-1">Real-time tracking of operations, orders, and overhead expenses.</p>
        </div>
        
        {/* Quick Action Buttons */}
        <div id="quick-actions-bar" className="flex gap-3 mt-2 md:mt-0">
          <button
            id="quick-add-order-btn"
            onClick={onOpenAddOrder}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 font-medium text-white px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 leading-none"
          >
            <Plus size={16} />
            <span>New Order</span>
          </button>
          <button
            id="quick-log-expense-btn"
            onClick={onOpenAddExpense}
            className="flex items-center gap-2 bg-[#121214] hover:bg-[#1a1a1e] border border-blue-500/30 text-blue-400 hover:text-blue-300 font-medium px-4 py-2.5 rounded-lg transition-all active:scale-95 leading-none"
          >
            <Plus size={16} />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid - Royal Blue Boxes styled cleanly */}
      <div id="dashboard-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Revenue */}
        <motion.div
          id="metric-revenue-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1e3a8a] rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden group border border-[#1e3a8a]/20"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <DollarSign size={80} className="text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-display text-white/70 tracking-widest uppercase font-semibold">Total Revenue</span>
            <span className="p-1.5 bg-white/10 rounded-lg text-white">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-white tracking-tight">{formatCurrency(totalRevenue)}</h3>
          </div>
        </motion.div>

        {/* Card 2: Total Expenses */}
        <motion.div
          id="metric-expenses-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-[#1e3a8a] rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden group border border-[#1e3a8a]/20"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <Receipt size={80} className="text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-display text-white/70 tracking-widest uppercase font-semibold">Total Expenses</span>
            <span className="p-1.5 bg-white/10 rounded-lg text-white">
              <TrendingDown size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-white tracking-tight">{formatCurrency(totalExpenses)}</h3>
          </div>
        </motion.div>

        {/* Card 3: Net Profit */}
        <motion.div
          id="metric-profit-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[#1e3a8a] rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden group border border-[#1e3a8a]/20"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <TrendingUp size={80} className="text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-display text-white/70 tracking-widest uppercase font-semibold">Net Profit</span>
            <span className="p-1.5 bg-white/10 rounded-lg text-white">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-white tracking-tight">{formatCurrency(netProfit)}</h3>
          </div>
        </motion.div>

        {/* Card 4: Total Orders Change */}
        <motion.div
          id="metric-orders-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-[#1e3a8a] rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden group border border-[#1e3a8a]/20"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <ShoppingBag size={80} className="text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-display text-white/70 tracking-widest uppercase font-semibold">Total Orders</span>
            <span className="p-1.5 bg-white/10 rounded-lg text-white">
              <ClipboardList size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-white tracking-tight">{totalOrdersCount}</h3>
          </div>
        </motion.div>

      </div>

      {/* Main Grid Content */}
      <div id="recent-activity-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions List */}
        <div id="recent-transactions" className="lg:col-span-2 bg-[#0f172a] border border-[#1e3a8a] rounded-[16px] overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-[#1e3a8a]">
            <div>
              <h2 className="text-sm font-display font-semibold uppercase tracking-wider text-[#4169E1]">Recent Orders & Activity</h2>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#4169E1] hover:text-blue-300 flex items-center gap-1 transition-all"
            >
              <span>View All</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div id="timeline-stack" className="space-y-4 p-5">
            {combinedActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No activity logged yet. Add your first order or expense to begin.</p>
              </div>
            ) : (
              combinedActivities.map((act, index) => (
                <motion.div
                  id={`activity-item-${act.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  key={`${act.type}-${act.id}-${index}`}
                  className="flex items-center justify-between p-4 bg-black/20 border border-[#1e3a8a]/40 rounded-xl hover:border-[#1e3a8a] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-[10px] bg-[#1e3a8a] text-white transition-all flex-shrink-0">
                      {act.type === 'order' ? <ShoppingBag size={18} /> : <Receipt size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white text-sm sm:text-base">{act.title}</span>
                        <span className="text-[10px] font-mono bg-[#1c1c24] text-gray-400 px-1.5 py-0.5 rounded uppercase">{act.id}</span>
                        {act.type === 'order' && act.status && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold select-none ${
                            act.status === 'Completed'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : act.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {act.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 lines-clamp-1">{act.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-sm sm:text-base ${
                      act.type === 'order'
                        ? act.status === 'Completed'
                          ? 'text-green-400'
                          : act.status === 'Pending'
                          ? 'text-amber-400/70'
                          : 'text-gray-500 line-through opacity-60'
                        : 'text-rose-400'
                    }`}>
                      {act.type === 'order'
                        ? act.status === 'Completed'
                          ? '+'
                          : act.status === 'Pending'
                          ? '• '
                          : '✕ '
                        : '-'}{formatCurrency(act.amount)}
                    </span>
                    <p className="text-[10px] text-gray-500 font-medium mt-1 font-mono">
                      {act.type === 'order' && act.status !== 'Completed' ? 'No profit yield' : act.date}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Operational Highlights panel */}
        <div id="operational-highlights" className="bg-[#0f172a] border border-[#1e3a8a] rounded-[16px] p-6 space-y-5">
          <div className="border-b border-[#1e3a8a]/45 pb-3">
            <h2 className="text-sm font-display font-semibold uppercase tracking-wider text-[#4169E1]">Status Breakdown</h2>
          </div>

          {/* Micro progress graphs */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs text-gray-300 font-medium mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  Completed Sales
                </span>
                <span>{orders.filter(o => o.status === 'Completed').length} orders</span>
              </div>
              <div className="w-full bg-[#161619] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${orders.length ? (orders.filter(o => o.status === 'Completed').length / orders.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 font-medium mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Pending Production
                </span>
                <span>{orders.filter(o => o.status === 'Pending').length} orders</span>
              </div>
              <div className="w-full bg-[#161619] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${orders.length ? (orders.filter(o => o.status === 'Pending').length / orders.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 font-medium mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Cancelled / Hold
                </span>
                <span>{orders.filter(o => o.status === 'Cancelled').length} orders</span>
              </div>
              <div className="w-full bg-[#161619] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${orders.length ? (orders.filter(o => o.status === 'Cancelled').length / orders.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
