import React, { useCallback, useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Plus, Pencil, Trash2, AlertTriangle, Search } from 'lucide-react';
import { budgetsApi, moviesApi } from '../services/api';
import type { Budget } from '../types';
import { formatCurrency, formatSignedCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface BudgetsPageProps {
  onSelectMovie: (movieId: number) => void;
}

export function BudgetsPage({ onSelectMovie }: BudgetsPageProps) {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [totals, setTotals] = useState({
    production: 0,
    marketing: 0,
    totalBudget: 0,
    totalCollection: 0,
  });
  const [allMovies, setAllMovies] = useState<Array<{ Movie_ID: number; Title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [movieId, setMovieId] = useState('');
  const [productionCost, setProductionCost] = useState('');
  const [marketingCost, setMarketingCost] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, mRes] = await Promise.all([budgetsApi.list(), moviesApi.listAllCompact()]);
      setBudgets(bRes.budgets);
      setTotals(bRes.totals);
      setAllMovies(mRes.movies);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const budgetedMovieIds = new Set(budgets.map((b) => b.Movie_ID));
  const availableMovies = allMovies.filter((m) => !budgetedMovieIds.has(m.Movie_ID));

  const openCreate = () => {
    if (availableMovies.length === 0) {
      showToast('Every movie in the catalog already has an assigned budget.', 'info');
      return;
    }
    setEditing(null);
    setMovieId(String(availableMovies[0].Movie_ID));
    setProductionCost('');
    setMarketingCost('');
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditing(b);
    setMovieId(String(b.Movie_ID));
    setProductionCost(String(b.Production_Cost));
    setMarketingCost(String(b.Marketing_Cost));
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const prod = Number(productionCost);
    const mkt = Number(marketingCost);
    if (!editing && !movieId) errs.movieId = 'Please select a movie.';
    if (!Number.isFinite(prod) || prod < 0 || productionCost === '') {
      errs.productionCost = 'Enter a valid non-negative production cost.';
    }
    if (!Number.isFinite(mkt) || mkt < 0 || marketingCost === '') {
      errs.marketingCost = 'Enter a valid non-negative marketing cost.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editing) {
        await budgetsApi.update(editing.Budget_ID, {
          Production_Cost: prod,
          Marketing_Cost: mkt,
        });
        showToast(`Budget updated for "${editing.Movie_Title}".`, 'success');
      } else {
        await budgetsApi.create({
          Movie_ID: Number(movieId),
          Production_Cost: prod,
          Marketing_Cost: mkt,
        });
        showToast('Movie budget created successfully.', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await budgetsApi.remove(deleteTarget.Budget_ID);
      showToast(`Deleted budget for "${deleteTarget.Movie_Title}".`, 'success');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = budgets.filter((b) =>
    (b.Movie_Title || '').toLowerCase().includes(search.trim().toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const belowBudgetList = budgets.filter((b) => b.Collection_Status === 'Below Budget');
  const exceedsBudgetList = budgets.filter((b) => b.Collection_Status === 'Exceeds Budget');

  const splitData = [
    { name: 'Production Cost', value: totals.production },
    { name: 'Marketing Cost', value: totals.marketing },
  ];

  const liveTotalPreview =
    (Number.isFinite(Number(productionCost)) ? Number(productionCost) : 0) +
    (Number.isFinite(Number(marketingCost)) ? Number(marketingCost) : 0);

  return (
    <div className="space-y-6">
      {/* Top Overview: Donut + Alerts & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-base font-display font-semibold">
            Production vs Marketing Split
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Portfolio-wide cost allocation across all budgeted releases
          </p>
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={splitData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="48%"
                  innerRadius={56}
                  outerRadius={86}
                  paddingAngle={3}
                >
                  <Cell fill="#0284c7" />
                  <Cell fill="#d97706" />
                </Pie>
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-7 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Production Total</p>
              <p className="mt-1 text-lg font-display font-bold tabular-nums">
                {formatCurrency(totals.production)}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Marketing Total</p>
              <p className="mt-1 text-lg font-display font-bold tabular-nums">
                {formatCurrency(totals.marketing)}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Combined Budget</p>
              <p className="mt-1 text-lg font-display font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {formatCurrency(totals.totalBudget)}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {belowBudgetList.length > 0 && (
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">
                    Budget Recovery Alert ({belowBudgetList.length} title
                    {belowBudgetList.length > 1 ? 's' : ''} below budget):{' '}
                  </span>
                  <span>
                    {belowBudgetList.map((b) => b.Movie_Title).join(', ')} — current theatrical
                    collections have not yet recovered allocated spend.
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {exceedsBudgetList.length}
                </strong>{' '}
                of {budgets.length} budgeted movies have exceeded their total budget in box-office
                collections.
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Budgets Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter budgets by movie..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Assign Movie Budget
            </button>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : paginated.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No budget records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Movie</th>
                  <th className="py-3 px-3 text-right">Production Cost</th>
                  <th className="py-3 px-3 text-right">Marketing Cost</th>
                  <th className="py-3 px-3 text-right">Total Budget</th>
                  <th className="py-3 px-3 text-right">Collection Earned</th>
                  <th className="py-3 px-3 text-right">Variance</th>
                  <th className="py-3 px-3 text-right">Budget Status</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((b) => (
                  <tr
                    key={b.Budget_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectMovie(b.Movie_ID)}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 text-left"
                      >
                        {b.Movie_Title}
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {b.Genre_Name || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(b.Production_Cost)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(b.Marketing_Cost)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums font-semibold">
                      {formatCurrency(b.Total_Budget)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(b.Total_Collection)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono text-xs tabular-nums font-semibold ${
                        (b.Variance || 0) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatSignedCurrency(b.Variance)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <StatusBadge status={b.Collection_Status || 'No Collections'} />
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(b)}
                            title="Edit budget"
                            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(b)}
                            title="Delete budget"
                            className="p-1.5 rounded-md border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Add / Edit Budget Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Budget — ${editing.Movie_Title}` : 'Assign Movie Budget'}
        subtitle="Total_Budget is automatically calculated on the server as Production + Marketing."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          {!editing && (
            <div>
              <label className="block text-sm font-medium mb-1">Movie *</label>
              <select
                value={movieId}
                onChange={(e) => setMovieId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {availableMovies.map((m) => (
                  <option key={m.Movie_ID} value={m.Movie_ID}>
                    {m.Title}
                  </option>
                ))}
              </select>
              {errors.movieId && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.movieId}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Production Cost (USD) *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={productionCost}
              onChange={(e) => setProductionCost(e.target.value)}
              placeholder="50000000"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {errors.productionCost && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.productionCost}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Marketing Cost (USD) *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={marketingCost}
              onChange={(e) => setMarketingCost(e.target.value)}
              placeholder="20000000"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {errors.marketingCost && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.marketingCost}</p>
            )}
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Calculated Total Budget</span>
            <span className="font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(liveTotalPreview)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Movie Budget"
        message={`Are you sure you want to delete the budget record for "${deleteTarget?.Movie_Title}"?`}
      />
    </div>
  );
}
