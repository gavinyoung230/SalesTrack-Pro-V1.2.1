/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BarChart2, 
  ShoppingBag, 
  Receipt, 
  Grid, 
  Menu, 
  X, 
  Zap, 
  Activity,
  User,
  LogOut,
  Users,
  Layers,
  FileText
} from 'lucide-react';

export type ViewType = 'dashboard' | 'orders' | 'expenses' | 'analytics' | 'admin' | 'categories' | 'notes' | 'invoice';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (isOpen: boolean) => void;
  userEmail: string;
  role?: 'user' | 'admin';
  onLogout?: () => void;
}

export default function Sidebar({
  activeView,
  onViewChange,
  isOpenMobile,
  setIsOpenMobile,
  userEmail,
  role = 'user',
  onLogout
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: Grid },
    { id: 'orders' as ViewType, label: 'Orders & Sales', icon: ShoppingBag },
    { id: 'expenses' as ViewType, label: 'Expenses', icon: Receipt },
    { id: 'categories' as ViewType, label: 'Category Hub', icon: Layers },
    { id: 'analytics' as ViewType, label: 'Analytics', icon: BarChart2 },
    { id: 'notes' as ViewType, label: 'Notes', icon: FileText },
    { id: 'invoice' as ViewType, label: 'Invoice Maker', icon: Receipt },
  ];

  // If user is administrator, add special administrator console tab
  if (role === 'admin') {
    menuItems.push({ id: 'admin' as ViewType, label: 'User Accounts', icon: Users });
  }

  return (
    <>
      {/* Mobile Top Header (only visible on mobile, under lg responsive sizes) */}
      <header id="mobile-top-navbar" className="lg:hidden w-full bg-[#09090b] border-b border-blue-950 px-5 py-4 flex items-center justify-between z-40 fixed top-0 left-0 print:hidden">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-white tracking-tight text-sm">SalesTrack Pro</span>
        </div>
        <button
          id="mobile-menu-trigger"
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-blue-950 transition-colors cursor-pointer"
        >
          {isOpenMobile ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Backdrop cover for mobile drawer when active */}
      {isOpenMobile && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={() => setIsOpenMobile(false)}
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 print:hidden"
        />
      )}

      {/* Sidebar Navigation Panel Container (Docked left on desktop, hidden drawer on mobile) */}
      <aside
        id="sidebar-navigation-panel"
        className={`fixed top-0 bottom-0 left-0 lg:sticky h-screen bg-[#0a0a0a] border-r border-[#222] w-64 z-50 transform lg:transform-none transition-transform duration-300 flex flex-col justify-between print:hidden ${
          isOpenMobile ? 'translate-x-0 pt-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Brand Header Block */}
          <div className="p-6 border-b border-[#222] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold tracking-tight text-[#4169E1] flex items-center gap-2">
                <span className="text-lg font-sans">◈</span>
                <span className="font-display">SalesTrack Pro</span>
              </div>
            </div>
            {/* Mobile close button inside header */}
            <button
              id="mobile-sidebar-close"
              onClick={() => setIsOpenMobile(false)}
              className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-[#222] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Items Stack */}
          <nav className="p-4 space-y-1 mt-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  id={`sidebar-nav-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setIsOpenMobile(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all group cursor-pointer ${
                    isActive
                      // Active state: royal blue box with bright white text as requested!
                      ? 'bg-[#1e3a8a] text-white font-bold shadow-lg shadow-blue-900/40'
                      // Non-active state: subtle dark hover, grey text
                      : 'text-[#888] hover:text-white hover:bg-[#111]'
                  }`}
                >
                  <Icon 
                    size={18} 
                    className={`transition-colors flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-400'
                    }`} 
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Brand ownership email & status badge footer */}
        <div className="p-4 border-t border-[#222] space-y-3 bg-[#0a0a0a]">
          <div className="bg-[#111111] border border-[#222] p-3 rounded-xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#1e3a8a]/40 rounded-lg text-[#4169E1] flex-shrink-0">
                <User size={16} />
              </div>
              <div className="overflow-hidden flex-1">
                <span className="text-[9px] font-bold text-[#4169E1] font-mono tracking-wide uppercase block">USER SESSION</span>
                <span title={userEmail} className="text-xs font-semibold text-gray-300 block truncate leading-tight font-sans">
                  {userEmail || 'operator@salestrackpro.io'}
                </span>
              </div>
            </div>
            {onLogout && (
              <button
                id="sidebar-logout-button"
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-bold bg-[#1e3a8a]/10 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-[#222] hover:border-red-500/20 transition-all cursor-pointer"
              >
                <LogOut size={12} />
                <span>Sign Out Session</span>
              </button>
            )}
          </div>

          {/* Console status marker */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4169E1] animate-pulse"></div>
              <span>SECURE PROTOCOL</span>
            </div>
            <span>V1.2.1</span>
          </div>
        </div>
      </aside>
    </>
  );
}
