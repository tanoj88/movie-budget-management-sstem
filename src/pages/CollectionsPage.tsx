import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { collectionsApi, moviesApi } from '../services/api';
import type { CollectionEntry } from '../types';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface CollectionsPageProps {
  onSelectMovie: (movieId: number) => void;
}

export function CollectionsPage({ onSelectMovie }: CollectionsPageProps) {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  const [movies, setMovies] = useState<Array<{ Movie_ID: number; Title: string }>>([]);
  const [filterMovieId, setFilterMovieId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionEntry | null>(null);
  const [formMovieId, setFormMovieId] = useState('');
  const [weekNumber, setWeekNumber] = useState('1');
  const [domestic, setDomestic] = useState('');
  const [overseas, setOverseas] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CollectionEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMovies = useCallback(async () => {
    try {
      const res = await moviesApi.listAllCompact();
      setMovies(res.movies);
      if (res.movies[0] && !formMovieId) {
        setFormMovieId(String(res.movies[0].Movie_ID));
      }
    } catch {
      // handled in collections load
    }
  }, []);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await collectionsApi.list(filterMovieId ? Number(filterMovieId) : undefined);
      setCollections(res.collections);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterMovieId, showToast]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const openCreate = () => {
    setEditing(null);
    const targetMovie = filterMovieId || (movies[0] ? String(movies[0].Movie_ID) : '');
    setFormMovieId(targetMovie);
    const existingWeeks = collections
      .filter((c) => String(c.Movie_ID) === targetMovie)
      .map((c) => c.Week_Number);
    const nextWeek = existingWeeks.length > 0 ? Math.max(...existingWeeks) + 1 : 1;
    setWeekNumber(String(nextWeek));
    setDomestic('');
    setOverseas('');
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (entry: CollectionEntry) => {
    setEditing(entry);
    setFormMovieId(String(entry.Movie_ID));
    setWeekNumber(String(entry.Week_Number));
    setDomestic(String(entry.Domestic_Collection));
    setOverseas(String(entry.Overseas_Collection));
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const wk = Number(weekNumber);
    const dom = Number(domestic);
    const ov = Number(overseas);

    if (!editing && !formMovieId) errs.formMovieId = 'Select a movie.';
    if (!Number.isInteger(wk) || wk < 1) {
      errs.weekNumber = 'Week number must be a positive integer (1 or higher).';
    }
    if (!Number.isFinite(dom) || dom < 0 || domestic === '') {
      errs.domestic = 'Enter a valid non-negative domestic collection.';
    }
    if (!Number.isFinite(ov) || ov < 0 || overseas === '') {
      errs.overseas = 'Enter a valid non-negative overseas collection.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editing) {
        await collectionsApi.update(editing.Collection_ID, {
          Week_Number: wk,
          Domestic_Collection: dom,
          Overseas_Collection: ov,
        });
        showToast(`Updated Week ${wk} for "${editing.Movie_Title}".`, 'success');
      } else {
        await collectionsApi.create({
          Movie_ID: Number(formMovieId),
          Week_Number: wk,
          Domestic_Collection: dom,
          Overseas_Collection: ov,
        });
        showToast(`Logged Week ${wk} collection.`, 'success');
      }
      setModalOpen(false);
      loadCollections();
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await collectionsApi.remove(deleteTarget.Collection_ID);
      showToast(
        `Removed Week ${deleteTarget.Week_Number} for "${deleteTarget.Movie_Title}".`,
        'success'
      );
      setDeleteTarget(null);
      loadCollections();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(collections.length / pageSize));
  const paginated = collections.slice((page - 1) * pageSize, page * pageSize);

  const liveWeeklyTotal =
    (Number.isFinite(Number(domestic)) ? Number(domestic) : 0) +
    (Number.isFinite(Number(overseas)) ? Number(overseas) : 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Filter by Movie:
          </label>
          <select
            value={filterMovieId}
            onChange={(e) => {
              setFilterMovieId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Movies (Chronological)</option>
            {movies.map((m) => (
              <option key={m.Movie_ID} value={m.Movie_ID}>
                {m.Title}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Log Weekly Collection
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : paginated.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No weekly collection entries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Movie</th>
                  <th className="py-3 px-3">Week</th>
                  <th className="py-3 px-3 text-right">Domestic</th>
                  <th className="py-3 px-3 text-right">Overseas</th>
                  <th className="py-3 px-3 text-right">Weekly Total</th>
                  <th className="py-3 px-3 text-right">Cumulative</th>
                  <th className="py-3 px-3 text-right">Break-Even Indicator</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((c) => (
                  <tr
                    key={c.Collection_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectMovie(c.Movie_ID)}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 text-left"
                      >
                        {c.Movie_Title}
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Budget: {c.Total_Budget ? formatCurrency(c.Total_Budget) : 'Not Set'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium tabular-nums whitespace-nowrap">
                      Week {c.Week_Number}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(c.Domestic_Collection)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(c.Overseas_Collection)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums font-medium">
                      {formatCurrency(c.Total_Collection)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums font-semibold">
                      {formatCurrency(c.Cumulative_Collection)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        {c.Total_Budget ? (
                          <>
                            <StatusBadge
                              status={c.Break_Even_Reached ? 'Break-Even' : 'Below Budget'}
                            />
                            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {c.Break_Even_Percent}% of budget
                            </span>
                          </>
                        ) : (
                          <StatusBadge status="Unbudgeted" />
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            title="Edit entry"
                            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete entry"
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
          totalItems={collections.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Add/Edit Collection Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? `Edit Week ${editing.Week_Number} — ${editing.Movie_Title}`
            : 'Log Weekly Box-Office Collection'
        }
        subtitle="Duplicate week numbers for the same movie are blocked automatically."
        maxWidth="max-w-md"
      >
        {errors.form && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 text-sm text-red-700 dark:text-red-300">
            {errors.form}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          {!editing && (
            <div>
              <label className="block text-sm font-medium mb-1">Movie *</label>
              <select
                value={formMovieId}
                onChange={(e) => setFormMovieId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {movies.map((m) => (
                  <option key={m.Movie_ID} value={m.Movie_ID}>
                    {m.Title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Week Number *</label>
            <input
              type="number"
              min={1}
              step={1}
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {errors.weekNumber && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.weekNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Domestic Collection (USD) *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={domestic}
              onChange={(e) => setDomestic(e.target.value)}
              placeholder="15000000"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {errors.domestic && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.domestic}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Overseas Collection (USD) *</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={overseas}
              onChange={(e) => setOverseas(e.target.value)}
              placeholder="18000000"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {errors.overseas && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.overseas}</p>
            )}
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Calculated Weekly Total</span>
            <span className="font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(liveWeeklyTotal)}
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
              {saving ? 'Saving...' : editing ? 'Update Collection' : 'Save Collection'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Collection Entry"
        message={`Are you sure you want to delete Week ${deleteTarget?.Week_Number} for "${deleteTarget?.Movie_Title}"?`}
      />
    </div>
  );
}
