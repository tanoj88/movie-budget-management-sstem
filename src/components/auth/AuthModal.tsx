import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ open, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (mode === 'register' && name.trim().length < 2) {
      next.name = 'Full name must be at least 2 characters.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      if (mode === 'login') {
        const user = await login(email.trim(), password);
        showToast(`Signed in as ${user.name} (${user.role})`, 'success');
      } else {
        const user = await register(name.trim(), email.trim(), password);
        showToast(`Welcome, ${user.name}. Account created.`, 'success');
      }
      onClose();
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'login' ? 'Sign In to Studio Ledger' : 'Create Studio Account'}
      subtitle={
        mode === 'login'
          ? 'Authenticate to manage budgets, collections, or publish reviews.'
          : 'New accounts receive User access to browse reports and submit film reviews.'
      }
      maxWidth="max-w-md"
    >
      <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 mb-5">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setErrors({});
          }}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            mode === 'login'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setErrors({});
          }}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            mode === 'register'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Register
        </button>
      </div>

      {errors.form && (
        <div className="mb-4 px-3.5 py-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 text-sm text-red-700 dark:text-red-300">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mode === 'register' && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@studiopulse.com"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {submitting
            ? mode === 'login'
              ? 'Signing In...'
              : 'Creating Account...'
            : mode === 'login'
            ? 'Sign In'
            : 'Create Account'}
        </button>
      </form>

      {mode === 'login' && (
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
            Quick-fill demo credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin@studiopulse.com', 'Admin@123')}
              className="px-3 py-2 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Admin</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                admin@studiopulse.com
              </div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('producer@studiopulse.com', 'User@123')}
              className="px-3 py-2 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">User</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                producer@studiopulse.com
              </div>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
