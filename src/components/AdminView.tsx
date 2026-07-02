/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Admin management panel for managing registered user accounts and their associated ledgers.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit2, 
  Key, 
  Search, 
  ShieldCheck, 
  RefreshCw, 
  Database, 
  ShoppingCart, 
  Receipt,
  Eye,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';

interface ManagedUser {
  email: string;
  pass: string;
  role: 'user' | 'admin';
  ordersCount: number;
  expensesCount: number;
}

interface AdminViewProps {
  onImpersonate: (email: string) => void;
  currentImpersonated: string | null;
  onStopImpersonating: () => void;
}

export default function AdminView({ 
  onImpersonate, 
  currentImpersonated, 
  onStopImpersonating 
}: AdminViewProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Unconfirmed user deletion target
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Editing state variables
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState('');
  const [editingRole, setEditingRole] = useState<'user' | 'admin'>('user');

  // Creating state variables
  const [isCreating, setIsCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  const getApiUrl = (uri: string) => {
    const base = window.location.origin.startsWith('file')
      ? 'https://ais-pre-kq7h26ybpbrky3vdwgvm3b-764316122301.us-east1.run.app'
      : '';
    return `${base}${uri}`;
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl('/api/admin/users'));
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        throw new Error('Failed to retrieve user accounts database.');
      }
    } catch (err: any) {
      console.info('Backend off-line or inactive, building offline fallback list', err);
      // Fallback: fetch from LocalStorage registered users
      const storedUsers = localStorage.getItem('ops_hub_registered_users_v2');
      if (storedUsers) {
        try {
          const parsed = JSON.parse(storedUsers);
          const formatted: ManagedUser[] = parsed.map((u: any) => {
            // Count from local storage of individual accounts
            let oCount = 0;
            let eCount = 0;
            try {
              const ordersStr = localStorage.getItem(`ops_hub_orders_v1_${u.email}`);
              if (ordersStr) oCount = JSON.parse(ordersStr).length;
            } catch {}
            try {
              const expStr = localStorage.getItem(`ops_hub_expenses_v1_${u.email}`);
              if (expStr) eCount = JSON.parse(expStr).length;
            } catch {}

            return {
              email: u.email,
              pass: u.pass,
              role: u.role || 'user',
              ordersCount: oCount,
              expensesCount: eCount
            };
          });
          setUsers(formatted);
        } catch {
          setError('Failed parsing cached user database.');
        }
      } else {
        setError('Database connection error. Setup Firebase/server to persist changes permanently.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentImpersonated]);

  const handleUpdateUser = async (email: string) => {
    if (!editingPassword.trim()) {
      setError('Password cannot be empty.');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/admin/users/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass: editingPassword, role: editingRole })
      });

      if (res.ok) {
        setSuccessMsg(`User account ${email} updated successfully!`);
        setEditingEmail(null);
        fetchUsers();
        // Clear success message shortly after
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const d = await res.json();
        throw new Error(d.error || 'Update failed');
      }
    } catch (err: any) {
      // Local check fallback
      const storedUsers = localStorage.getItem('ops_hub_registered_users_v2');
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        const idx = parsed.findIndex((u: any) => u.email === email);
        if (idx !== -1) {
          parsed[idx].pass = editingPassword;
          parsed[idx].role = editingRole;
          localStorage.setItem('ops_hub_registered_users_v2', JSON.stringify(parsed));
          setSuccessMsg(`User ${email} updated in local storage database cache.`);
          setEditingEmail(null);
          fetchUsers();
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      } else {
        setError(err.message || 'Error executing modification on user.');
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedEmail = newEmail.trim().toLowerCase();
    if (!formattedEmail || !newPassword) {
      setError('Provide both username/email and a password.');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/admin/users/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formattedEmail, pass: newPassword, role: newRole })
      });

      if (res.ok) {
        setSuccessMsg(`Account ${formattedEmail} created registered successfully!`);
        setNewEmail('');
        setNewPassword('');
        setNewRole('user');
        setIsCreating(false);
        fetchUsers();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const d = await res.json();
        throw new Error(d.error || 'Create accounts error.');
      }
    } catch (err: any) {
      // Local fallback
      const storedUsers = localStorage.getItem('ops_hub_registered_users_v2') || '[]';
      const parsed = JSON.parse(storedUsers);
      const exists = parsed.some((u: any) => u.email === formattedEmail);
      if (exists) {
        setError('User account email is already registered locally.');
        return;
      }

      parsed.push({ email: formattedEmail, pass: newPassword, role: newRole });
      localStorage.setItem('ops_hub_registered_users_v2', JSON.stringify(parsed));
      setSuccessMsg(`Account ${formattedEmail} registered in local storage cache.`);
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setIsCreating(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email === 'admin') {
      setError('Cannot delete root administrator credentials account.');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/admin/users/delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        setSuccessMsg(`Account ${email} has been deleted.`);
        if (currentImpersonated === email) {
          onStopImpersonating();
        }
        setUserToDelete(null);
        fetchUsers();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed.');
      }
    } catch (err: any) {
      // Offline fallback deletion
      const storedUsers = localStorage.getItem('ops_hub_registered_users_v2');
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        const filtered = parsed.filter((u: any) => u.email !== email);
        localStorage.setItem('ops_hub_registered_users_v2', JSON.stringify(filtered));
        setSuccessMsg(`Account ${email} deleted from offline cache file.`);
        if (currentImpersonated === email) {
          onStopImpersonating();
        }
        setUserToDelete(null);
        fetchUsers();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(err.message || 'Deletion execution failed.');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="admin-management-container" className="space-y-6">
      
      {/* View Header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <ShieldCheck size={24} className="text-[#4169E1]" />
            <span>Administrator Control Hub</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Review workspace registries, update passwords, and manage transaction logs for active devices.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1e3a8a] hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Register Account</span>
          </button>
          
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center justify-center p-2 rounded-lg border border-[#222] hover:bg-[#111] text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh accounts directory"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Dynamic Success message alert */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-green-950/40 border border-green-500/30 text-green-400 rounded-xl text-xs flex items-center gap-2"
        >
          <Check size={14} className="text-green-400" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Dynamic Error message alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2"
        >
          <AlertTriangle size={14} className="text-rose-400" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 ml-auto text-rose-400 hover:text-white">
            <X size={12} />
          </button>
        </motion.div>
      )}

      {/* Impersonation active banner indicator */}
      {currentImpersonated && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <div className="p-1 px-1.5 bg-yellow-500/20 text-yellow-500 rounded text-[10px] font-bold font-mono uppercase tracking-wider mt-0.5">
              ACTIVE IMPERSONATION
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Viewing and editing account details for <span className="text-yellow-400 font-mono font-bold">{currentImpersonated}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                All dashboards, order actions, and expense adjustments will execute in the name of this user.
              </p>
            </div>
          </div>
          <button
            onClick={onStopImpersonating}
            className="px-3.5 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold rounded-lg text-xs transition-colors self-start cursor-pointer"
          >
            Stop Managing Ledger
          </button>
        </div>
      )}

      {/* Registration popup modal overlay */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-[#0a0a0a] border border-[#222] rounded-2xl shadow-2xl p-6 relative"
          >
            <div className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer" onClick={() => setIsCreating(false)}>
              <X size={18} />
            </div>

            <div className="mb-4">
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <UserPlus size={18} className="text-[#4169E1]" />
                <span>Register Account Credentials</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Create a secure ledger account for a client or operator device.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1 font-mono">
                  Username / Email
                </label>
                <input
                  type="text"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. operator@hub.com"
                  className="w-full bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1 font-mono">
                  Security Passkey
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1 font-mono">
                  System Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                  className="w-full bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#4169E1]"
                >
                  <option value="user">User / Operator Ledger</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 rounded-lg border border-[#222] hover:bg-[#111] text-xs font-semibold text-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#1e3a8a] hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Main accounts search, summary counters grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Statistics highlights components */}
        <div className="bg-[#0f172a]/30 border border-[#1e3a8a]/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-blue-400 tracking-wide block uppercase">TOTAL ACCOUNTS</span>
            <span className="text-xl font-bold text-white mt-1 block">
              {users.length}
            </span>
          </div>
          <div className="p-3 bg-[#1e3a8a]/10 border border-[#1e3a8a]/30 rounded-xl text-[#4169E1]">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-[#0f172a]/30 border border-[#1e3a8a]/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-green-400 tracking-wide block uppercase">ACTIVE SALES RECORDS</span>
            <span className="text-xl font-bold text-white mt-1 block font-mono">
              {users.reduce((sum, u) => sum + u.ordersCount, 0)}
            </span>
          </div>
          <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl text-green-400">
            <ShoppingCart size={20} />
          </div>
        </div>

        <div className="bg-[#0f172a]/30 border border-[#1e3a8a]/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-rose-400 tracking-wide block uppercase">OVERHEAD LOGS</span>
            <span className="text-xl font-bold text-white mt-1 block font-mono">
              {users.reduce((sum, u) => sum + u.expensesCount, 0)}
            </span>
          </div>
          <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-400">
            <Receipt size={20} />
          </div>
        </div>
      </div>

      {/* User listings layout table card */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-xl overflow-hidden shadow-xl">
        {/* Header toolbar searches bar */}
        <div className="p-4 border-b border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0a0a]">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search user email or system role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] transition-all"
            />
          </div>
          <span className="text-[10px] font-mono text-gray-500 uppercase">
            ● DATABASE STORAGE TYPE: STATIC SERVER FILE
          </span>
        </div>

        {/* Directory Listing display table */}
        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              {isLoading ? 'Retrieving database table records...' : 'No accounts match the current query.'}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111] border-b border-[#222] text-gray-400 font-mono text-[10px] uppercase font-semibold">
                <tr>
                  <th className="p-4">User Email / Account</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status & Ledger Size</th>
                  <th className="p-4">Cred Passkey</th>
                  <th className="p-4 text-right">System Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredUsers.map((u) => {
                  const isSelfEditing = editingEmail === u.email;
                  const isManaged = currentImpersonated === u.email;
                  
                  return (
                    <tr 
                      key={u.email} 
                      className={`hover:bg-[#111]/30 transition-colors ${
                        isManaged ? 'bg-yellow-500/5 border-l-2 border-l-yellow-500' : ''
                      }`}
                    >
                      {/* Email/Login */}
                      <td className="p-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="truncate" title={u.email}>{u.email}</span>
                          {u.email === 'admin' && (
                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 rounded text-[9px] uppercase font-mono tracking-wider">
                              KEY ACCOUNT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Tag badge */}
                      <td className="p-4">
                        {isSelfEditing ? (
                          <select
                            value={editingRole}
                            disabled={u.email === 'admin'}
                            onChange={(e) => setEditingRole(e.target.value as 'user' | 'admin')}
                            className="bg-[#111] border border-[#222] rounded p-1 text-[11px] text-white focus:outline-none"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            u.role === 'admin' 
                              ? 'bg-[#1e3a8a]/40 text-blue-300 border border-blue-500/20' 
                              : 'bg-gray-800 text-gray-300'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        )}
                      </td>

                      {/* Statistics counts and sync state */}
                      <td className="p-4 text-gray-400 font-sans">
                        <div className="flex items-center gap-3 font-mono text-[10px]">
                          <span className="flex items-center gap-1 text-gray-300">
                            <ShoppingCart size={11} className="text-gray-500" />
                            <strong>{u.ordersCount}</strong> sales
                          </span>
                          <span className="text-gray-600">|</span>
                          <span className="flex items-center gap-1 text-gray-300">
                            <Receipt size={11} className="text-gray-500" />
                            <strong>{u.expensesCount}</strong> costs
                          </span>
                        </div>
                      </td>

                      {/* Password check modification */}
                      <td className="p-4 font-mono text-gray-400">
                        {isSelfEditing ? (
                          <input
                            type="text"
                            value={editingPassword}
                            onChange={(e) => setEditingPassword(e.target.value)}
                            className="bg-[#111] border border-[#222] rounded px-2 py-1 text-xs text-white placeholder-gray-500 font-mono w-28 focus:outline-none focus:border-[#4169E1]"
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <Key size={11} className="text-gray-600" />
                            <span className="tracking-wide text-gray-300">{u.pass}</span>
                          </div>
                        )}
                      </td>

                      {/* Admin operational control mechanisms */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSelfEditing ? (
                            <>
                              <button
                                onClick={() => handleUpdateUser(u.email)}
                                className="p-1 px-2.5 bg-green-950 text-green-400 hover:bg-green-900 border border-green-500/20 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingEmail(null)}
                                className="p-1 px-2.5 bg-gray-900 text-gray-400 hover:bg-gray-800 border border-[#222] rounded font-semibold text-[10px] transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Manage Ledger impersonator controller */}
                              {u.email !== 'admin' && (
                                <button
                                  onClick={() => isManaged ? onStopImpersonating() : onImpersonate(u.email)}
                                  className={`p-1 px-2 rounded col-span-1 border transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                                    isManaged
                                      ? 'bg-yellow-600 border-yellow-700 text-black hover:bg-yellow-500'
                                      : 'bg-black text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/10 hover:border-yellow-500/40'
                                  }`}
                                  title={isManaged ? 'Stop impersonating this user' : 'Enter user dashboard session to view/write ledger log details'}
                                >
                                  <Eye size={12} />
                                  <span>{isManaged ? 'Active Managed' : 'Manage Ledger'}</span>
                                </button>
                              )}

                              {/* Edit Credentials button */}
                              <button
                                onClick={() => {
                                  setEditingEmail(u.email);
                                  setEditingPassword(u.pass);
                                  setEditingRole(u.role);
                                  setError('');
                                }}
                                className="p-1.5 bg-black border border-[#222] hover:bg-[#111] text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                                title="Edit user password or role"
                              >
                                <Edit2 size={12} />
                              </button>

                              {/* Delete account */}
                              {u.email !== 'admin' && (
                                userToDelete === u.email ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDeleteUser(u.email)}
                                      className="p-1 px-2 bg-rose-900 border border-rose-500 hover:bg-rose-800 text-white text-[9px] uppercase font-mono font-bold rounded transition-colors cursor-pointer"
                                      title="Confirm delete account"
                                    >
                                      CONFIRM
                                    </button>
                                    <button
                                      onClick={() => setUserToDelete(null)}
                                      className="p-1 px-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-gray-300 text-[9px] uppercase font-mono font-bold rounded transition-colors cursor-pointer"
                                      title="Cancel"
                                    >
                                      X
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setUserToDelete(u.email)}
                                    className="p-1.5 bg-black border border-[#222] hover:bg-red-950/20 text-gray-400 hover:text-red-400 rounded hover:border-red-500/25 transition-colors cursor-pointer"
                                    title="Permanently remove user"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  );
}
