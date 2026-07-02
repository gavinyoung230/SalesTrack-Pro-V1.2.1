/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Tag, 
  ChevronRight, 
  ChevronDown, 
  ArrowUpRight,
  Info,
  Check,
  AlertCircle,
  ShoppingBag,
  Receipt,
  Database,
  Download,
  UploadCloud
} from 'lucide-react';
import { Order, Expense } from '../types';

interface CategoriesViewProps {
  orders: Order[];
  expenses: Expense[];
  categories: string[];
  onAddCategory: (category: string) => void;
  onRestoreBackup: (backup: { orders: Order[]; expenses: Expense[]; categories: string[] }) => void;
  categoryColors: Record<string, string>;
  onChangeCategoryColor: (category: string, color: string) => void;
}

export default function CategoriesView({
  orders,
  expenses,
  categories,
  onAddCategory,
  onRestoreBackup,
  categoryColors,
  onChangeCategoryColor
}: CategoriesViewProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Backup and data portability state variables
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');

  const handleDownloadBackup = () => {
    try {
      setBackupError('');
      setBackupSuccess('');
      
      const backupPayload = {
        version: "ops_hub_backup_v1",
        email: "gs3dprintingandlaserengraving@gmail.com",
        timestamp: new Date().toISOString(),
        orders: orders,
        expenses: expenses,
        categories: categories
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `SalesTrackPro_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupSuccess('Database backup file successfully generated!');
      setTimeout(() => setBackupSuccess(''), 4000);
    } catch (e) {
      setBackupError('Failed to generate local backup file.');
    }
  };

  const handleRestoreBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupError('');
    setBackupSuccess('');

    const fileReader = new FileReader();
    const uploadedFile = e.target.files?.[0];

    if (!uploadedFile) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid file format.');
        }

        if (!Array.isArray(parsed.orders) || !Array.isArray(parsed.expenses)) {
          throw new Error('File does not match expected SalesTrackPro structure (missing orders or expenses arrays).');
        }

        onRestoreBackup({
          orders: parsed.orders,
          expenses: parsed.expenses,
          categories: Array.isArray(parsed.categories) ? parsed.categories : categories
        });

        setBackupSuccess('System Database restored successfully!');
        e.target.value = '';
        setTimeout(() => setBackupSuccess(''), 4500);
      } catch (err: any) {
        setBackupError(`Import failed: ${err.message || 'Check for JSON file syntax errors.'}`);
      }
    };

    fileReader.readAsText(uploadedFile);
  };

  // Grand Totals across all modules
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const grandTotalRevenue = completedOrders.reduce((sum, o) => sum + o.amount, 0);
  const grandTotalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grandNetCash = grandTotalRevenue - grandTotalExpenses;

  // Compute stats per category
  const categoryStats = categories.map(cat => {
    // Orders categorized under this category (Completed status yields positive inflow)
    const matchingOrders = orders.filter(o => o.category?.toLowerCase() === cat.toLowerCase());
    const completedMatchingOrders = matchingOrders.filter(o => o.status === 'Completed');
    
    // Expenses categorized under this category
    const matchingExpenses = expenses.filter(e => e.category.toLowerCase() === cat.toLowerCase());

    const inflow = completedMatchingOrders.reduce((sum, o) => sum + o.amount, 0);
    const outflow = matchingExpenses.reduce((sum, e) => sum + e.amount, 0);
    const net = inflow - outflow;
    const totalCount = matchingOrders.length + matchingExpenses.length;

    return {
      name: cat,
      inflow,
      outflow,
      net,
      itemCount: totalCount,
      allMatchingOrders: matchingOrders,
      allMatchingExpenses: matchingExpenses
    };
  });

  // Handle addition form submissions
  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setErrorMsg('Category name cannot be empty.');
      return;
    }

    if (trimmed.length < 2) {
      setErrorMsg('Category name must be at least 2 characters.');
      return;
    }

    // Duplicate check
    const duplicate = categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setErrorMsg(`"${trimmed}" category already exists.`);
      return;
    }

    onAddCategory(trimmed);
    setSuccessMsg(`Category "${trimmed}" successfully added!`);
    setNewCategoryName('');

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amt);
  };

  return (
    <div id="categories-view-container" className="space-y-6">
      
      {/* View Header */}
      <div id="categories-header-block" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 id="categories-title" className="text-3xl font-display font-bold text-white tracking-tight">Category Hub</h1>
          <p id="categories-subtitle" className="text-gray-400 mt-1">Manage custom organization units, track inflow/outflow ratios, and review cash totals.</p>
        </div>
      </div>

      {/* Grid of Grand Totals (Requirement 4: See the grand total of all of the money) */}
      <div id="grand-totals-grid" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Grand Total Revenue */}
        <div id="grand-revenue-card" className="bg-[#0f172a] border border-[#1e3a8a] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp size={60} className="text-green-400" />
          </div>
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest font-mono">GRAND TOTAL REVENUE</p>
          <h3 className="text-2xl font-bold text-white mt-1.5 font-mono">{formatCurrency(grandTotalRevenue)}</h3>
          <p className="text-xs text-gray-500 mt-1">Sum of completed order inflows</p>
        </div>

        {/* Grand Total Expenses */}
        <div id="grand-expenses-card" className="bg-[#0f172a] border border-[#1e3a8a] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingDown size={60} className="text-rose-400" />
          </div>
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest font-mono">GRAND TOTAL EXPENSES</p>
          <h3 className="text-2xl font-bold text-white mt-1.5 font-mono">{formatCurrency(grandTotalExpenses)}</h3>
          <p className="text-xs text-gray-500 mt-1">Sum of all running overhead outflows</p>
        </div>

        {/* Grand Total Net Cash */}
        <div id="grand-net-card" className="bg-[#1e3a8a] border border-blue-600/30 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign size={60} className="text-white" />
          </div>
          <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest font-mono">GRAND TOTAL NET Cash Position</p>
          <h3 className="text-2xl font-bold text-white mt-1.5 font-mono">{formatCurrency(grandNetCash)}</h3>
          <div className="flex items-center gap-1.5 text-xs text-blue-200 mt-1 font-semibold">
            {grandNetCash >= 0 ? (
              <span className="text-green-300">● Positive Net Yield</span>
            ) : (
              <span className="text-rose-300">● Net Overhead Deficit</span>
            )}
          </div>
        </div>

      </div>

      {/* Main categories view split layout */}
      <div id="categories-main-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Create New Category (Requirement 2) */}
        <div id="create-category-container" className="space-y-4">
          <div className="bg-[#0f172a] border border-[#1e3a8a] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-[#1e3a8a]/40 text-[#4169E1] rounded-lg">
                <Plus size={16} />
              </div>
              <h2 className="text-base font-bold text-white">Create New Category</h2>
            </div>
            
            <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
              <div>
                <label htmlFor="new-cat-input" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                  Category Name
                </label>
                <input
                  id="new-cat-input"
                  type="text"
                  required
                  placeholder="e.g. Custom Signs, Web Hosting"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full bg-black/40 border border-[#1e3a8a]/40 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1]/20 transition-all font-sans"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl flex items-center gap-2">
                  <Check size={14} className="flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                id="submit-create-category-btn"
                type="submit"
                className="w-full py-3 bg-[#1e3a8a] hover:bg-blue-600 font-bold text-white text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95 cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Plus size={14} />
                <span>Add Category</span>
              </button>
            </form>
          </div>

          {/* Local Backups & Data Portability */}
          <div id="backups-portability-card" className="bg-[#0f172a] border border-[#1e3a8a] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#1e3a8a]/40 text-[#4169E1] rounded-lg">
                <Database size={16} />
              </div>
              <h2 className="text-base font-bold text-white">Backups & Portability</h2>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed">
              Keep your financial records and custom categories safe! 
              Download an offline database backup to move your data to a separate computer or store a secure physical archive.
            </p>

            <div className="pt-2 flex flex-col gap-2.5">
              {/* Download Backup Button */}
              <button
                id="download-backup-btn"
                type="button"
                onClick={handleDownloadBackup}
                className="w-full py-2.5 bg-black/40 hover:bg-[#1e3a8a]/20 border border-[#1e3a8a]/40 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={13} />
                <span>Save Offline Backup (.json)</span>
              </button>

              {/* Restore/Import Backup Button */}
              <div className="relative">
                <input
                  id="import-backup-file-input"
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackupUpload}
                  className="hidden"
                />
                <button
                  id="trigger-restore-backup-btn"
                  type="button"
                  onClick={() => document.getElementById('import-backup-file-input')?.click()}
                  className="w-full py-2.5 bg-[#1e3a8a]/20 hover:bg-[#1e3a8a]/30 border border-[#4169E1]/30 text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <UploadCloud size={13} />
                  <span>Restore/Import Archive</span>
                </button>
              </div>
            </div>

            {backupError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] rounded-lg flex items-center gap-2">
                <AlertCircle size={13} className="flex-shrink-0" />
                <span>{backupError}</span>
              </div>
            )}

            {backupSuccess && (
              <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] rounded-lg flex items-center gap-2">
                <Check size={13} className="flex-shrink-0" />
                <span>{backupSuccess}</span>
              </div>
            )}
          </div>

          <div className="bg-[#0f172a]/20 border border-[#1e3a8a]/20 rounded-2xl p-4 text-xs text-gray-400 flex items-start gap-2.5">
            <Info size={15} className="text-[#4169E1] mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-gray-300">Organized Ledger Structuring</p>
              <p className="leading-relaxed">Creating custom categories lets you organize either your new <strong>orders</strong> or your business <strong>expenses</strong>. When adding new items, simply choose your custom category from the select list.</p>
            </div>
          </div>
        </div>

        {/* Right column: Category stats listing (Requirement 1 & 3: Select, see category totals, etc.) */}
        <div id="categories-totals-display" className="lg:col-span-2 space-y-4">
          <div className="bg-[#0f172a] border border-[#1e3a8a] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1e3a8a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#4169E1]" />
                <h2 className="text-base font-bold text-white">Categories & Ledger Balances Breakdown</h2>
              </div>
              <span className="text-xs bg-[#1e3a8a]/30 text-blue-300 px-2 py-0.5 rounded font-mono font-semibold uppercase">{categories.length} tracked</span>
            </div>

            <div className="divide-y divide-[#1e3a8a]/40">
              {categoryStats.map((stat) => {
                const isExpanded = expandedCategory === stat.name;
                
                return (
                  <div key={stat.name} id={`category-card-row-${stat.name.replace(/\s+/g, '-').toLowerCase()}`} className="transition-all bg-black/10 hover:bg-black/30">
                      <div 
                        className="p-5 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative group cursor-pointer" title="Click to change category color">
                            <input
                              type="color"
                              value={categoryColors[stat.name] || '#4169E1'}
                              onChange={(e) => onChangeCategoryColor(stat.name, e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <div 
                              className="p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center border border-white/10"
                              style={{ backgroundColor: `${categoryColors[stat.name] || '#4169E1'}20`, color: categoryColors[stat.name] || '#4169E1' }}
                            >
                              <Tag size={16} />
                            </div>
                          </div>
                          <div onClick={() => setExpandedCategory(isExpanded ? null : stat.name)} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-base leading-tight">{stat.name}</h3>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900 font-mono font-bold">
                                {stat.itemCount} items
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                              <span>Inflows: <strong className="text-gray-300 font-mono font-medium">{formatCurrency(stat.inflow)}</strong></span>
                              <span>•</span>
                              <span>Outflows: <strong className="text-gray-300 font-mono font-medium">{formatCurrency(stat.outflow)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right cursor-pointer" onClick={() => setExpandedCategory(isExpanded ? null : stat.name)}>
                        <div>
                          {/* Requirement 3: See the total of the money in that category */}
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Net Balance</p>
                          <span className={`text-sm md:text-base font-bold font-mono ${
                            stat.net > 0 ? 'text-green-400' : stat.net < 0 ? 'text-rose-400' : 'text-gray-300'
                          }`}>
                            {stat.net > 0 ? '+' : ''}{formatCurrency(stat.net)}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable transaction checklist belonging to category */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-[#090e1a]/80"
                        >
                          <div className="p-5 border-t border-[#1e3a8a]/30 space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Transactions Ledger List</h4>
                            
                            {stat.itemCount === 0 ? (
                              <div className="text-center py-6 text-gray-500 text-xs">
                                No logged orders or expenses organized under "{stat.name}" yet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Orders matches */}
                                {stat.allMatchingOrders.map(o => (
                                  <div key={o.id} className="flex items-center justify-between p-3 bg-black/25 rounded-lg border border-[#1e3a8a]/20 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-green-500/10 text-green-400 rounded">
                                        <ShoppingBag size={12} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-white">{o.customerName}</span>
                                          <span className="text-[9px] font-mono font-semibold opacity-60 uppercase">{o.id}</span>
                                        </div>
                                        <span className="text-gray-400">{o.product}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className={`font-mono font-semibold ${o.status === 'Completed' ? 'text-green-400' : 'text-gray-500 line-through'}`}>
                                        +{formatCurrency(o.amount)}
                                      </span>
                                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">{o.status} • {o.date}</p>
                                    </div>
                                  </div>
                                ))}

                                {/* Expenses matches */}
                                {stat.allMatchingExpenses.map(e => (
                                  <div key={e.id} className="flex items-center justify-between p-3 bg-black/25 rounded-lg border border-[#1e3a8a]/20 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded">
                                        <Receipt size={12} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-white">{e.description}</span>
                                          <span className="text-[9px] font-mono font-semibold opacity-60 uppercase">{e.id}</span>
                                        </div>
                                        <span className="text-gray-400">{e.date}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-mono font-semibold text-rose-400">
                                        -{formatCurrency(e.amount)}
                                      </span>
                                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">Expense overhead</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
