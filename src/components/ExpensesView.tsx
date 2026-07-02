/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Plus, 
  X, 
  AlertCircle, 
  Info,
  DollarSign,
  Receipt,
  Tag,
  Trash2,
  Edit3,
  Check,
  UploadCloud
} from 'lucide-react';
import { Expense } from '../types';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (newExpense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (updatedExpense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddExpensesBulk: (newExpenses: Omit<Expense, 'id'>[]) => void;
  onUpdateExpensesBulk: (expenseIds: string[], category?: string) => void;
  isOpenAddModal: boolean;
  setIsOpenAddModal: (isOpen: boolean) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
  categoryColors?: Record<string, string>;
}

export default function ExpensesView({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddExpensesBulk,
  onUpdateExpensesBulk,
  isOpenAddModal,
  setIsOpenAddModal,
  categories,
  onAddCategory,
  categoryColors = {}
}: ExpensesViewProps) {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Bulk selection state
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

  // New Expense Form state
  const [category, setCategory] = useState(categories[0] || 'Uncategorized');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatError, setNewCatError] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    return new Date().toISOString().substring(0, 10);
  });

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Editing state
  const [editingExpenseRecord, setEditingExpenseRecord] = useState<Expense | null>(null);

  // CSV alerts
  const [csvSuccess, setCsvSuccess] = useState('');
  const [csvError, setCsvError] = useState('');

  const resetForm = () => {
    setCategory(categories[0] || 'Uncategorized');
    setShowNewCategoryInput(false);
    setNewCatName('');
    setNewCatError('');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().substring(0, 10));
    setErrors({});
  };

  const handleOpenModal = () => {
    resetForm();
    setEditingExpenseRecord(null);
    setIsOpenAddModal(true);
  };

  const handleCloseModal = () => {
    setIsOpenAddModal(false);
    setEditingExpenseRecord(null);
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpenseRecord(expense);
    setCategory(expense.category);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setDate(expense.date);
    setErrors({});
    setIsOpenAddModal(true);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvSuccess('');
    setCsvError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('Empty content');

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 2) {
          throw new Error('CSV file must match default syntax with header row and records');
        }

        const parseRow = (rowText: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < rowText.length; i++) {
            const char = rowText[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/["']/g, ''));
        
        // Find column indices
        const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('vendor') || h.includes('item') || h.includes('name') || h.includes('title'));
        const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('type') || h.includes('class') || h.includes('tag'));
        const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('price') || h.includes('cost') || h.includes('value') || h.includes('expense'));
        const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('created') || h.includes('time'));

        const parsedExpenses: Omit<Expense, 'id'>[] = [];

        for (let j = 1; j < lines.length; j++) {
          const cells = parseRow(lines[j]);
          if (cells.length === 0 || cells.join('').trim() === '') continue;

          const desc = descIdx !== -1 && cells[descIdx] ? cells[descIdx].replace(/^["']|["']$/g, '') : 'Imported Overhead Cost';
          const cat = categoryIdx !== -1 && cells[categoryIdx] ? cells[categoryIdx].replace(/^["']|["']$/g, '') : 'Uncategorized';
          
          let parsedAmt = 0;
          if (amountIdx !== -1 && cells[amountIdx]) {
            const amtClean = cells[amountIdx].replace(/[$,\-()]/g, '');
            parsedAmt = parseFloat(amtClean) || 0;
          }

          let parsedDate = new Date().toISOString().substring(0, 10);
          if (dateIdx !== -1 && cells[dateIdx]) {
            const rawDate = cells[dateIdx].replace(/^["']|["']$/g, '');
            try {
              const dObj = new Date(rawDate);
              if (!isNaN(dObj.getTime())) {
                parsedDate = dObj.toISOString().substring(0, 10);
              }
            } catch {}
          }

          parsedExpenses.push({
            description: desc,
            category: cat,
            amount: parsedAmt,
            date: parsedDate
          });
        }

        if (parsedExpenses.length === 0) {
          throw new Error('No valid records found in the CSV file');
        }

        // Sort parsed expenses by date ascending so incremental ID corresponds to chronological order
        parsedExpenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        onAddExpensesBulk(parsedExpenses);
        setCsvSuccess(`Successfully imported ${parsedExpenses.length} overhead expenses from CSV!`);
        e.target.value = '';
        setTimeout(() => setCsvSuccess(''), 5000);
      } catch (err: any) {
        setCsvError(err.message || 'Error parsing CSV file');
        setTimeout(() => setCsvError(''), 6000);
      }
    };
    reader.readAsText(file);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 3) {
      newErrors.description = 'Description must be at least 3 characters';
    }

    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const amtNum = parseFloat(amount);
      if (isNaN(amtNum) || amtNum <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingExpenseRecord) {
      onUpdateExpense({
        id: editingExpenseRecord.id,
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        date
      });
    } else {
      onAddExpense({
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        date
      });
    }

    handleCloseModal();
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isAllSelected = filteredExpenses.length > 0 && filteredExpenses.every(e => selectedExpenseIds.includes(e.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedExpenseIds(prev => prev.filter(id => !filteredExpenses.some(fe => fe.id === id)));
    } else {
      setSelectedExpenseIds(prev => {
        const otherSelected = prev.filter(id => !filteredExpenses.some(fe => fe.id === id));
        const filteredAllIds = filteredExpenses.map(fe => fe.id);
        return [...otherSelected, ...filteredAllIds];
      });
    }
  };

  const handleToggleSelectExpense = (id: string) => {
    setSelectedExpenseIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amt);
  };

  // Category Colors
  const getCategoryStyle = (cat: string) => {
    switch (cat) {
      case 'Inventory': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Marketing': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'Software': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'Utilities': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  const renderCategoryTag = (cat: string) => {
    const customColor = categoryColors?.[cat];
    if (customColor) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium select-none border"
          style={{ backgroundColor: `${customColor}20`, color: customColor, borderColor: `${customColor}40` }}
        >
          <Tag size={10} />
          <span>{cat}</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium select-none ${getCategoryStyle(cat)}`}>
        <Tag size={10} />
        <span>{cat}</span>
      </span>
    );
  };

  return (
    <div id="expenses-view-container" className="space-y-6">
      
      {/* Header section with Actions */}
      <div id="expenses-header-block" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 id="expenses-title" className="text-3xl font-display font-bold text-white tracking-tight">Expense Tracking</h1>
          <p id="expenses-subtitle" className="text-gray-400 mt-1">Audit overhead costs, resource logs, and software maintenance expenditures.</p>
        </div>
        <div id="expenses-header-actions" className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* CSV File Upload Input */}
          <div className="relative">
            <input
              id="csv-expenses-upload-input"
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
            <button
              id="import-csv-expenses-btn"
              type="button"
              onClick={() => document.getElementById('csv-expenses-upload-input')?.click()}
              className="flex items-center gap-2 bg-[#0f172a] hover:bg-[#1e3a8a]/20 border border-[#1e3a8a]/60 text-gray-300 hover:text-white font-medium px-4 py-2.5 rounded-lg transition-all active:scale-[0.98] leading-none w-full sm:w-auto justify-center cursor-pointer text-sm font-semibold h-11"
              title="Upload CSV to import business expenses"
            >
              <UploadCloud size={16} className="text-[#4169E1]" />
              <span>Import CSV</span>
            </button>
          </div>

          <button
            id="log-expense-top-btn"
            onClick={handleOpenModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 font-medium text-white px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 leading-none w-full sm:w-auto justify-center cursor-pointer text-sm font-semibold h-11"
          >
            <Plus size={16} />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {csvSuccess && (
        <div className="p-3.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl flex items-center gap-2 font-medium">
          <Check size={14} className="flex-shrink-0 text-green-500" />
          <span>{csvSuccess}</span>
        </div>
      )}

      {csvError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle size={14} className="flex-shrink-0 text-rose-500" />
          <span>{csvError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div id="expenses-filter-box" className="bg-[#0f172a] border border-[#1e3a8a] p-4 rounded-[16px] flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search input field */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
            <Search size={18} />
          </span>
          <input
            id="expenses-search-input"
            type="text"
            placeholder="Search by description, identifier, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/30 border border-[#1e3a8a]/50 focus:border-[#4169E1] focus:outline-none focus:ring-1 focus:ring-[#4169E1] rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition-all font-sans"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white pointer-events-auto"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters control block */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Filter size={14} className="text-[#4169E1]" />
            <span>Category:</span>
          </label>
          <div className="flex bg-black/30 border border-[#1e3a8a]/50 rounded-lg p-0.5 overflow-x-auto max-w-full">
            {['All', ...categories].map((catOption) => (
              <button
                id={`cat-filter-btn-${catOption}`}
                key={catOption}
                onClick={() => setCategoryFilter(catOption)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all whitespace-nowrap ${
                  categoryFilter === catOption
                    ? 'bg-[#1e3a8a] text-white font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {catOption}
              </button>
            ))}
          </div>
        </div>
      </div>
      {selectedExpenseIds.length > 0 && (
        <div id="bulk-actions-expenses-banner" className="bg-[#1e3a8a]/20 border border-[#1e3a8a] rounded-[16px] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg shadow-[#1e3a8a]/5 animate-none">
          <div className="flex items-center gap-2.5">
            <span className="p-1 px-2.5 bg-blue-600 text-white font-mono text-xs font-bold rounded-lg animate-pulse">
              {selectedExpenseIds.length} SELECTED
            </span>
            <span className="text-sm font-medium text-gray-200">
              Bulk update selected overhead expenses simultaneously:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Category selection */}
            <div className="flex items-center bg-black/40 border border-blue-900/50 rounded-lg p-1.5 px-3">
              <span className="text-xs text-gray-400 font-semibold font-sans mr-2">SET CATEGORY:</span>
              <select
                id="bulk-category-select-expenses"
                onChange={(e) => {
                  if (e.target.value) {
                    onUpdateExpensesBulk(selectedExpenseIds, e.target.value);
                    setSelectedExpenseIds([]);
                  }
                }}
                defaultValue=""
                className="bg-[#0f172a] border border-[#1e3a8a]/60 text-xs rounded px-2.5 py-0.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer h-7"
              >
                <option value="" disabled>Choose Category...</option>
                <option value="Uncategorized">Uncategorized</option>
                {categories.filter(cat => cat.toLowerCase() !== 'uncategorized').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Clear selection */}
            <button
              onClick={() => setSelectedExpenseIds([])}
              className="text-xs text-gray-400 hover:text-white underline cursor-pointer font-medium ml-1"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Expenses Catalog Datatable */}
      <div id="expenses-table-wrapper" className="bg-[#0f172a] border border-[#1e3a8a] rounded-[16px] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-black/20 border-b border-[#1e3a8a] text-gray-400 text-xs font-semibold uppercase tracking-wider font-display">
                <th className="py-4 px-6 w-12 text-center select-none">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-[#1e3a8a] text-blue-500 focus:ring-blue-500 focus:ring-opacity-25 w-4 h-4 cursor-pointer accent-[#4169E1] bg-[#0a0f1d]"
                    title="Select or deselect all current filtered rows"
                  />
                </th>
                <th className="py-4 px-6">Expense ID</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a8a]/60 text-sm font-sans text-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-500">
                    <div className="max-w-md mx-auto space-y-2">
                      <AlertCircle className="mx-auto text-blue-500/40" size={36} />
                      <p className="font-semibold text-gray-400">No matching expenses found</p>
                      <p className="text-xs">Try adjusting your filters or search keywords. You can also log a new expense using the button above.</p>
                      {searchTerm ? (
                        <button 
                          onClick={() => { setSearchTerm(''); setCategoryFilter('All'); }}
                          className="mt-3 text-xs text-blue-400 hover:underline font-medium"
                        >
                          Clear Filter Controls
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  return (
                    <tr 
                      id={`expense-row-${expense.id}`}
                      key={expense.id} 
                      className={`hover:bg-white/5 transition-colors group ${selectedExpenseIds.includes(expense.id) ? 'bg-[#1e3a8a]/20' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-6 text-center select-none w-12">
                        <input
                          type="checkbox"
                          checked={selectedExpenseIds.includes(expense.id)}
                          onChange={() => handleToggleSelectExpense(expense.id)}
                          className="rounded border-[#1e3a8a]/80 text-[#4169E1] focus:ring-blue-500 focus:ring-opacity-25 w-4 h-4 cursor-pointer accent-[#4169E1] bg-[#0a0f1d]"
                        />
                      </td>
                      {/* Expense ID */}
                      <td className="py-4 px-6 font-mono font-semibold text-[#4169E1]">
                        {expense.id}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-gray-400 font-mono text-xs">
                        {expense.date}
                      </td>

                      {/* Category Label */}
                      <td className="py-4 px-6">
                        {renderCategoryTag(expense.category)}
                      </td>

                      {/* Description */}
                      <td className="py-4 px-6 font-medium text-white">
                        {expense.description}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 text-right font-mono font-bold text-rose-400">
                        -{formatCurrency(expense.amount)}
                      </td>

                      {/* Actions buttons */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            id={`edit-expense-btn-${expense.id}`}
                            onClick={() => handleEditClick(expense)}
                            className="p-1 px-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs"
                            title="Edit Expense"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            id={`delete-expense-btn-${expense.id}`}
                            onClick={() => {
                              onDeleteExpense(expense.id);
                            }}
                            className="p-1 px-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs"
                            title="Delete Expense"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal dialog form */}
      <AnimatePresence>
        {isOpenAddModal && (
          <div id="add-expense-modal-overlay" className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              id="add-expense-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0f172a] border border-[#1e3a8a] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative"
            >
              {/* Header Box (royal blue box layout banner) */}
              <div className="bg-[#1e3a8a] px-6 py-4 border-b border-[#1e3a8a]/60 flex justify-between items-center text-white">
                <div>
                  <h3 className="text-xl font-display font-medium">
                    {editingExpenseRecord ? 'Edit Expense Details' : 'Log Business Expense'}
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {editingExpenseRecord ? 'Modify the selected transaction data. Required *' : 'Please populate all details below. Required *'}
                  </p>
                </div>
                <button
                  id="close-add-expense-modal-btn"
                  onClick={handleCloseModal}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form implementation */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                
                {/* Category Selection */}
                <div id="form-group-category" className="space-y-1">
                  <label htmlFor="category" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                    Expense Category *
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setShowNewCategoryInput(true);
                        setCategory('');
                      } else {
                        setShowNewCategoryInput(false);
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-[#0a0f1d] border border-[#1e3a8a]/50 text-sm text-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-[#4169E1] transition-all cursor-pointer font-sans"
                  >
                    <option value="Uncategorized">Uncategorized</option>
                    {categories.filter(cat => cat.toLowerCase() !== 'uncategorized').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__NEW__" className="text-blue-400 font-bold">+ Create New Category...</option>
                  </select>

                  {showNewCategoryInput && (
                    <div id="quick-create-cat-box" className="mt-2.5 p-3 px-3.5 bg-black/50 border border-blue-900/40 rounded-xl space-y-2">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Quick Create Category</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New category name..."
                          value={newCatName}
                          onChange={(e) => {
                            setNewCatName(e.target.value);
                            setNewCatError('');
                          }}
                          className="flex-grow bg-black/45 text-xs text-white rounded-lg border border-blue-950 px-3 py-1.5 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newCatName.trim();
                            if (!trimmed) {
                              setNewCatError('Please enter a name first');
                              return;
                            }
                            const dup = categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
                            if (dup) {
                              setNewCatError('Category already exists');
                              return;
                            }
                            onAddCategory(trimmed);
                            setCategory(trimmed);
                            setNewCatName('');
                            setShowNewCategoryInput(false);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Create
                        </button>
                      </div>
                      {newCatError && <span className="text-[10px] text-red-400 font-sans block">{newCatError}</span>}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div id="form-group-description">
                  <label htmlFor="description" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                    Description / Vendor *
                  </label>
                  <input
                    id="description"
                    type="text"
                    placeholder="e.g. Bulk Acrylic Supplies Co."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full bg-black/30 border text-sm text-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-1 transition-all ${
                      errors.description 
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                        : 'border-[#1e3a8a]/50 focus:border-[#4169E1] focus:ring-[#4169E1]'
                    }`}
                  />
                  {errors.description && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 font-sans">
                      <AlertCircle size={12} />
                      <span>{errors.description}</span>
                    </p>
                  )}
                </div>

                {/* Amount & Date - Row split */}
                <div id="form-group-expense-row-split" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div>
                    <label htmlFor="expense-amount" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                      Amount (USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">$</span>
                      <input
                        id="expense-amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full bg-black/30 border text-sm text-white rounded-lg pl-8 pr-3.5 py-2.5 focus:outline-none focus:ring-1 transition-all ${
                          errors.amount 
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                            : 'border-[#1e3a8a]/50 focus:border-[#4169E1] focus:ring-[#4169E1]'
                        }`}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 font-sans">
                        <AlertCircle size={12} />
                        <span>{errors.amount}</span>
                      </p>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <label htmlFor="expense-date" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                      Transaction Date *
                    </label>
                    <input
                      id="expense-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`w-full bg-black/30 border text-sm text-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-1 transition-all ${
                        errors.date 
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                          : 'border-[#1e3a8a]/50 focus:border-[#4169E1] focus:ring-[#4169E1]'
                      }`}
                    />
                    {errors.date && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 font-sans">
                        <AlertCircle size={12} />
                        <span>{errors.date}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Buttons */}
                <div id="expense-form-actions" className="flex justify-end gap-3 pt-4 border-t border-[#1e3a8a]/50">
                  <button
                    id="log-expense-cancel-btn"
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-transparent hover:bg-white/5 rounded-lg transition-colors border border-transparent cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    id="log-expense-submit-btn"
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a8a] hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-500/15 cursor-pointer font-bold"
                  >
                    {editingExpenseRecord ? 'Save Changes' : 'Log Expense'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
