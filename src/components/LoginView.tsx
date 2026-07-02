/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  UserPlus,
  ArrowLeft
} from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, role: 'user' | 'admin') => void;
  defaultEmail?: string;
}

interface UserAccount {
  email: string;
  pass: string;
  role?: 'user' | 'admin';
}

const STORAGE_USERS_KEY = 'ops_hub_registered_users_v2';

export default function LoginView({ onLogin, defaultEmail = '' }: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Pre-fill default email on login view if specified
  useEffect(() => {
    if (defaultEmail && !isSignUp) {
      setEmail(defaultEmail);
    } else {
      setEmail('');
    }
    setPassword('');
    setConfirmPassword('');
    setError('');
  }, [isSignUp, defaultEmail]);

  // Load or seed users list
  const getRegisteredUsers = (): UserAccount[] => {
    try {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error fetching registered users list', e);
    }

    // Default seeded users to make sure active email works instantly
    const seed = [
      { email: 'gs3dprintingandlaserengraving@gmail.com', pass: 'admin123', role: 'user' as const },
      { email: 'operator@salestrackpro.io', pass: 'operator99', role: 'user' as const },
      { email: 'admin', pass: 'admin', role: 'admin' as const }
    ];
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(seed));
    } catch {}
    return seed;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedEmail = email.trim().toLowerCase();
    
    // Custom Validations
    if (!formattedEmail) {
      setError('Please provide an email address or username.');
      return;
    }
    if (!isSignUp && formattedEmail !== 'admin' && !formattedEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (isSignUp && !formattedEmail.includes('@')) {
      setError('A valid email address is required for registration.');
      return;
    }
    if (!password) {
      setError('Please input your password.');
      return;
    }

    setIsLoading(true);

    const getApiUrl = (uri: string) => {
      const base = window.location.origin.startsWith('file')
        ? 'https://ais-pre-kq7h26ybpbrky3vdwgvm3b-764316122301.us-east1.run.app'
        : '';
      return `${base}${uri}`;
    };

    if (isSignUp) {
      // Sign Up Mode Logic
      if (password.length < 6) {
        setIsLoading(false);
        setError('Security password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setIsLoading(false);
        setError('Confirmation password does not match original passkey.');
        return;
      }

      try {
        const response = await fetch(getApiUrl('/api/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formattedEmail, password })
        });
        
        if (response.ok) {
          setIsLoading(false);
          setSuccessMessage('Registration Complete! Setting up secure account workspace...');
          setSuccess(true);
          setTimeout(() => {
            onLogin(formattedEmail, 'user');
          }, 800);
          return;
        } else {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Server registration error');
        }
      } catch (err: any) {
        console.info('Registration server inactive or offline, falling back to local cache', err);
        // Fallback to offline registration
        setTimeout(() => {
          const users = getRegisteredUsers();
          const exists = users.some(u => u.email === formattedEmail);

          if (exists) {
            setIsLoading(false);
            setError('An account with this email/login is already registered.');
            return;
          }

          // Add new user account
          const updatedUsers = [...users, { email: formattedEmail, pass: password, role: 'user' as const }];
          try {
            localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
          } catch (e) {
            console.error('Failed to write new user records', e);
          }

          setIsLoading(false);
          setSuccessMessage('Registration Complete! (Offline Mode) Loading workspace...');
          setSuccess(true);

          setTimeout(() => {
            onLogin(formattedEmail, 'user');
          }, 800);
        }, 600);
      }

    } else {
      // Login Mode Logic
      try {
        const response = await fetch(getApiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formattedEmail, password })
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsLoading(false);
          setSuccessMessage('Authentication Confirmed! Loading cloud workspace ledger...');
          setSuccess(true);
          setTimeout(() => {
            onLogin(data.email, data.role || 'user');
          }, 800);
          return;
        } else {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Invalid credentials');
        }
      } catch (err: any) {
        console.info('Login server offline or cached setup checking local/preloaded credentials', err);
        
        // Handle special admin credential locally too if server fails or hasn't started yet
        if (formattedEmail === 'admin' && password === 'admin') {
          setIsLoading(false);
          setSuccessMessage('Admin login success (Offline Override)');
          setSuccess(true);
          setTimeout(() => {
            onLogin('admin', 'admin');
          }, 800);
          return;
        }
        
        // Fallback to offline login
        setTimeout(() => {
          const users = getRegisteredUsers();
          const user = users.find(u => u.email === formattedEmail);

          if (!user) {
            setIsLoading(false);
            setError(err.message || 'No registered account was found with this email/username.');
            return;
          }

          if (user.pass !== password) {
            setIsLoading(false);
            setError('Incorrect security passkey. Please verify your credentials.');
            return;
          }

          setIsLoading(false);
          setSuccessMessage('Authentication Confirmed! (Offline Mode) Loading local ledger...');
          setSuccess(true);

          setTimeout(() => {
            onLogin(formattedEmail, (user.role as 'user' | 'admin') || 'user');
          }, 800);
        }, 600);
      }
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-[#4169E1]/30 selection:text-white">
      {/* Background ambient radial gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#1e3a8a]/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#4169E1]/5 blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md bg-[#0f172a] border border-[#1e3a8a]/50 rounded-2xl shadow-2xl p-8 relative z-10 overflow-hidden"
      >
        {/* Subtle top indicator line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1e3a8a] to-[#4169E1]" />

        {/* Brand Header */}
        <div id="login-brand-header" className="text-center mb-6">
          <div className="inline-flex p-3 bg-[#1e3a8a]/20 border border-[#4169E1]/30 rounded-xl mb-3 text-[#4169E1]">
            {isSignUp ? <UserPlus size={28} className="animate-pulse" /> : <Zap size={28} className="animate-pulse" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-display text-white">
            SalesTrack Pro
          </h1>
          <p className="text-xs text-gray-400 mt-1.5 font-sans">
            {isSignUp ? 'Create a secure workspace log record' : 'Enterprise Sales & Expense Management'}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 p-3.5 bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-start gap-2.5 font-sans"
          >
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Security Alert:</span> {error}
            </div>
          </motion.div>
        )}

        {/* Action Status Notification */}
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 flex flex-col items-center justify-center text-center space-y-3"
          >
            <div className="text-green-400 p-2.5 bg-green-500/10 border border-green-500/30 rounded-full">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-base font-bold text-white font-display">Success</h3>
            <p className="text-xs text-gray-300 max-w-[280px] font-sans">
              {successMessage}
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {/* Email Field */}
            <div id="login-group-email">
              <label htmlFor="login-email" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                Email / Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail size={16} />
                </span>
                <input
                  id="login-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="admin or name@example.com"
                  className="w-full bg-black/40 border border-[#1e3a8a]/40 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1]/20 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password Field */}
            <div id="login-group-password">
              <label htmlFor="login-password" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                {isSignUp ? 'Choose Password' : 'Security Passkey'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={isSignUp ? 'At least 6 characters' : 'Enter account passkey'}
                  className="w-full bg-black/40 border border-[#1e3a8a]/40 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1]/20 transition-all font-sans"
                />
                <button
                  id="login-toggle-password-visibility"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {isSignUp && (
              <motion.div
                id="login-group-confirm-password"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label htmlFor="login-confirm-password" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Lock size={16} />
                  </span>
                  <input
                    id="login-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Verify chosen passkey"
                    className="w-full bg-black/40 border border-[#1e3a8a]/40 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1]/20 transition-all font-sans"
                  />
                </div>
              </motion.div>
            )}

            {/* Submit Action Block */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1e3a8a] hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 mt-6 active:scale-[0.98] disabled:opacity-50 font-sans"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{isSignUp ? 'Registering...' : 'Verifying Profile...'}</span>
                </div>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Workspace Account' : 'Sign In to Workspace'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Toggle Modes Control UI */}
            <div className="pt-4 border-t border-[#1e3a8a]/20 flex items-center justify-center text-xs text-gray-400 font-sans">
              {isSignUp ? (
                <button
                  id="toggle-auth-login-btn"
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 hover:underline"
                >
                  <ArrowLeft size={13} />
                  <span>Already registered? Sign in instead</span>
                </button>
              ) : (
                <button
                  id="toggle-auth-signup-btn"
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Don't have an account?</span>
                  <span className="text-[#4169E1] font-bold hover:underline">Register & Sign Up</span>
                </button>
              )}
            </div>
          </form>
        )}
      </motion.div>

      {/* Underlay Footer Info */}
      <div className="text-[10px] text-gray-600 font-mono mt-6 flex items-center gap-2">
        <span>● SECURE SSL 256-BIT</span>
        <span>•</span>
        <span>MULTI-ACCOUNT CACHE REGISTRATION</span>
      </div>
    </div>
  );
}
