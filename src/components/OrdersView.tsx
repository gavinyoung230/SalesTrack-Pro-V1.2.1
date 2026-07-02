/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  Edit3,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrdersViewProps {
  orders: Order[];
  onAddOrder: (newOrder: Omit<Order, 'id'> & { category?: string }) => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onAddOrdersBulk: (newOrders: Omit<Order, 'id'>[]) => void;
  onUpdateOrdersBulk: (orderIds: string[], status?: OrderStatus, category?: string) => void;
  isOpenAddModal: boolean;
  setIsOpenAddModal: (isOpen: boolean) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
  categoryColors?: Record<string, string>;
  onCreateInvoice?: (orderIds: string[]) => void;
}

export default function OrdersView({
  orders,
  onAddOrder,
  onUpdateOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  onAddOrdersBulk,
  onUpdateOrdersBulk,
  isOpenAddModal,
  setIsOpenAddModal,
  categories,
  onAddCategory,
  categoryColors = {},
  onCreateInvoice
}: OrdersViewProps) {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Bulk selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // New Order Form state
  const [customerName, setCustomerName] = useState('');
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<OrderStatus>('Pending');
  const [category, setCategory] = useState('Uncategorized');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatError, setNewCatError] = useState('');
  const [date, setDate] = useState(() => {
    // Default to current date in PST / UTC
    return new Date().toISOString().substring(0, 10);
  });

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Direct Status Editing dropdown active state
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Active records currently edit selected
  const [editingOrderRecord, setEditingOrderRecord] = useState<Order | null>(null);

  // CSV alerts
  const [csvSuccess, setCsvSuccess] = useState('');
  const [csvError, setCsvError] = useState('');

  // Clear form helper
  const resetForm = () => {
    setCustomerName('');
    setProduct('');
    setAmount('');
    setCategory('Uncategorized');
    setShowNewCategoryInput(false);
    setNewCatName('');
    setNewCatError('');
    setStatus('Pending');
    setDate(new Date().toISOString().substring(0, 10));
    setErrors({});
  };

  const handleOpenModal = () => {
    resetForm();
    setEditingOrderRecord(null);
    setIsOpenAddModal(true);
  };

  const handleCloseModal = () => {
    setIsOpenAddModal(false);
    setEditingOrderRecord(null);
  };

  const handleEditClick = (order: Order) => {
    setEditingOrderRecord(order);
    setCustomerName(order.customerName);
    setProduct(order.product);
    setAmount(order.amount.toString());
    setStatus(order.status);
    setCategory(order.category || 'Uncategorized');
    setDate(order.date);
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
        if (!text) throw new Error('Empty file content');

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 2) {
          throw new Error('CSV file must contain a header row and at least one data row');
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
        const nameIdx = headers.findIndex(h => h.includes('customer') || h.includes('name') || h.includes('client') || h.includes('buyer'));
        const productIdx = headers.findIndex(h => h.includes('product') || h.includes('service') || h.includes('item') || h.includes('description'));
        const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('price') || h.includes('cost') || h.includes('value') || h.includes('revenue'));
        const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('created') || h.includes('time'));
        const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('type') || h.includes('tag'));
        const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('state'));

        const parsedOrders: Omit<Order, 'id'>[] = [];

        for (let j = 1; j < lines.length; j++) {
          const cells = parseRow(lines[j]);
          if (cells.length === 0 || cells.join('').trim() === '') continue;

          const cName = nameIdx !== -1 && cells[nameIdx] ? cells[nameIdx].replace(/^["']|["']$/g, '') : 'Unknown Customer';
          const prodDesc = productIdx !== -1 && cells[productIdx] ? cells[productIdx].replace(/^["']|["']$/g, '') : 'Imported Item';
          
          let parsedAmt = 0;
          if (amountIdx !== -1 && cells[amountIdx]) {
            const amtClean = cells[amountIdx].replace(/[$,]/g, '');
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

          const catName = categoryIdx !== -1 && cells[categoryIdx] ? cells[categoryIdx].replace(/^["']|["']$/g, '') : 'Uncategorized';
          
          let ost: OrderStatus = 'Pending';
          if (statusIdx !== -1 && cells[statusIdx]) {
            const stClean = cells[statusIdx].toLowerCase().replace(/^["']|["']$/g, '');
            if (stClean.includes('comp')) ost = 'Completed';
            else if (stClean.includes('canc')) ost = 'Cancelled';
          }

          parsedOrders.push({
            customerName: cName,
            product: prodDesc,
            amount: parsedAmt,
            date: parsedDate,
            category: catName,
            status: ost
          });
        }

        if (parsedOrders.length === 0) {
          throw new Error('No valid records found in the CSV file');
        }

        // Sort parsed orders by date ascending so incremental ID corresponds to chronological order
        parsedOrders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        onAddOrdersBulk(parsedOrders);
        setCsvSuccess(`Successfully imported ${parsedOrders.length} orders from CSV!`);
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
    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    } else if (customerName.trim().length < 2) {
      newErrors.customerName = 'Name must be at least 2 characters';
    }

    if (!product.trim()) {
      newErrors.product = 'Product or service description is required';
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

    if (editingOrderRecord) {
      onUpdateOrder({
        id: editingOrderRecord.id,
        customerName: customerName.trim(),
        product: product.trim(),
        amount: parseFloat(amount),
        status,
        date,
        category: category || 'Uncategorized'
      });
    } else {
      onAddOrder({
        customerName: customerName.trim(),
        product: product.trim(),
        amount: parseFloat(amount),
        status,
        date,
        category: category || 'Uncategorized'
      });
    }

    handleCloseModal();
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (order.category && order.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isAllSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all filtered orders
      setSelectedOrderIds(prev => prev.filter(id => !filteredOrders.some(fo => fo.id === id)));
    } else {
      // Select all filtered orders
      setSelectedOrderIds(prev => {
        const otherSelected = prev.filter(id => !filteredOrders.some(fo => fo.id === id));
        const filteredAllIds = filteredOrders.map(fo => fo.id);
        return [...otherSelected, ...filteredAllIds];
      });
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amt);
  };

  const renderCategoryTag = (cat: string) => {
    const customColor = categoryColors?.[cat];
    if (customColor) {
      return (
        <span 
          className="inline-block mt-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
          style={{ backgroundColor: `${customColor}40`, color: customColor, borderColor: `${customColor}60` }}
        >
          {cat}
        </span>
      );
    }
    return (
      <span className="inline-block mt-1 text-[9px] font-mono font-bold bg-[#1e3a8a]/25 text-blue-300 px-1.5 py-0.5 rounded border border-[#1e3a8a]/30">
        {cat}
      </span>
    );
  };

  return (
    <div id="orders-view-container" className="space-y-6">
      
      {/* Header section with Actions */}
      <div id="orders-header-block" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 id="orders-title" className="text-3xl font-display font-bold text-white tracking-tight">Orders & Sales</h1>
          <p id="orders-subtitle" className="text-gray-400 mt-1">Manage client records, product deliverables, and transaction statuses.</p>
        </div>
        <div id="header-action-buttons-wrap" className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* CSV File Upload Input */}
          <div className="relative">
            <input
              id="csv-orders-upload-input"
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
            <button
              id="import-csv-orders-btn"
              type="button"
              onClick={() => document.getElementById('csv-orders-upload-input')?.click()}
              className="flex items-center gap-2 bg-[#0f172a] hover:bg-[#1e3a8a]/20 border border-[#1e3a8a]/60 text-gray-300 hover:text-white font-medium px-4 py-2.5 rounded-lg transition-all active:scale-[0.98] leading-none w-full sm:w-auto justify-center cursor-pointer text-sm font-semibold h-11"
              title="Upload CSV to import orders"
            >
              <UploadCloud size={16} className="text-[#4169E1]" />
              <span>Import CSV</span>
            </button>
          </div>

          <button
            id="add-order-top-btn"
            onClick={handleOpenModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 font-medium text-white px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 leading-none w-full sm:w-auto justify-center cursor-pointer text-sm font-semibold h-11"
          >
            <Plus size={16} />
            <span>Add New Order</span>
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
      <div id="filter-search-box" className="bg-[#0f172a] border border-[#1e3a8a] p-4 rounded-[16px] flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search input field */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
            <Search size={18} />
          </span>
          <input
            id="orders-search-input"
            type="text"
            placeholder="Search by customer name, id or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/30 border border-[#1e3a8a]/50 focus:border-[#4169E1] focus:outline-none focus:ring-1 focus:ring-[#4169E1] rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition-all font-sans"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters control block */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Filter size={14} className="text-[#4169E1]" />
            <span>Filter Status:</span>
          </label>
          <div className="flex bg-black/30 border border-[#1e3a8a]/50 rounded-lg p-0.5">
            {['All', 'Pending', 'Completed', 'Cancelled'].map((statusOption) => (
              <button
                id={`status-filter-btn-${statusOption}`}
                key={statusOption}
                onClick={() => setStatusFilter(statusOption)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                  statusFilter === statusOption
                    ? 'bg-[#1e3a8a] text-white font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {statusOption}
              </button>
            ))}
          </div>
        </div>
      </div>
      {selectedOrderIds.length > 0 && (
        <div id="bulk-actions-orders-banner" className="bg-[#1e3a8a]/20 border border-[#1e3a8a] rounded-[16px] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg shadow-[#1e3a8a]/5">
          <div className="flex items-center gap-2.5">
            <span className="p-1 px-2.5 bg-blue-600 text-white font-mono text-xs font-bold rounded-lg animate-pulse">
              {selectedOrderIds.length} SELECTED
            </span>
            <span className="text-sm font-medium text-gray-200">
              Bulk update selected orders simultaneously:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Status change select */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-blue-900/50 rounded-lg p-1.5 px-3">
              <span className="text-xs text-gray-400 font-semibold font-sans">STATUS:</span>
              <button
                type="button"
                onClick={() => {
                  onUpdateOrdersBulk(selectedOrderIds, 'Completed');
                  setSelectedOrderIds([]);
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded border border-green-500/20 cursor-pointer h-7 flex items-center"
              >
                Completed
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateOrdersBulk(selectedOrderIds, 'Pending');
                  setSelectedOrderIds([]);
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/20 cursor-pointer h-7 flex items-center"
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateOrdersBulk(selectedOrderIds, 'Cancelled');
                  setSelectedOrderIds([]);
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/20 cursor-pointer h-7 flex items-center"
              >
                Cancelled
              </button>
            </div>

            {/* Category selection */}
            <div className="flex items-center bg-black/40 border border-blue-900/50 rounded-lg p-1.5 px-3">
              <span className="text-xs text-gray-400 font-semibold font-sans mr-2">CATEGORY:</span>
              <select
                id="bulk-category-select-orders"
                onChange={(e) => {
                  if (e.target.value) {
                    onUpdateOrdersBulk(selectedOrderIds, undefined, e.target.value);
                    setSelectedOrderIds([]);
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

            {/* Create Invoice */}
            <button
              onClick={() => {
                if (onCreateInvoice) {
                  onCreateInvoice(selectedOrderIds);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#4169E1] hover:bg-blue-500 text-white rounded border border-blue-400 cursor-pointer h-7"
            >
              Create Invoice
            </button>

            {/* Clear selection */}
            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-xs text-gray-400 hover:text-white underline cursor-pointer font-medium ml-1"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Orders Catalog Datatable */}
      <div id="orders-table-wrapper" className="bg-[#0f172a] border border-[#1e3a8a] rounded-[16px] overflow-hidden shadow-xl">
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
                <th className="py-4 px-6">Order ID</th>
                <th className="py-4 px-6">Customer Name</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Product / Service</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a8a]/60 text-sm font-sans text-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-500">
                    <div className="max-w-md mx-auto space-y-2">
                      <AlertCircle className="mx-auto text-blue-500/40" size={36} />
                      <p className="font-semibold text-gray-400">No matching orders found</p>
                      <p className="text-xs">Try adjusting your filters or search keywords. You can also add a new order using the button above.</p>
                      {searchTerm ? (
                        <button 
                          onClick={() => { setSearchTerm(''); setStatusFilter('All'); }}
                          className="mt-3 text-xs text-blue-400 hover:underline font-medium"
                        >
                          Clear Filter Controls
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <tr 
                      id={`order-row-${order.id}`}
                      key={order.id} 
                      className={`hover:bg-white/5 transition-colors group ${selectedOrderIds.includes(order.id) ? 'bg-[#1e3a8a]/20' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-6 text-center select-none w-12">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="rounded border-[#1e3a8a]/80 text-[#4169E1] focus:ring-blue-500 focus:ring-opacity-25 w-4 h-4 cursor-pointer accent-[#4169E1] bg-[#0a0f1d]"
                        />
                      </td>
                      {/* Order ID */}
                      <td className="py-4 px-6 font-mono font-semibold text-[#4169E1]">
                        {order.id}
                      </td>

                      {/* Customer Name */}
                      <td className="py-4 px-6 font-medium text-white">
                        {order.customerName}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-gray-400 font-mono text-xs">
                        {order.date}
                      </td>

                      {/* Product */}
                      <td className="py-4 px-6 text-gray-300">
                        <div>{order.product}</div>
                        {order.category && order.category !== 'Uncategorized' && renderCategoryTag(order.category)}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 text-right font-mono font-bold text-white">
                        {formatCurrency(order.amount)}
                      </td>

                      {/* Inline Edit Status Select */}
                      <td className="py-4 px-6 text-center select-none" style={{ minWidth: '150px' }}>
                        <div className="flex items-center justify-center gap-1.5">
                          {editingOrderId === order.id ? (
                            <div className="relative">
                              <select
                                id={`edit-status-select-${order.id}`}
                                value={order.status}
                                onChange={(e) => {
                                  onUpdateOrderStatus(order.id, e.target.value as OrderStatus);
                                  setEditingOrderId(null);
                                }}
                                onBlur={() => setEditingOrderId(null)}
                                autoFocus
                                className="bg-black border border-[#1e3a8a] text-xs rounded px-2.5 py-1 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 select-none cursor-pointer"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          ) : (
                            <button
                              id={`trigger-status-edit-${order.id}`}
                              onClick={() => setEditingOrderId(order.id)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none transition-all cursor-pointer ${
                                order.status === 'Completed' 
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20' 
                                  : order.status === 'Pending' 
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full current-bg" style={{
                                backgroundColor: order.status === 'Completed' ? '#4ade80' : order.status === 'Pending' ? '#f59e0b' : '#f43f5e'
                              }}></span>
                              <span>{order.status}</span>
                              <ChevronDown size={10} className="opacity-60" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Edit and Delete Action buttons */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            id={`edit-btn-${order.id}`}
                            onClick={() => handleEditClick(order)}
                            className="p-1 px-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs"
                            title="Edit Order"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            id={`delete-btn-${order.id}`}
                            onClick={() => {
                              onDeleteOrder(order.id);
                            }}
                            className="p-1 px-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs"
                            title="Delete Order"
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
        
        {/* Footnote instruction indicator */}
        <div className="p-4 bg-transparent border-t border-[#1e3a8a]/60 text-xs text-gray-400 flex items-center gap-2">
          <Info size={14} className="text-[#4169E1] flex-shrink-0" />
          <span>💡 <strong>ProTip:</strong> You can directly change the status of any order by clicking on its status badge in the table!</span>
        </div>
      </div>

      {/* Add New Order Modal dialog form */}
      <AnimatePresence>
        {isOpenAddModal && (
          <div id="add-order-modal-overlay" className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              id="add-order-modal-content"
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
                    {editingOrderRecord ? 'Edit Order Details' : 'Create New Order Form'}
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {editingOrderRecord ? 'Modify the selected order data. Required *' : 'Please populate all details below. Required *'}
                  </p>
                </div>
                <button
                  id="close-add-order-modal-btn"
                  onClick={handleCloseModal}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form implementation */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                
                {/* Customer Name */}
                <div id="form-group-customer-name">
                  <label htmlFor="customerName" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                    Customer Name *
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    placeholder="Enter customer name..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`w-full bg-black/30 border text-sm text-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-1 transition-all ${
                      errors.customerName 
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                        : 'border-[#1e3a8a]/50 focus:border-[#4169E1] focus:ring-[#4169E1]'
                    }`}
                  />
                  {errors.customerName && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 font-sans">
                      <AlertCircle size={12} />
                      <span>{errors.customerName}</span>
                    </p>
                  )}
                </div>

                {/* Product / Service Description */}
                <div id="form-group-product">
                  <label htmlFor="product" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                    Product or Service Description *
                  </label>
                  <input
                    id="product"
                    type="text"
                    placeholder="e.g. 3D Printed Prototype Cylinder"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className={`w-full bg-black/30 border text-sm text-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-1 transition-all ${
                      errors.product 
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                        : 'border-[#1e3a8a]/50 focus:border-[#4169E1] focus:ring-[#4169E1]'
                    }`}
                  />
                  {errors.product && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 font-sans">
                      <AlertCircle size={12} />
                      <span>{errors.product}</span>
                    </p>
                  )}
                </div>

                {/* Amount & Date - Row split */}
                <div id="form-group-row-split" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div>
                    <label htmlFor="amount" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                      Amount (USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">$</span>
                      <input
                        id="amount"
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
                    <label htmlFor="date" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                      Date *
                    </label>
                    <input
                      id="date"
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

                {/* Category Selection */}
                <div id="form-group-category" className="space-y-1">
                  <label htmlFor="category" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                    Category (Organized Under)
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
                    className="w-full bg-[#0a0f1d] border border-[#1e3a8a]/50 text-sm text-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-[#4169E1] transition-all cursor-pointer"
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

                {/* Status Selection */}
                <div id="form-group-status">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">
                    Initial Status
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Pending', 'Completed', 'Cancelled'] as OrderStatus[]).map((statusType) => (
                      <button
                        id={`form-status-selector-btn-${statusType}`}
                        key={statusType}
                        type="button"
                        onClick={() => setStatus(statusType)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          status === statusType
                            ? statusType === 'Completed'
                              ? 'bg-green-600/20 border-green-500 text-green-400'
                              : statusType === 'Pending'
                              ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                              : 'bg-rose-600/20 border-rose-500 text-rose-400'
                            : 'bg-black/30 border-[#1e3a8a]/40 text-gray-400 hover:text-white hover:border-[#4169E1]'
                        }`}
                      >
                        {statusType}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Buttons */}
                <div id="form-actions" className="flex justify-end gap-3 pt-4 border-t border-[#1e3a8a]/50">
                  <button
                    id="add-order-cancel-btn"
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-transparent hover:bg-white/5 rounded-lg transition-colors border border-transparent cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="add-order-submit-btn"
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a8a] hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-500/15 cursor-pointer font-bold"
                  >
                    {editingOrderRecord ? 'Save Changes' : 'Submit Order'}
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
