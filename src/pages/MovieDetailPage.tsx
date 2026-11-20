import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Star,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Pencil,
  UserPlus,
} from 'lucide-react';
import { castApi, moviesApi, reviewsApi, rolesApi } from '../services/api';
import type { CastMember, MovieDetailResponse, Review } from '../types';
import {
  formatCurrency,
  formatDate,
  formatROI,
  formatSignedCurrency,
} from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PosterImage } from '../components/ui/PosterImage';
import { AvatarImage } from '../components/ui/AvatarImage';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface MovieDetailPageProps {
  movieId: number;
  onBack: () => void;
  onOpenAuth: () => void;
}

export function MovieDetailPage({ movieId, onBack, onOpenAuth }: MovieDetailPageProps) {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [detail, setDetail] = useState<MovieDetailResponse | null>(null);
  const [allCast, setAllCast] = useState<CastMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin cast assignment
  const [roleCastId, setRoleCastId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [assigningRole, setAssigningRole] = useState(false);

  // Review form
  const [rating, setRating] = useState('4.5');
  const [reviewText, setReviewText] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null);
  const [deletingReview, setDeletingReview] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await moviesApi.getDetail(movieId);
      setDetail(res);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [movieId, showToast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (isAdmin) {
      castApi
        .list()
        .then((res) => {
          setAllCast(res.cast);
          if (res.cast[0] && !roleCastId) setRoleCastId(String(res.cast[0].Cast_ID));
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleCastId || !roleName.trim()) {
      showToast('Select a cast member and enter a character role name.', 'warning');
      return;
    }
    setAssigningRole(true);
    try {
      await rolesApi.create({
        Movie_ID: movieId,
        Cast_ID: Number(roleCastId),
        Role_Name: roleName.trim(),
      });
      setRoleName('');
      showToast('Cast role assigned to movie.', 'success');
      loadDetail();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setAssigningRole(false);
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    try {
      await rolesApi.remove(roleId);
      showToast('Role removed.', 'success');
      loadDetail();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const userExistingReview = detail?.reviews.find((r) => r.User_ID === user?.userId);

  const startEditReview = (r: Review) => {
    setEditingReviewId(r.Review_ID);
    setRating(String(r.Rating));
    setReviewText(r.Review_Text);
    setReviewError('');
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setRating('4.5');
    setReviewText('');
    setReviewError('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const numRating = Number(rating);
    if (!Number.isFinite(numRating) || numRating < 0 || numRating > 5) {
      setReviewError('Rating must be between 0.0 and 5.0.');
      return;
    }
    if (!reviewText.trim()) {
      setReviewError('Please enter your review commentary.');
      return;
    }
    setReviewError('');
    setSubmittingReview(true);
    try {
      if (editingReviewId) {
        await reviewsApi.update(editingReviewId, {
          Rating: numRating,
          Review_Text: reviewText.trim(),
        });
        showToast('Review updated.', 'success');
        setEditingReviewId(null);
      } else {
        await reviewsApi.create({
          Movie_ID: movieId,
          Rating: numRating,
          Review_Text: reviewText.trim(),
        });
        showToast('Review published.', 'success');
      }
      setReviewText('');
      loadDetail();
    } catch (err) {
      setReviewError((err as Error).message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deleteReviewTarget) return;
    setDeletingReview(true);
    try {
      await reviewsApi.remove(deleteReviewTarget.Review_ID);
      showToast('Review deleted.', 'success');
      setDeleteReviewTarget(null);
      loadDetail();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setDeletingReview(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-36 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  const { movie, cast, budget, collections, financials, reviews, ratingSummary } = detail;
  const belowBudget = budget && financials.totalCollection < financials.totalBudget;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Movies
      </button>

      {/* Hero Overview */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col md:flex-row gap-6">
          <PosterImage
            src={movie.Poster_URL}
            title={movie.Title}
            genre={movie.Genre_Name}
            className="w-44 h-64 shrink-0 self-start"
          />

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
                  {movie.Title}
                </h1>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  {movie.Genre_Name || 'Uncategorized'} · {movie.Language || 'Unknown'} ·{' '}
                  {formatDate(movie.Release_Date)} ·{' '}
                  {movie.Duration ? `${movie.Duration} min` : '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={financials.status} />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-sm font-semibold tabular-nums">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{ratingSummary.average.toFixed(1)}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({ratingSummary.count})
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
              {movie.Description || 'No synopsis recorded for this title.'}
            </p>

            {/* Director & Financial Snapshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <AvatarImage
                  src={movie.Director_Photo_URL}
                  name={movie.Director_Name || 'Director'}
                  className="w-11 h-11"
                />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Director</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {movie.Director_Name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Budget</p>
                <p className="text-base font-display font-bold tabular-nums mt-0.5">
                  {budget ? formatCurrency(financials.totalBudget) : 'Not Set'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cumulative Box Office</p>
                <p className="text-base font-display font-bold tabular-nums mt-0.5">
                  {formatCurrency(financials.totalCollection)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Profit / Loss & ROI</p>
                <p
                  className={`text-base font-display font-bold tabular-nums mt-0.5 ${
                    financials.profitLoss >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatSignedCurrency(financials.profitLoss)} ({formatROI(financials.roi)})
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budget Breakdown & Cast Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Budget Breakdown */}
        <section className="lg:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-display font-semibold">Budget Breakdown</h2>
          {!budget ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No budget has been allocated for this movie yet.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Production Cost</span>
                <span className="font-mono tabular-nums font-medium">
                  {formatCurrency(budget.Production_Cost)}
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Marketing Cost</span>
                <span className="font-mono tabular-nums font-medium">
                  {formatCurrency(budget.Marketing_Cost)}
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 font-semibold">
                <span>Total Allocated Budget</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(budget.Total_Budget)}
                </span>
              </div>

              {belowBudget ? (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Collections currently trail total budget by{' '}
                    <strong className="font-mono">
                      {formatCurrency(financials.totalBudget - financials.totalCollection)}
                    </strong>
                    .
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Break-even achieved. Collections exceed budget by{' '}
                    <strong className="font-mono">
                      {formatCurrency(financials.totalCollection - financials.totalBudget)}
                    </strong>
                    .
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Full Cast with Role Names */}
        <section className="lg:col-span-7 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold">Cast & Character Roles</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {cast.length} credited
            </span>
          </div>

          {cast.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No cast roles assigned yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cast.map((role) => (
                <div
                  key={role.Role_ID}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarImage
                      src={role.Cast_Photo_URL}
                      name={role.Cast_Name}
                      className="w-10 h-10"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{role.Cast_Name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        as {role.Role_Name}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role.Role_ID)}
                      title="Remove role"
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && allCast.length > 0 && (
            <form
              onSubmit={handleAssignRole}
              className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-200 dark:border-slate-800"
            >
              <select
                value={roleCastId}
                onChange={(e) => setRoleCastId(e.target.value)}
                aria-label="Select cast member"
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              >
                {allCast.map((c) => (
                  <option key={c.Cast_ID} value={c.Cast_ID}>
                    {c.Name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Character / Role Name"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <button
                type="submit"
                disabled={assigningRole}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Assign Role
              </button>
            </form>
          )}
        </section>
      </div>

      {/* Weekly Collections Table */}
      <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-semibold">Weekly Box-Office Collections</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cumulative tracking and break-even progression against total budget
            </p>
          </div>
        </div>

        {collections.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No weekly box-office entries recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4">Week</th>
                  <th className="py-2.5 px-4 text-right">Domestic</th>
                  <th className="py-2.5 px-4 text-right">Overseas</th>
                  <th className="py-2.5 px-4 text-right">Weekly Total</th>
                  <th className="py-2.5 px-4 text-right">Cumulative</th>
                  <th className="py-2.5 pl-4 text-right">Break-Even Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {collections.map((c) => (
                  <tr key={c.Collection_ID}>
                    <td className="py-2.5 pr-4 font-medium tabular-nums">Week {c.Week_Number}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(c.Domestic_Collection)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(c.Overseas_Collection)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums font-medium">
                      {formatCurrency(c.Total_Collection)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums font-semibold">
                      {formatCurrency(c.Cumulative_Collection)}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {budget ? (
                        <StatusBadge
                          status={c.Break_Even_Reached ? 'Break-Even' : 'Below Budget'}
                        />
                      ) : (
                        <StatusBadge status="Unbudgeted" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reviews Section */}
      <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-semibold">Studio & Audience Reviews</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Average {ratingSummary.average.toFixed(1)} / 5.0 from {ratingSummary.count} review(s)
            </p>
          </div>
          {!user && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Sign In to Write a Review
            </button>
          )}
        </div>

        {/* Review Form for authenticated users (create if not yet reviewed, or edit) */}
        {user && (!userExistingReview || editingReviewId) && (
          <form
            onSubmit={handleSubmitReview}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {editingReviewId ? 'Edit Your Review' : 'Add Your Review'}
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Rating (0.0 – 5.0):
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-20 px-2.5 py-1 text-sm font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
            <textarea
              rows={2}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share theatrical performance notes or audience reception..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {reviewError && (
              <p className="text-xs text-red-600 dark:text-red-400">{reviewError}</p>
            )}
            <div className="flex justify-end gap-2">
              {editingReviewId && (
                <button
                  type="button"
                  onClick={cancelEditReview}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                {submittingReview
                  ? 'Saving...'
                  : editingReviewId
                  ? 'Update Review'
                  : 'Submit Review'}
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No reviews submitted yet.</p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {reviews.map((rev) => {
              const canModify = user && (isAdmin || user.userId === rev.User_ID);
              return (
                <div key={rev.Review_ID} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {rev.User_Name}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(rev.Review_Date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold tabular-nums">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {Number(rev.Rating).toFixed(1)}
                      </span>
                      {canModify && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            type="button"
                            onClick={() => startEditReview(rev)}
                            title="Edit review"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteReviewTarget(rev)}
                            title="Delete review"
                            className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rev.Review_Text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteReviewTarget)}
        onClose={() => setDeleteReviewTarget(null)}
        onConfirm={handleDeleteReview}
        loading={deletingReview}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
      />
    </div>
  );
}
