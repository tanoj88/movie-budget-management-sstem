import { useCallback, useEffect, useState } from 'react';
import { Download, Star } from 'lucide-react';
import { reportsApi } from '../services/api';
import type {
  DirectorProfitabilityRow,
  GenreProfitabilityRow,
  MovieProfitabilityRow,
} from '../types';
import { formatCurrency, formatROI, formatSignedCurrency } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';

interface ReportsPageProps {
  onSelectMovie: (movieId: number) => void;
}

type ReportTab = 'movies' | 'genres' | 'directors';

export function ReportsPage({ onSelectMovie }: ReportsPageProps) {
  const { showToast } = useToast();

  const [tab, setTab] = useState<ReportTab>('movies');
  const [movieReport, setMovieReport] = useState<MovieProfitabilityRow[]>([]);
  const [genreReport, setGenreReport] = useState<GenreProfitabilityRow[]>([]);
  const [directorReport, setDirectorReport] = useState<DirectorProfitabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, gRes, dRes] = await Promise.all([
        reportsApi.profitability(),
        reportsApi.genres(),
        reportsApi.directors(),
      ]);
      setMovieReport(mRes.report);
      setGenreReport(gRes.report);
      setDirectorReport(dRes.report);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExportCsv = () => {
    const endpoint =
      tab === 'movies'
        ? '/api/reports/profitability?format=csv'
        : tab === 'genres'
        ? '/api/reports/genres?format=csv'
        : '/api/reports/directors?format=csv';
    const a = document.createElement('a');
    a.href = endpoint;
    a.download = `${tab}-profitability-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Exported ${tab} profitability CSV.`, 'success');
  };

  const activeItems =
    tab === 'movies' ? movieReport : tab === 'genres' ? genreReport : directorReport;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / pageSize));
  const sliceStart = (page - 1) * pageSize;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start">
          {(
            [
              { id: 'movies', label: 'Per Movie' },
              { id: 'genres', label: 'By Genre' },
              { id: 'directors', label: 'By Director' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
            Hit: ROI &gt; 50% · Average: 0% to 50% · Flop: ROI &lt; 0%
          </p>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : tab === 'movies' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Movie</th>
                  <th className="py-3 px-3">Genre · Director</th>
                  <th className="py-3 px-3 text-right">Total Budget</th>
                  <th className="py-3 px-3 text-right">Total Collection</th>
                  <th className="py-3 px-3 text-right">Profit / Loss</th>
                  <th className="py-3 px-3 text-right">ROI %</th>
                  <th className="py-3 px-3 text-right">Rating</th>
                  <th className="py-3 px-4 text-right">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movieReport.slice(sliceStart, sliceStart + pageSize).map((r) => (
                  <tr
                    key={r.Movie_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectMovie(r.Movie_ID)}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 text-left"
                      >
                        {r.Title}
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{r.Language}</div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                      <div>{r.Genre_Name}</div>
                      <div className="text-slate-400">{r.Director_Name}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(r.Total_Budget)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(r.Total_Collection)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono text-xs tabular-nums font-semibold ${
                        r.Profit_Loss >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatSignedCurrency(r.Profit_Loss)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatROI(r.ROI)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {r.Avg_Rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status={r.Status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'genres' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Genre</th>
                  <th className="py-3 px-3 text-right">Movies</th>
                  <th className="py-3 px-3 text-right">Total Budget</th>
                  <th className="py-3 px-3 text-right">Total Collection</th>
                  <th className="py-3 px-3 text-right">Net Profit / Loss</th>
                  <th className="py-3 px-3 text-right">Aggregate ROI %</th>
                  <th className="py-3 px-3 text-right">Avg Rating</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {genreReport.slice(sliceStart, sliceStart + pageSize).map((g) => (
                  <tr
                    key={g.Genre_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold">{g.Genre_Name}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {g.Movie_Count}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(g.Total_Budget)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(g.Total_Collection)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono text-xs tabular-nums font-semibold ${
                        g.Profit_Loss >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatSignedCurrency(g.Profit_Loss)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatROI(g.ROI)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs tabular-nums">
                      {g.Avg_Rating.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status={g.Status} />
                    </td>
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
                  <th className="py-3 px-4">Director</th>
                  <th className="py-3 px-3 text-right">Movies</th>
                  <th className="py-3 px-3 text-right">Total Budget</th>
                  <th className="py-3 px-3 text-right">Total Collection</th>
                  <th className="py-3 px-3 text-right">Net Profit / Loss</th>
                  <th className="py-3 px-3 text-right">Aggregate ROI %</th>
                  <th className="py-3 px-3 text-right">Avg Rating</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {directorReport.slice(sliceStart, sliceStart + pageSize).map((d) => (
                  <tr
                    key={d.Director_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold">{d.Director_Name}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {d.Movie_Count}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(d.Total_Budget)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(d.Total_Collection)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono text-xs tabular-nums font-semibold ${
                        d.Profit_Loss >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatSignedCurrency(d.Profit_Loss)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {formatROI(d.ROI)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs tabular-nums">
                      {d.Avg_Rating.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status={d.Status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={activeItems.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
