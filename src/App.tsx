/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, setDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { INITIAL_ORDERS, INITIAL_EXPENSES } from './mockData';
import { Order, Expense, OrderStatus } from './types';
import Sidebar, { ViewType } from './components/Sidebar';
import DashboardView from './components/DashboardView';
import OrdersView from './components/OrdersView';
import ExpensesView from './components/ExpensesView';
import AnalyticsView from './components/AnalyticsView';
import LoginView from './components/LoginView';
import AdminView from './components/AdminView';
import CategoriesView from './components/CategoriesView';
import NotesView from './components/NotesView';
import InvoiceMakerView from './components/InvoiceMakerView';

// Local storage persistent keys
const ORDERS_STORAGE_KEY = 'ops_hub_orders_v1';
const EXPENSES_STORAGE_KEY = 'ops_hub_expenses_v1';

export default function App() {
  // Login authentication session state
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ops_hub_auth_email_v1') || null;
    } catch {
      return null;
    }
  });

  const [userRole, setUserRole] = useState<'user' | 'admin'>(() => {
    try {
      return (localStorage.getItem('ops_hub_auth_role_v1') as 'user' | 'admin') || 'user';
    } catch {
      return 'user';
    }
  });

  // Client Impersonation managed target
  const [managedUserEmail, setManagedUserEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ops_hub_managed_email_v1') || null;
    } catch {
      return null;
    }
  });

  const activeEmail = managedUserEmail || currentUserEmail;

  // Navigation active view states
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [invoiceSelectedOrderIds, setInvoiceSelectedOrderIds] = useState<string[]>([]);

  // Core Data Lists
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Custom Category State
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  // Load and merge custom categories
  useEffect(() => {
    if (!activeEmail) return;
    try {
      const stored = localStorage.getItem(`ops_hub_custom_categories_v1_${activeEmail}`);
      const storedColors = localStorage.getItem(`ops_hub_category_colors_v1_${activeEmail}`);
      let cats: string[] = [];
      let cols: Record<string, string> = {};
      
      if (stored) {
        cats = JSON.parse(stored);
      }
      if (storedColors) {
        cols = JSON.parse(storedColors);
        setCategoryColors(cols);
      }
      
      // Auto-extract any additional categories in existing orders or expenses
      const usedCats = new Set<string>();
      orders.forEach(o => { if (o.category) usedCats.add(o.category); });
      expenses.forEach(e => { if (e.category) usedCats.add(e.category); });
      
      const merged = [...cats];
      usedCats.forEach(c => {
        if (!merged.map(m => m.toLowerCase()).includes(c.toLowerCase())) {
          merged.push(c);
        }
      });
      
      // Keep state unique and ordered
      setCustomCategories(merged);
    } catch {}
  }, [activeEmail, isLoaded]);

  const handleAddCategory = async (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    
    // Normalize casing check
    const exists = customCategories.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;

    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    
    if (activeEmail) {
      try {
        localStorage.setItem(`ops_hub_custom_categories_v1_${activeEmail}`, JSON.stringify(updated));
        const userDocRef = doc(db, 'users', activeEmail);
        await setDoc(userDocRef, { email: activeEmail, customCategories: updated }, { merge: true });
      } catch (err) {
        console.info("Saving categories list checked:", err);
      }
    }
  };

  const handleUpdateCategoryColor = async (category: string, color: string) => {
    const updatedColors = { ...categoryColors, [category]: color };
    setCategoryColors(updatedColors);

    if (activeEmail) {
      try {
        localStorage.setItem(`ops_hub_category_colors_v1_${activeEmail}`, JSON.stringify(updatedColors));
        const userDocRef = doc(db, 'users', activeEmail);
        await setDoc(userDocRef, { email: activeEmail, categoryColors: updatedColors }, { merge: true });
      } catch (err) {
        console.error("Saving category color failed:", err);
      }
    }
  };

  // Modals visibility trigger (shared triggers so quick action can launch them)
  const [isOpenAddOrderModal, setIsOpenAddOrderModal] = useState(false);
  const [isOpenAddExpenseModal, setIsOpenAddExpenseModal] = useState(false);

  // Custom User Email parameter from workspace config (fallback if absent)
  const userEmail = 'gs3dprintingandlaserengraving@gmail.com';

  const getApiUrl = (uri: string) => {
    const base = window.location.origin.startsWith('file')
      ? 'https://ais-pre-kq7h26ybpbrky3vdwgvm3b-764316122301.us-east1.run.app'
      : '';
    return `${base}${uri}`;
  };

  const handleLogin = (email: string, role: 'user' | 'admin' = 'user') => {
    setCurrentUserEmail(email);
    setUserRole(role);
    setManagedUserEmail(null);
    try {
      localStorage.setItem('ops_hub_auth_email_v1', email);
      localStorage.setItem('ops_hub_auth_role_v1', role);
      localStorage.removeItem('ops_hub_managed_email_v1');
    } catch (e) {
      console.error('Failed caching log in session', e);
    }
    
    // Switch default active view based on logged in role
    if (role === 'admin') {
      setActiveView('admin');
    } else {
      setActiveView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUserEmail(null);
    setUserRole('user');
    setManagedUserEmail(null);
    try {
      localStorage.removeItem('ops_hub_auth_email_v1');
      localStorage.removeItem('ops_hub_auth_role_v1');
      localStorage.removeItem('ops_hub_managed_email_v1');
    } catch (e) {
      console.error('Failed purging log in session', e);
    }
  };

  const handleSetImpersonatedUser = (email: string | null) => {
    setManagedUserEmail(email);
    try {
      if (email) {
        localStorage.setItem('ops_hub_managed_email_v1', email);
      } else {
        localStorage.removeItem('ops_hub_managed_email_v1');
      }
    } catch {}
  };

  // Anonymous Firebase Sign In on Mount (Optional override)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Firebase authenticated with UID:", user.uid);
      } else {
        signInAnonymously(auth).catch(err => {
          console.info("Firebase Auth is inactive or restricted on this project (traditional for offline impersonated session workspaces):", err.message || err);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Load from database (Express server or local persistence) on user email change
  useEffect(() => {
    if (!activeEmail) {
      setOrders([]);
      setExpenses([]);
      setIsLoaded(false);
      return;
    }

    // 1. Instantly load from local storage cache so there is NO latency or empty screens!
    let locallyCachedO: Order[] = [];
    let locallyCachedE: Expense[] = [];
    let hasLocalCache = false;

    try {
      const localOrdersStr = localStorage.getItem(`${ORDERS_STORAGE_KEY}_${activeEmail}`);
      const localExpensesStr = localStorage.getItem(`${EXPENSES_STORAGE_KEY}_${activeEmail}`);
      if (localOrdersStr !== null || localExpensesStr !== null) {
        locallyCachedO = localOrdersStr ? JSON.parse(localOrdersStr) : [];
        locallyCachedE = localExpensesStr ? JSON.parse(localExpensesStr) : [];
        hasLocalCache = true;
      }
    } catch (e) {
      console.log("Local storage cache not available/empty yet:", e);
    }

    if (hasLocalCache) {
      setOrders(locallyCachedO);
      setExpenses(locallyCachedE);
    } else {
      setOrders(INITIAL_ORDERS);
      setExpenses(INITIAL_EXPENSES);
    }
    
    setIsLoaded(true); // Treat it as loaded instantly so they can work!

    // 2. Set up Firestore Real-time synchronization
    const ordersColRef = collection(db, 'users', activeEmail, 'orders');
    const expensesColRef = collection(db, 'users', activeEmail, 'expenses');
    const userDocRef = doc(db, 'users', activeEmail);

    let isInitialLoad = true;

    // Listen to orders
    const unsubOrders = onSnapshot(ordersColRef, (snapshot) => {
      const fbOrders: Order[] = [];
      snapshot.forEach(docSnap => {
        fbOrders.push(docSnap.data() as Order);
      });

      if (fbOrders.length > 0) {
        setOrders(fbOrders);
        localStorage.setItem(`${ORDERS_STORAGE_KEY}_${activeEmail}`, JSON.stringify(fbOrders));
      } else if (isInitialLoad) {
        // If empty in cloud, upload what we have in local storage / default seeds
        const initialO = hasLocalCache ? locallyCachedO : INITIAL_ORDERS;
        initialO.forEach(async (order) => {
          try {
            await setDoc(doc(db, 'users', activeEmail, 'orders', order.id), order);
          } catch (e) {
            console.error("Failed seeding order to Firestore:", e);
          }
        });
      }
      isInitialLoad = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${activeEmail}/orders`);
    });

    // Listen to expenses
    const unsubExpenses = onSnapshot(expensesColRef, (snapshot) => {
      const fbExpenses: Expense[] = [];
      snapshot.forEach(docSnap => {
        fbExpenses.push(docSnap.data() as Expense);
      });

      if (fbExpenses.length > 0) {
        setExpenses(fbExpenses);
        localStorage.setItem(`${EXPENSES_STORAGE_KEY}_${activeEmail}`, JSON.stringify(fbExpenses));
      } else if (isInitialLoad) {
        const initialE = hasLocalCache ? locallyCachedE : INITIAL_EXPENSES;
        initialE.forEach(async (expense) => {
          try {
            await setDoc(doc(db, 'users', activeEmail, 'expenses', expense.id), expense);
          } catch (e) {
            console.error("Failed seeding expense to Firestore:", e);
          }
        });
      }
      isInitialLoad = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${activeEmail}/expenses`);
    });

    // Listen to user metadata (e.g. custom categories and colors)
    const unsubUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.customCategories && Array.isArray(data.customCategories)) {
          setCustomCategories(data.customCategories);
          localStorage.setItem(`ops_hub_custom_categories_v1_${activeEmail}`, JSON.stringify(data.customCategories));
        }
        if (data.categoryColors && typeof data.categoryColors === 'object') {
          setCategoryColors(data.categoryColors);
          localStorage.setItem(`ops_hub_category_colors_v1_${activeEmail}`, JSON.stringify(data.categoryColors));
        }
      } else if (isInitialLoad) {
        // Create user document if it doesn't exist
        setDoc(userDocRef, { email: activeEmail, customCategories: [], categoryColors: {} }, { merge: true })
          .catch(err => console.log("User document setup in Firestore initialized", err));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${activeEmail}`);
    });

    return () => {
      unsubOrders();
      unsubExpenses();
      unsubUser();
    };
  }, [activeEmail]);

  // Synchronize values to local storage cache back up after changes
  useEffect(() => {
    if (isLoaded && activeEmail) {
      localStorage.setItem(`${ORDERS_STORAGE_KEY}_${activeEmail}`, JSON.stringify(orders));
      localStorage.setItem(`${EXPENSES_STORAGE_KEY}_${activeEmail}`, JSON.stringify(expenses));
    }
  }, [orders, expenses, isLoaded, activeEmail]);

  // ID generator utilities
  const generateOrderId = (currentOrders: Order[]) => {
    const ids = currentOrders.map(o => {
      const parts = o.id.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        return isNaN(num) ? 1000 : num;
      }
      return 1000;
    });
    const max = Math.max(...ids, 1000);
    return `ORD-${max + 1}`;
  };

  const generateExpenseId = (currentExpenses: Expense[]) => {
    const ids = currentExpenses.map(e => {
      const parts = e.id.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        return isNaN(num) ? 1000 : num;
      }
      return 1000;
    });
    const max = Math.max(...ids, 1000);
    return `EXP-${max + 1}`;
  };

  // State manipulation handlers
  const handleAddOrder = async (newOrderData: Omit<Order, 'id'>) => {
    const nextId = generateOrderId(orders);
    const completedOrder: Order = {
      id: nextId,
      ...newOrderData
    };
    setOrders(prev => {
      const updated = [completedOrder, ...prev];
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        await setDoc(doc(db, 'users', activeEmail, 'orders', nextId), completedOrder);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/orders/${nextId}`);
      }
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    setOrders(prev => {
      const updated = prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        await setDoc(doc(db, 'users', activeEmail, 'orders', updatedOrder.id), updatedOrder);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/orders/${updatedOrder.id}`);
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setOrders(prev => {
      const updated = prev.map(o => o.id === orderId ? { ...o, status } : o);
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        const orderRef = doc(db, 'users', activeEmail, 'orders', orderId);
        await setDoc(orderRef, { status }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/orders/${orderId}`);
      }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));

    if (activeEmail) {
      try {
        await deleteDoc(doc(db, 'users', activeEmail, 'orders', orderId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${activeEmail}/orders/${orderId}`);
      }
    }
  };

  const handleAddOrdersBulk = async (newOrders: Omit<Order, 'id'>[]) => {
    if (newOrders.length === 0) return;
    
    // Sort imported orders chronologically so that incrementing IDs match chronological order
    const sortedNew = [...newOrders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentMax = orders.length > 0 ? Math.max(...orders.map(o => {
      const parts = o.id.split('-');
      return parts.length === 2 ? (parseInt(parts[1], 10) || 1000) : 1000;
    })) : 1000;
    
    const prepared = sortedNew.map(o => {
      currentMax += 1;
      return {
        id: `ORD-${currentMax}`,
        ...o
      };
    });

    setOrders(prev => {
      const combined = [...prepared, ...prev];
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        const batch = writeBatch(db);
        prepared.forEach(order => {
          const ref = doc(db, 'users', activeEmail, 'orders', order.id);
          batch.set(ref, order);
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/orders/bulk`);
      }
    }
  };

  const handleAddExpense = async (newExpenseData: Omit<Expense, 'id'>) => {
    const nextId = generateExpenseId(expenses);
    const completedExpense: Expense = {
      id: nextId,
      ...newExpenseData
    };
    setExpenses(prev => {
      const updated = [completedExpense, ...prev];
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        await setDoc(doc(db, 'users', activeEmail, 'expenses', nextId), completedExpense);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/expenses/${nextId}`);
      }
    }
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    setExpenses(prev => {
      const updated = prev.map(e => e.id === updatedExpense.id ? updatedExpense : e);
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        await setDoc(doc(db, 'users', activeEmail, 'expenses', updatedExpense.id), updatedExpense);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/expenses/${updatedExpense.id}`);
      }
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));

    if (activeEmail) {
      try {
        await deleteDoc(doc(db, 'users', activeEmail, 'expenses', expenseId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${activeEmail}/expenses/${expenseId}`);
      }
    }
  };

  const handleAddExpensesBulk = async (newExpenses: Omit<Expense, 'id'>[]) => {
    if (newExpenses.length === 0) return;
    
    // Sort imported expenses chronologically so that incrementing IDs match chronological order
    const sortedNew = [...newExpenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentMax = expenses.length > 0 ? Math.max(...expenses.map(e => {
      const parts = e.id.split('-');
      return parts.length === 2 ? (parseInt(parts[1], 10) || 1000) : 1000;
    })) : 1000;

    const prepared = sortedNew.map(e => {
      currentMax += 1;
      return {
        id: `EXP-${currentMax}`,
        ...e
      };
    });

    setExpenses(prev => {
      const combined = [...prepared, ...prev];
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        const batch = writeBatch(db);
        prepared.forEach(expense => {
          const ref = doc(db, 'users', activeEmail, 'expenses', expense.id);
          batch.set(ref, expense);
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/expenses/bulk`);
      }
    }
  };

  const handleUpdateOrdersBulk = async (orderIds: string[], status?: OrderStatus, category?: string) => {
    if (orderIds.length === 0) return;
    setOrders(prev => {
      const updated = prev.map(o => {
        if (orderIds.includes(o.id)) {
          const nextOrder = { ...o };
          if (status !== undefined) nextOrder.status = status;
          if (category !== undefined) nextOrder.category = category;
          return nextOrder;
        }
        return o;
      });
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        const batch = writeBatch(db);
        orderIds.forEach(id => {
          const ref = doc(db, 'users', activeEmail, 'orders', id);
          const fieldsToUpdate: Record<string, any> = {};
          if (status !== undefined) fieldsToUpdate.status = status;
          if (category !== undefined) fieldsToUpdate.category = category;
          batch.set(ref, fieldsToUpdate, { merge: true });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/orders/bulk-update`);
      }
    }
  };

  const handleUpdateExpensesBulk = async (expenseIds: string[], category?: string) => {
    if (expenseIds.length === 0) return;
    setExpenses(prev => {
      const updated = prev.map(e => {
        if (expenseIds.includes(e.id)) {
          const nextExpense = { ...e };
          if (category !== undefined) nextExpense.category = category;
          return nextExpense;
        }
        return e;
      });
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (activeEmail) {
      try {
        const batch = writeBatch(db);
        expenseIds.forEach(id => {
          const ref = doc(db, 'users', activeEmail, 'expenses', id);
          const fieldsToUpdate: Record<string, any> = {};
          if (category !== undefined) fieldsToUpdate.category = category;
          batch.set(ref, fieldsToUpdate, { merge: true });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${activeEmail}/expenses/bulk-update`);
      }
    }
  };

  const handleNavigationChange = (view: ViewType) => {
    setActiveView(view);
    // Scroll view to top smoothly on view changes
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Router matching view rendering
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            orders={orders}
            expenses={expenses}
            onNavigate={handleNavigationChange}
            onOpenAddOrder={() => {
              handleNavigationChange('orders');
              setIsOpenAddOrderModal(true);
            }}
            onOpenAddExpense={() => {
              handleNavigationChange('expenses');
              setIsOpenAddExpenseModal(true);
            }}
          />
        );
      case 'orders':
        return (
          <OrdersView
            orders={orders}
            onAddOrder={handleAddOrder}
            onUpdateOrder={handleUpdateOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onAddOrdersBulk={handleAddOrdersBulk}
            onUpdateOrdersBulk={handleUpdateOrdersBulk}
            isOpenAddModal={isOpenAddOrderModal}
            setIsOpenAddModal={setIsOpenAddOrderModal}
            categories={customCategories}
            onAddCategory={handleAddCategory}
            categoryColors={categoryColors}
            onCreateInvoice={(orderIds) => {
              setInvoiceSelectedOrderIds(orderIds);
              handleNavigationChange('invoice');
            }}
          />
        );
      case 'expenses':
        return (
          <ExpensesView
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddExpensesBulk={handleAddExpensesBulk}
            onUpdateExpensesBulk={handleUpdateExpensesBulk}
            isOpenAddModal={isOpenAddExpenseModal}
            setIsOpenAddModal={setIsOpenAddExpenseModal}
            categories={customCategories}
            onAddCategory={handleAddCategory}
            categoryColors={categoryColors}
          />
        );
      case 'categories':
        return (
          <CategoriesView
            orders={orders}
            expenses={expenses}
            categories={customCategories}
            onAddCategory={handleAddCategory}
            categoryColors={categoryColors}
            onChangeCategoryColor={handleUpdateCategoryColor}
            onRestoreBackup={(backup) => {
              if (backup.orders) setOrders(backup.orders);
              if (backup.expenses) setExpenses(backup.expenses);
              if (backup.categories) setCustomCategories(backup.categories);
            }}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            orders={orders}
            expenses={expenses}
            categoryColors={categoryColors}
            onChangeCategoryColor={handleUpdateCategoryColor}
          />
        );
      case 'notes':
        return (
          <NotesView
            categories={customCategories}
            userEmail={activeEmail}
          />
        );
      case 'invoice':
        return (
          <InvoiceMakerView
            orders={orders}
            selectedOrderIds={invoiceSelectedOrderIds}
            onUpdateSelectedOrders={setInvoiceSelectedOrderIds}
          />
        );
      case 'admin':
        return (
          <AdminView
            onImpersonate={(email) => {
              handleSetImpersonatedUser(email);
              setActiveView('dashboard');
            }}
            currentImpersonated={managedUserEmail}
            onStopImpersonating={() => {
              handleSetImpersonatedUser(null);
            }}
          />
        );
      default:
        return <div className="text-gray-400">View not found</div>;
    }
  };

  if (!currentUserEmail) {
    return (
      <LoginView 
        onLogin={handleLogin} 
        defaultEmail="" 
      />
    );
  }

  return (
    <div id="ops-manager-app-root" className="flex flex-col lg:flex-row min-h-screen bg-black text-white font-sans selection:bg-[#4169E1]/30 selection:text-white print:bg-white print:text-black">
      
      {/* Drawer and desktop sidebar menu controller */}
      <Sidebar
        activeView={activeView}
        onViewChange={handleNavigationChange}
        isOpenMobile={isOpenMobileSidebar}
        setIsOpenMobile={setIsOpenMobileSidebar}
        userEmail={currentUserEmail}
        role={userRole}
        onLogout={handleLogout}
      />

      {/* Main Viewport Content Block */}
      <main 
        id="main-viewport" 
        className="flex-1 flex flex-col p-5 md:p-8 lg:p-10 pt-[88px] lg:pt-10 overflow-hidden w-full max-w-7xl mx-auto relative cursor-default print:p-0 print:pt-0 print:overflow-visible print:max-w-none print:w-auto"
      >
        {/* Managed user banner */}
        {managedUserEmail && (
          <div id="impersonation-active-floating-banner" className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-yellow-400 font-semibold">
              <span className="p-1 px-1.5 bg-yellow-500/15 text-yellow-400 text-[10px] font-bold font-mono uppercase tracking-wider rounded">MANAGEMENT CONNECTED</span>
              <span>Currently managing device database files logic for: <strong className="font-mono text-white text-sm ml-1">{managedUserEmail}</strong></span>
            </div>
            <button
              onClick={() => handleSetImpersonatedUser(null)}
              className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors text-[10px] uppercase cursor-pointer"
            >
              Exit session
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full flex-1 flex flex-col justify-start"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
