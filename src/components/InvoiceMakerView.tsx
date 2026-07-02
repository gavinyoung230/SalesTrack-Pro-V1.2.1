import React, { useState, useEffect } from 'react';
import { Upload, Printer, X, Plus, Trash2, EyeOff, Eye, ExternalLink } from 'lucide-react';
import { Order } from '../types';

interface InvoiceMakerViewProps {
  orders: Order[];
  selectedOrderIds: string[];
  onUpdateSelectedOrders?: (ids: string[]) => void;
}

export default function InvoiceMakerView({ orders, selectedOrderIds, onUpdateSelectedOrders }: InvoiceMakerViewProps) {
  const [logo, setLogo] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<{ id: string, description: string, quantity: number, price: number }[]>([]);
  const [billTo, setBillTo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!billTo && selectedOrderIds.length > 0) {
      const firstOrder = orders.find(o => o.id === selectedOrderIds[0]);
      if (firstOrder) {
        setBillTo(firstOrder.customerName);
      }
    }
  }, [selectedOrderIds, orders, billTo]);

  useEffect(() => {
    const savedLogo = localStorage.getItem('ops_hub_invoice_logo');
    if (savedLogo) {
      setLogo(savedLogo);
    }
    const savedNum = localStorage.getItem('ops_hub_last_invoice_number');
    let nextNum = 1050;
    if (savedNum) {
      nextNum = parseInt(savedNum, 10) + 1;
    }
    setInvoiceNumber(`INV-${nextNum}`);
  }, []);

  const generateInvoiceNumber = () => {
    let currentNum = 1050;
    if (invoiceNumber.startsWith('INV-')) {
      const parsed = parseInt(invoiceNumber.replace('INV-', ''), 10);
      if (!isNaN(parsed)) {
        currentNum = parsed + 1;
      }
    } else {
       const savedNum = localStorage.getItem('ops_hub_last_invoice_number');
       if (savedNum) {
          currentNum = parseInt(savedNum, 10) + 1;
       }
    }
    setInvoiceNumber(`INV-${currentNum}`);
  };

  const handleAddCustomItem = () => {
    setCustomItems([
      ...customItems,
      { id: `custom-${Date.now()}`, description: '', quantity: 1, price: 0 }
    ]);
  };

  const updateCustomItem = (id: string, field: string, value: any) => {
    setCustomItems(customItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(customItems.filter(item => item.id !== id));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogo(result);
        localStorage.setItem('ops_hub_invoice_logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    localStorage.removeItem('ops_hub_invoice_logo');
  };

  const handlePrint = () => {
    const currentNumStr = invoiceNumber.replace('INV-', '');
    const currentNum = parseInt(currentNumStr, 10);
    if (!isNaN(currentNum)) {
      localStorage.setItem('ops_hub_last_invoice_number', currentNum.toString());
    }
    window.print();
  };

  const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
  const visibleSelectedOrders = selectedOrders.filter(o => !hiddenOrderIds.includes(o.id));
  
  const subtotal = visibleSelectedOrders.reduce((sum, order) => sum + (order.amount * (quantities[order.id] || 1)), 0)
    + customItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalAmount = Math.max(0, subtotal - discount);

  const handleRemoveOrder = (id: string) => {
    if (onUpdateSelectedOrders) {
      onUpdateSelectedOrders(selectedOrderIds.filter(orderId => orderId !== id));
      setHiddenOrderIds(hiddenOrderIds.filter(hiddenId => hiddenId !== id));
    }
  };

  const toggleHideOrder = (id: string) => {
    if (hiddenOrderIds.includes(id)) {
      setHiddenOrderIds(hiddenOrderIds.filter(hiddenId => hiddenId !== id));
    } else {
      setHiddenOrderIds([...hiddenOrderIds, id]);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in print:p-0 print:bg-white print:block">
      {/* Header (No print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden bg-[#0a0a0a] border border-[#222] p-5 rounded-xl">
        <div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight">Invoice Maker</h2>
          <p className="text-sm text-gray-400 mt-1">Generate and print custom invoices from your orders.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            title="Open app in a new tab if Print is blocked"
          >
            <ExternalLink size={18} />
            Open in New Tab
          </button>
          <button
            onClick={handlePrint}
            disabled={visibleSelectedOrders.length === 0 && customItems.length === 0}
            className="flex items-center gap-2 bg-[#4169E1] hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Printer size={18} />
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
        {/* Invoice Preview */}
        <div className="lg:col-span-2 bg-white print:bg-white text-black p-8 rounded-xl shadow-sm print:shadow-none print:p-0 min-h-[60vh]">
          <div className="flex justify-between items-start mb-12">
            <div className="w-48">
              {logo ? (
                <div className="relative group">
                  <img src={logo} alt="Company Logo" className="max-w-full max-h-24 object-contain" />
                  <button
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="print:hidden h-24 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 hover:text-blue-500 transition-colors relative">
                  <Upload size={24} className="mb-2" />
                  <span className="text-xs font-medium">Upload Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              )}
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">INVOICE</h1>
              <p className="text-gray-500 font-medium text-sm mb-1">Date: {new Date().toLocaleDateString()}</p>
              <div className="text-gray-500 font-medium text-sm flex items-center justify-end gap-1">
                <span>Invoice #:</span>
                <input 
                  type="text" 
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-24 text-right print:border-none print:w-auto"
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Bill To:</h3>
            <textarea
              value={billTo}
              onChange={(e) => setBillTo(e.target.value)}
              placeholder="Customer Name / Address"
              className="w-full text-gray-800 font-medium text-lg bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded p-1 outline-none resize-none print:border-none print:p-0 print:resize-none"
              rows={3}
            />
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-800 text-left">
                <th className="py-3 text-gray-800 font-bold uppercase tracking-wider text-xs">Description</th>
                <th className="py-3 text-gray-800 font-bold uppercase tracking-wider text-xs w-24">Date</th>
                <th className="py-3 text-right text-gray-800 font-bold uppercase tracking-wider text-xs w-20">Qty</th>
                <th className="py-3 text-right text-gray-800 font-bold uppercase tracking-wider text-xs w-24">Price</th>
                <th className="py-3 text-right text-gray-800 font-bold uppercase tracking-wider text-xs w-28">Total</th>
                <th className="py-3 w-10 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {visibleSelectedOrders.map((order) => {
                const qty = quantities[order.id] || 1;
                const total = order.amount * qty;
                return (
                  <tr key={order.id} className="border-b border-gray-200 group">
                    <td className="py-4">
                      <p className="font-medium text-gray-800">{order.product}</p>
                      <p className="text-sm text-gray-500">{order.category !== 'Uncategorized' ? order.category : ''}</p>
                    </td>
                    <td className="py-4 text-gray-600 text-sm">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="py-4 text-right">
                      <input 
                        type="number" 
                        min="1" 
                        value={qty}
                        onChange={(e) => setQuantities({ ...quantities, [order.id]: parseInt(e.target.value) || 1 })}
                        className="w-16 text-right border border-transparent hover:border-gray-300 focus:border-blue-500 rounded p-1 text-sm bg-transparent outline-none print:border-none print:p-0"
                      />
                    </td>
                    <td className="py-4 text-right font-medium text-gray-800">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.amount)}
                    </td>
                    <td className="py-4 text-right font-bold text-gray-800">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
                    </td>
                    <td className="py-4 text-right print:hidden">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleHideOrder(order.id)}
                          className="text-gray-300 hover:text-blue-500"
                          title="Hide item from invoice"
                        >
                          <EyeOff size={16} />
                        </button>
                        <button 
                          onClick={() => handleRemoveOrder(order.id)}
                          className="text-gray-300 hover:text-red-500"
                          title="Remove entirely"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {hiddenOrderIds.length > 0 && (
                <tr className="print:hidden">
                  <td colSpan={6} className="py-3 text-center text-sm text-gray-400 bg-gray-50 rounded-lg">
                    {hiddenOrderIds.length} order(s) hidden from invoice. 
                    <button 
                      onClick={() => setHiddenOrderIds([])} 
                      className="ml-2 text-blue-500 hover:text-blue-600 font-medium"
                    >
                      Show all
                    </button>
                  </td>
                </tr>
              )}

              {customItems.map((item) => {
                const total = item.price * item.quantity;
                return (
                  <tr key={item.id} className="border-b border-gray-200 group">
                    <td className="py-4">
                      <input 
                        type="text" 
                        value={item.description}
                        placeholder="Item description"
                        onChange={(e) => updateCustomItem(item.id, 'description', e.target.value)}
                        className="w-full font-medium text-gray-800 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded p-1 text-sm bg-transparent outline-none print:border-none print:p-0 placeholder:text-gray-300"
                      />
                    </td>
                    <td className="py-4 text-gray-600 text-sm">-</td>
                    <td className="py-4 text-right">
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity}
                        onChange={(e) => updateCustomItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 text-right border border-transparent hover:border-gray-300 focus:border-blue-500 rounded p-1 text-sm bg-transparent outline-none print:border-none print:p-0"
                      />
                    </td>
                    <td className="py-4 text-right">
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateCustomItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-20 text-right border border-transparent hover:border-gray-300 focus:border-blue-500 rounded p-1 text-sm bg-transparent outline-none print:border-none print:p-0"
                      />
                    </td>
                    <td className="py-4 text-right font-bold text-gray-800">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
                    </td>
                    <td className="py-4 text-right print:hidden">
                      <button 
                        onClick={() => handleRemoveCustomItem(item.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {visibleSelectedOrders.length === 0 && customItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic print:hidden">
                    No items added to invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2 text-gray-600">
                <span>Subtotal:</span>
                <span>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal)}
                </span>
              </div>
              <div className="flex justify-between py-2 text-gray-600 items-center">
                <span>Discount:</span>
                <div className="flex items-center">
                  <span className="mr-1">- $</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded p-1 outline-none print:border-none print:p-0"
                  />
                </div>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-2">
                <span className="font-bold text-gray-800">Amount Due:</span>
                <span className="font-bold text-gray-800 text-xl">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Order Selector (No print) */}
        <div className="lg:col-span-1 print:hidden flex flex-col gap-4">
          <div className="bg-[#0a0a0a] border border-[#222] p-5 rounded-xl flex flex-col gap-3">
             <button
               onClick={handleAddCustomItem}
               className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
             >
               <Plus size={16} />
               Add Custom Item
             </button>
             <button
               onClick={generateInvoiceNumber}
               className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
             >
               Generate New Invoice #
             </button>
          </div>
          <div className="bg-[#0a0a0a] border border-[#222] p-5 rounded-xl flex-1 flex flex-col max-h-[80vh]">
            <h3 className="font-semibold text-white mb-4">Add Orders to Invoice</h3>
            <div className="overflow-y-auto flex-1 pr-2 space-y-2">
              {orders.filter(o => !selectedOrderIds.includes(o.id)).map(order => (
                <div key={order.id} className="p-3 bg-[#111] border border-[#222] rounded-lg hover:border-blue-500/30 transition-colors flex justify-between items-center group">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="font-medium text-sm text-white truncate">{order.product}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span>{order.customerName}</span>
                      <span>•</span>
                      <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.amount)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateSelectedOrders?.([...selectedOrderIds, order.id])}
                    className="p-1.5 bg-[#222] text-gray-300 rounded hover:bg-[#4169E1] hover:text-white transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
              {orders.filter(o => !selectedOrderIds.includes(o.id)).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No more orders available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
