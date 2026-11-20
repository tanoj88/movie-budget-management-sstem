import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  LayoutGrid,
  Table as TableIcon,
  Star,
  ArrowUpDown,
} from 'lucide-react';
import { directorsApi, genresApi, moviesApi } from '../services/api';
import type { Director, Genre, Movie } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PosterImage } from '../components/ui/PosterImage';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface MoviesPageProps {
  onSelectMovie: (movieId: number) => void;
}

interface MovieFormState {
  Title: string;
  Genre_ID: string;
  Director_ID: string;
  Language: string;
  Release_Date: string;
  Duration: string;
  Description: string;
  Poster_URL: string;
}

const emptyForm: MovieFormState = {
  Title: '',
  Genre_ID: '',
  Director_ID: '',
  Language: 'English',
  Release_Date: '',
  Duration: '120',
  Description: '',
  Poster_URL: '',
};

export function MoviesPage({ onSelectMovie }: MoviesPageProps) {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [directors, setDirectors] = useState<Director[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);

  const [q, setQ] = useState('');
  const [genreId, setGenreId] = useState('');
  const [directorId, setDirectorId] = useState('');
  const [language, setLanguage] = useState('');
  const [year, setYear] = useState('');
  const [sortBy, setSortBy] = useState('releaseDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 6;

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [form, setForm] = useState<MovieFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<Movie | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMetadata = useCallback(async () => {
    try {
      const [gRes, dRes] = await Promise.all([genresApi.list(), directorsApi.list()]);
      setGenres(gRes.genres);
      setDirectors(dRes.directors);
    } catch {
      // handled when loading movies
    }
  }, []);

  const loadMovies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await moviesApi.list({
        q,
        genreId,
        directorId,
        language,
        year,
        sortBy,
        sortOrder,
        page,
        limit: pageSize,
      });
      setMovies(res.movies);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
      setLanguages(res.filters.languages);
      setYears(res.filters.years);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [q, genreId, directorId, language, year, sortBy, sortOrder, page, showToast]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const openCreateModal = () => {
    setEditingMovie(null);
    setForm({
      ...emptyForm,
      Genre_ID: genres[0] ? String(genres[0].Genre_ID) : '',
      Director_ID: directors[0] ? String(directors[0].Director_ID) : '',
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEditModal = (movie: Movie) => {
    setEditingMovie(movie);
    setForm({
      Title: movie.Title || '',
      Genre_ID: movie.Genre_ID ? String(movie.Genre_ID) : '',
      Director_ID: movie.Director_ID ? String(movie.Director_ID) : '',
      Language: movie.Language || '',
      Release_Date: movie.Release_Date ? String(movie.Release_Date).slice(0, 10) : '',
      Duration: movie.Duration ? String(movie.Duration) : '',
      Description: movie.Description || '',
      Poster_URL: movie.Poster_URL || '',
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.Title.trim()) errs.Title = 'Movie title is required.';
    if (!form.Genre_ID) errs.Genre_ID = 'Please select a genre.';
    if (!form.Director_ID) errs.Director_ID = 'Please select a director.';
    if (!form.Language.trim()) errs.Language = 'Language is required.';
    if (!form.Release_Date) errs.Release_Date = 'Release date is required.';
    const dur = Number(form.Duration);
    if (!Number.isFinite(dur) || dur <= 0) errs.Duration = 'Duration must be a positive number.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        Title: form.Title.trim(),
        Genre_ID: Number(form.Genre_ID),
        Director_ID: Number(form.Director_ID),
        Language: form.Language.trim(),
        Release_Date: form.Release_Date,
        Duration: Number(form.Duration),
        Description: form.Description.trim(),
        Poster_URL: form.Poster_URL.trim() || null,
      };
      if (editingMovie) {
        await moviesApi.update(editingMovie.Movie_ID, payload);
        showToast(`Updated "${payload.Title}".`, 'success');
      } else {
        await moviesApi.create(payload);
        showToast(`Added "${payload.Title}" to catalog.`, 'success');
      }
      setFormOpen(false);
      loadMovies();
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
      await moviesApi.remove(deleteTarget.Movie_ID);
      showToast(`Deleted "${deleteTarget.Title}".`, 'success');
      setDeleteTarget(null);
      loadMovies();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setQ('');
    setGenreId('');
    setDirectorId('');
    setLanguage('');
    setYear('');
    setSortBy('releaseDate');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search movies by title..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Catalog
              </button>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Movie
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <select
            value={genreId}
            onChange={(e) => {
              setGenreId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by genre"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g.Genre_ID} value={g.Genre_ID}>
                {g.Genre_Name}
              </option>
            ))}
          </select>

          <select
            value={directorId}
            onChange={(e) => {
              setDirectorId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by director"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Directors</option>
            {directors.map((d) => (
              <option key={d.Director_ID} value={d.Director_ID}>
                {d.Name}
              </option>
            ))}
          </select>

          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by language"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Languages</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by release year"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              aria-label="Sort movies by"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="releaseDate">Sort: Release Date</option>
              <option value="title">Sort: Title</option>
              <option value="budget">Sort: Budget</option>
              <option value="collection">Sort: Collection</option>
              <option value="rating">Sort: Rating</option>
              <option value="duration">Sort: Duration</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title={`Order: ${sortOrder.toUpperCase()}`}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Movie List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : movies.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              No movies match your current search or filter criteria.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-3">Director & Genre</th>
                  <th className="py-3 px-3">Release</th>
                  <th className="py-3 px-3 text-right">Budget</th>
                  <th className="py-3 px-3 text-right">Collection</th>
                  <th className="py-3 px-3 text-right">Rating</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movies.map((m) => (
                  <tr
                    key={m.Movie_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <PosterImage
                          src={m.Poster_URL}
                          title={m.Title}
                          genre={m.Genre_Name}
                          className="w-10 h-14 shrink-0"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectMovie(m.Movie_ID)}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 text-left truncate block max-w-[220px]"
                          >
                            {m.Title}
                          </button>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {m.Language || '—'} · {m.Duration ? `${m.Duration} min` : '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-900 dark:text-slate-100 font-medium">
                        {m.Director_Name || '—'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {m.Genre_Name || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(m.Release_Date)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-xs text-slate-700 dark:text-slate-300">
                      {m.Total_Budget ? formatCurrency(m.Total_Budget) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(m.Total_Collection)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-xs">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {Number(m.Avg_Rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectMovie(m.Movie_ID)}
                          title="View Details"
                          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(m)}
                              title="Edit Movie"
                              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(m)}
                              title="Delete Movie"
                              className="p-1.5 rounded-md border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {movies.map((m) => (
              <div
                key={m.Movie_ID}
                className="flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-amber-500/50 transition-colors"
              >
                <PosterImage
                  src={m.Poster_URL}
                  title={m.Title}
                  genre={m.Genre_Name}
                  className="w-24 h-36 shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectMovie(m.Movie_ID)}
                      className="text-base font-display font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 text-left line-clamp-1"
                    >
                      {m.Title}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {m.Genre_Name || '—'} · {m.Language || '—'} · {m.Duration ? `${m.Duration}m` : '—'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Dir. {m.Director_Name || '—'}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Budget</span>
                      <span className="font-mono tabular-nums">
                        {m.Total_Budget ? formatCurrency(m.Total_Budget) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Box Office</span>
                      <span className="font-mono tabular-nums font-semibold">
                        {formatCurrency(m.Total_Collection)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {Number(m.Avg_Rating || 0).toFixed(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectMovie(m.Movie_ID)}
                        className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Open Dossier
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Add / Edit Movie Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingMovie ? `Edit "${editingMovie.Title}"` : 'Add New Movie'}
        subtitle="Enter catalog metadata and assign a Genre and Director."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Movie Title *</label>
              <input
                type="text"
                value={form.Title}
                onChange={(e) => setForm({ ...form, Title: e.target.value })}
                placeholder="e.g., Orbital Horizon"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              {formErrors.Title && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.Title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Genre *</label>
              <select
                value={form.Genre_ID}
                onChange={(e) => setForm({ ...form, Genre_ID: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="">Select Genre</option>
                {genres.map((g) => (
                  <option key={g.Genre_ID} value={g.Genre_ID}>
                    {g.Genre_Name}
                  </option>
                ))}
              </select>
              {formErrors.Genre_ID && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.Genre_ID}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Director *</label>
              <select
                value={form.Director_ID}
                onChange={(e) => setForm({ ...form, Director_ID: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="">Select Director</option>
                {directors.map((d) => (
                  <option key={d.Director_ID} value={d.Director_ID}>
                    {d.Name}
                  </option>
                ))}
              </select>
              {formErrors.Director_ID && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {formErrors.Director_ID}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Language *</label>
              <input
                type="text"
                value={form.Language}
                onChange={(e) => setForm({ ...form, Language: e.target.value })}
                placeholder="English"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              {formErrors.Language && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.Language}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Release Date *</label>
              <input
                type="date"
                value={form.Release_Date}
                onChange={(e) => setForm({ ...form, Release_Date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              {formErrors.Release_Date && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {formErrors.Release_Date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
              <input
                type="number"
                min={1}
                value={form.Duration}
                onChange={(e) => setForm({ ...form, Duration: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              {formErrors.Duration && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.Duration}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Poster Image URL</label>
              <input
                type="text"
                value={form.Poster_URL}
                onChange={(e) => setForm({ ...form, Poster_URL: e.target.value })}
                placeholder="/src/assets/images/..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Synopsis / Description</label>
              <textarea
                rows={3}
                value={form.Description}
                onChange={(e) => setForm({ ...form, Description: e.target.value })}
                placeholder="Brief theatrical synopsis..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingMovie ? 'Save Changes' : 'Create Movie'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Movie Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Movie"
        message={`Are you sure you want to delete "${deleteTarget?.Title}"? Movies with existing budgets, collections, cast roles, or reviews cannot be deleted until those linked records are removed.`}
      />
    </div>
  );
}
