import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { castApi, directorsApi, genresApi, moviesApi, rolesApi } from '../services/api';
import type { CastMember, Director, Genre, MovieRole } from '../types';
import { formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AvatarImage } from '../components/ui/AvatarImage';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type EntityTab = 'directors' | 'cast' | 'genres' | 'roles';

interface PersonForm {
  Name: string;
  Gender: string;
  Date_of_Birth: string;
  Bio: string;
  Photo_URL: string;
}

const emptyPerson: PersonForm = {
  Name: '',
  Gender: 'Female',
  Date_of_Birth: '',
  Bio: '',
  Photo_URL: '',
};

export function CatalogEntitiesPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<EntityTab>('directors');
  const [directors, setDirectors] = useState<Director[]>([]);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [roles, setRoles] = useState<MovieRole[]>([]);
  const [movies, setMovies] = useState<Array<{ Movie_ID: number; Title: string }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Person Modal (Director or Cast)
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [personKind, setPersonKind] = useState<'director' | 'cast'>('director');
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [personForm, setPersonForm] = useState<PersonForm>(emptyPerson);
  const [personErrors, setPersonErrors] = useState<Record<string, string>>({});
  const [savingPerson, setSavingPerson] = useState(false);

  // Genre Modal
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [genreName, setGenreName] = useState('');
  const [genreError, setGenreError] = useState('');
  const [savingGenre, setSavingGenre] = useState(false);

  // Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleMovieId, setRoleMovieId] = useState('');
  const [roleCastId, setRoleCastId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleError, setRoleError] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  // Delete confirmation
  const [deleteInfo, setDeleteInfo] = useState<{
    kind: 'director' | 'cast' | 'genre' | 'role';
    id: number;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, cRes, gRes, rRes, mRes] = await Promise.all([
        directorsApi.list(),
        castApi.list(),
        genresApi.list(),
        rolesApi.list(),
        moviesApi.listAllCompact(),
      ]);
      setDirectors(dRes.directors);
      setCast(cRes.cast);
      setGenres(gRes.genres);
      setRoles(rRes.roles);
      setMovies(mRes.movies);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openPersonModal = (kind: 'director' | 'cast', item?: Director | CastMember) => {
    setPersonKind(kind);
    if (item) {
      setEditingPersonId('Director_ID' in item ? item.Director_ID : item.Cast_ID);
      setPersonForm({
        Name: item.Name || '',
        Gender: item.Gender || 'Female',
        Date_of_Birth: item.Date_of_Birth ? String(item.Date_of_Birth).slice(0, 10) : '',
        Bio: item.Bio || '',
        Photo_URL: item.Photo_URL || '',
      });
    } else {
      setEditingPersonId(null);
      setPersonForm(emptyPerson);
    }
    setPersonErrors({});
    setPersonModalOpen(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personForm.Name.trim()) {
      setPersonErrors({ Name: 'Full name is required.' });
      return;
    }
    setSavingPerson(true);
    try {
      const payload = {
        Name: personForm.Name.trim(),
        Gender: personForm.Gender || null,
        Date_of_Birth: personForm.Date_of_Birth || null,
        Bio: personForm.Bio.trim() || null,
        Photo_URL: personForm.Photo_URL.trim() || null,
      };
      if (personKind === 'director') {
        if (editingPersonId) {
          await directorsApi.update(editingPersonId, payload);
          showToast('Director updated.', 'success');
        } else {
          await directorsApi.create(payload);
          showToast('Director added.', 'success');
        }
      } else {
        if (editingPersonId) {
          await castApi.update(editingPersonId, payload);
          showToast('Cast member updated.', 'success');
        } else {
          await castApi.create(payload);
          showToast('Cast member added.', 'success');
        }
      }
      setPersonModalOpen(false);
      loadAll();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSavingPerson(false);
    }
  };

  const openGenreModal = (genre?: Genre) => {
    setEditingGenre(genre || null);
    setGenreName(genre ? genre.Genre_Name : '');
    setGenreError('');
    setGenreModalOpen(true);
  };

  const handleSaveGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genreName.trim()) {
      setGenreError('Genre name is required.');
      return;
    }
    setSavingGenre(true);
    try {
      if (editingGenre) {
        await genresApi.update(editingGenre.Genre_ID, genreName.trim());
        showToast('Genre updated.', 'success');
      } else {
        await genresApi.create(genreName.trim());
        showToast('Genre created.', 'success');
      }
      setGenreModalOpen(false);
      loadAll();
    } catch (err) {
      setGenreError((err as Error).message);
    } finally {
      setSavingGenre(false);
    }
  };

  const openRoleModal = () => {
    setRoleMovieId(movies[0] ? String(movies[0].Movie_ID) : '');
    setRoleCastId(cast[0] ? String(cast[0].Cast_ID) : '');
    setRoleName('');
    setRoleError('');
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleMovieId || !roleCastId || !roleName.trim()) {
      setRoleError('Select a movie, cast member, and enter a role name.');
      return;
    }
    setSavingRole(true);
    try {
      await rolesApi.create({
        Movie_ID: Number(roleMovieId),
        Cast_ID: Number(roleCastId),
        Role_Name: roleName.trim(),
      });
      showToast('Cast role assigned.', 'success');
      setRoleModalOpen(false);
      loadAll();
    } catch (err) {
      setRoleError((err as Error).message);
    } finally {
      setSavingRole(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteInfo) return;
    setDeleting(true);
    try {
      if (deleteInfo.kind === 'director') await directorsApi.remove(deleteInfo.id);
      else if (deleteInfo.kind === 'cast') await castApi.remove(deleteInfo.id);
      else if (deleteInfo.kind === 'genre') await genresApi.remove(deleteInfo.id);
      else await rolesApi.remove(deleteInfo.id);
      showToast(`Deleted "${deleteInfo.label}".`, 'success');
      setDeleteInfo(null);
      loadAll();
    } catch (err) {
      showToast((err as Error).message, 'error');
      setDeleteInfo(null);
    } finally {
      setDeleting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredDirectors = directors.filter((d) => d.Name.toLowerCase().includes(q));
  const filteredCast = cast.filter((c) => c.Name.toLowerCase().includes(q));
  const filteredGenres = genres.filter((g) => g.Genre_Name.toLowerCase().includes(q));
  const filteredRoles = roles.filter(
    (r) =>
      (r.Movie_Title || '').toLowerCase().includes(q) ||
      r.Cast_Name.toLowerCase().includes(q) ||
      r.Role_Name.toLowerCase().includes(q)
  );

  const activeList =
    tab === 'directors'
      ? filteredDirectors
      : tab === 'cast'
      ? filteredCast
      : tab === 'genres'
      ? filteredGenres
      : filteredRoles;

  const totalPages = Math.max(1, Math.ceil(activeList.length / pageSize));
  const sliceStart = (page - 1) * pageSize;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start">
          {(
            [
              { id: 'directors', label: `Directors (${directors.length})` },
              { id: 'cast', label: `Cast (${cast.length})` },
              { id: 'genres', label: `Genres (${genres.length})` },
              { id: 'roles', label: `Movie Roles (${roles.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setPage(1);
                setSearch('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={`Search ${tab}...`}
              className="w-full sm:w-56 pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (tab === 'directors') openPersonModal('director');
                else if (tab === 'cast') openPersonModal('cast');
                else if (tab === 'genres') openGenreModal();
                else openRoleModal();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              {tab === 'directors'
                ? 'Add Director'
                : tab === 'cast'
                ? 'Add Cast Member'
                : tab === 'genres'
                ? 'Add Genre'
                : 'Assign Role'}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : activeList.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No matching {tab} records found.
          </div>
        ) : tab === 'directors' || tab === 'cast' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Gender</th>
                  <th className="py-3 px-3">Date of Birth</th>
                  <th className="py-3 px-3">Bio</th>
                  <th className="py-3 px-3 text-right">
                    {tab === 'directors' ? 'Movies' : 'Roles'}
                  </th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(tab === 'directors'
                  ? filteredDirectors.slice(sliceStart, sliceStart + pageSize)
                  : filteredCast.slice(sliceStart, sliceStart + pageSize)
                ).map((item) => {
                  const id = 'Director_ID' in item ? item.Director_ID : item.Cast_ID;
                  const count =
                    'Movie_Count' in item
                      ? item.Movie_Count
                      : 'Role_Count' in item
                      ? item.Role_Count
                      : 0;
                  return (
                    <tr
                      key={id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <AvatarImage src={item.Photo_URL} name={item.Name} className="w-10 h-10" />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.Name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                        {item.Gender || '—'}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(item.Date_of_Birth)}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                        <p className="line-clamp-2">{item.Bio || '—'}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                        {count ?? 0}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                openPersonModal(tab === 'directors' ? 'director' : 'cast', item)
                              }
                              title="Edit"
                              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteInfo({
                                  kind: tab === 'directors' ? 'director' : 'cast',
                                  id,
                                  label: item.Name,
                                })
                              }
                              title="Delete"
                              className="p-1.5 rounded-md border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : tab === 'genres' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Genre Name</th>
                  <th className="py-3 px-3 text-right">Assigned Movies</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredGenres.slice(sliceStart, sliceStart + pageSize).map((g) => (
                  <tr
                    key={g.Genre_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold">{g.Genre_Name}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {g.Movie_Count ?? 0}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openGenreModal(g)}
                            title="Edit genre"
                            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteInfo({
                                kind: 'genre',
                                id: g.Genre_ID,
                                label: g.Genre_Name,
                              })
                            }
                            title="Delete genre"
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Cast Member</th>
                  <th className="py-3 px-3">Movie</th>
                  <th className="py-3 px-3">Role / Character Name</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRoles.slice(sliceStart, sliceStart + pageSize).map((r) => (
                  <tr
                    key={r.Role_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <AvatarImage
                          src={r.Cast_Photo_URL}
                          name={r.Cast_Name}
                          className="w-8 h-8"
                        />
                        <span className="font-medium">{r.Cast_Name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {r.Movie_Title}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{r.Role_Name}</td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteInfo({
                              kind: 'role',
                              id: r.Role_ID,
                              label: `${r.Cast_Name} as ${r.Role_Name}`,
                            })
                          }
                          title="Remove role"
                          className="p-1.5 rounded-md border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          totalItems={activeList.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Add/Edit Director or Cast Modal with Live Photo Preview */}
      <Modal
        open={personModalOpen}
        onClose={() => setPersonModalOpen(false)}
        title={`${editingPersonId ? 'Edit' : 'Add'} ${
          personKind === 'director' ? 'Director' : 'Cast Member'
        }`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSavePerson} className="space-y-4" noValidate>
          <div className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <AvatarImage
              src={personForm.Photo_URL}
              name={personForm.Name || 'Preview'}
              className="w-16 h-16"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Live Photo Preview
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Enter a valid Photo URL below or leave blank to display a studio monogram.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input
                type="text"
                value={personForm.Name}
                onChange={(e) => setPersonForm({ ...personForm, Name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              {personErrors.Name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{personErrors.Name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select
                value={personForm.Gender}
                onChange={(e) => setPersonForm({ ...personForm, Gender: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input
                type="date"
                value={personForm.Date_of_Birth}
                onChange={(e) => setPersonForm({ ...personForm, Date_of_Birth: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Photo URL</label>
              <input
                type="text"
                value={personForm.Photo_URL}
                onChange={(e) => setPersonForm({ ...personForm, Photo_URL: e.target.value })}
                placeholder="/src/assets/images/..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Biography</label>
              <textarea
                rows={3}
                value={personForm.Bio}
                onChange={(e) => setPersonForm({ ...personForm, Bio: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPersonModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPerson}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            >
              {savingPerson ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Genre Modal */}
      <Modal
        open={genreModalOpen}
        onClose={() => setGenreModalOpen(false)}
        title={editingGenre ? 'Edit Genre' : 'Add Genre'}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleSaveGenre} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Genre Name *</label>
            <input
              type="text"
              value={genreName}
              onChange={(e) => setGenreName(e.target.value)}
              placeholder="e.g., Documentary"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            {genreError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{genreError}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setGenreModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingGenre}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            >
              {savingGenre ? 'Saving...' : 'Save Genre'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Assign Cast Role to Movie"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveRole} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Movie *</label>
            <select
              value={roleMovieId}
              onChange={(e) => setRoleMovieId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {movies.map((m) => (
                <option key={m.Movie_ID} value={m.Movie_ID}>
                  {m.Title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cast Member *</label>
            <select
              value={roleCastId}
              onChange={(e) => setRoleCastId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {cast.map((c) => (
                <option key={c.Cast_ID} value={c.Cast_ID}>
                  {c.Name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Character / Role Name *</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g., Commander Caleb Vance"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          {roleError && <p className="text-xs text-red-600 dark:text-red-400">{roleError}</p>}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingRole}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            >
              {savingRole ? 'Assigning...' : 'Assign Role'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteInfo)}
        onClose={() => setDeleteInfo(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${deleteInfo?.label}"? Records currently referenced by movies or roles cannot be deleted until unlinked.`}
      />
    </div>
  );
}
