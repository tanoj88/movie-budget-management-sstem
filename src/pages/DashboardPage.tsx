import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { reportsApi } from '../services/api';
import type { DashboardData } from '../types';
import {
  formatCompactCurrency,
  formatCurrency,
  formatROI,
  formatSignedCurrency,
} from '../utils/format';
import { CardGridSkeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../context/ToastContext';

const PIE_COLORS = [
  '#D97706',
  '#0284C7',
  '#16A34A',
  '#7C3AED',
  '#DC2626',
  '#0D9488',
  '#EA580C',
  '#4F46E5',
];

interface DashboardPageProps {
  onSelectMovie: (movieId: number) => void;
}

export function DashboardPage({ onSelectMovie }: DashboardPageProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async (movieId?: number | null) => {
    try {
      const res = await reportsApi.dashboard(movieId);
      setData(res);
      if (selectedMovieId === null && res.trendMovieId) {
        setSelectedMovieId(res.trendMovieId);
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(selectedMovieId);
  }, [selectedMovieId]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <CardGridSkeleton count={5} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
          <div className="h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Unable to load dashboard analytics.
        </p>
      </div>
    );
  }

  const { summary, budgetVsCollection, genreCollections, topProfitable, weeklyTrend, movieOptions } =
    data;

  const profitPositive = summary.totalProfitLoss >= 0;

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Movies</p>
          <p className="mt-1.5 text-2xl font-display font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {summary.totalMovies}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Active studio catalog</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Budget Spent</p>
          <p className="mt-1.5 text-2xl font-display font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatCompactCurrency(summary.totalBudget)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {formatCurrency(summary.totalBudget)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Collection Earned
          </p>
          <p className="mt-1.5 text-2xl font-display font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatCompactCurrency(summary.totalCollection)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {formatCurrency(summary.totalCollection)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Profit / Loss</p>
          <p
            className={`mt-1.5 text-2xl font-display font-bold tabular-nums ${
              profitPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatSignedCurrency(summary.totalProfitLoss)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {summary.totalBudget > 0
              ? `${(((summary.totalCollection - summary.totalBudget) / summary.totalBudget) * 100).toFixed(1)}% portfolio ROI`
              : 'Portfolio net'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Rating</p>
          <p className="mt-1.5 text-2xl font-display font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {summary.avgRating.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Across {summary.totalReviews} reviews
          </p>
        </div>
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Budget vs Collection Bar Chart */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Budget vs Collection by Movie
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total allocated production and marketing budget against cumulative box-office gross
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={budgetVsCollection}
                margin={{ top: 8, right: 12, left: 4, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis
                  dataKey="Title"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-22}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={60}
                />
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
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <Bar dataKey="Total_Budget" name="Total Budget" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="Total_Collection"
                  name="Total Collection"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Weekly Collection Trend Line Chart */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Weekly Collection Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Week-by-week domestic, overseas, and total theatrical earnings
              </p>
            </div>
            <select
              value={selectedMovieId ?? ''}
              onChange={(e) => setSelectedMovieId(Number(e.target.value))}
              aria-label="Select movie for weekly collection trend"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              {movieOptions.map((m) => (
                <option key={m.Movie_ID} value={m.Movie_ID}>
                  {m.Title}
                </option>
              ))}
            </select>
          </div>
          <div className="h-72 w-full">
            {weeklyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No weekly collection entries recorded for this title.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis dataKey="Week" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tickFormatter={(v) => formatCompactCurrency(v)}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={60}
                  />
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
                  <Line
                    type="monotone"
                    dataKey="Total"
                    name="Total Weekly"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Domestic"
                    name="Domestic"
                    stroke="#0284c7"
                    strokeWidth={1.8}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Overseas"
                    name="Overseas"
                    stroke="#16a34a"
                    strokeWidth={1.8}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* Secondary Row: Genre Pie Chart & Top 5 Most Profitable Movies */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Genre-wise Total Collection Pie */}
        <section className="xl:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Genre-wise Total Collection
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Share of cumulative box-office revenue across studio genres
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genreCollections}
                  dataKey="Total_Collection"
                  nameKey="Genre_Name"
                  cx="50%"
                  cy="46%"
                  outerRadius={88}
                  innerRadius={44}
                  paddingAngle={2}
                >
                  {genreCollections.map((entry, idx) => (
                    <Cell key={entry.Genre_ID} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
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

        {/* Top 5 Most Profitable Movies */}
        <section className="xl:col-span-7 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Top 5 Most Profitable Movies
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by net theatrical profit (Total Collection minus Total Budget)
            </p>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="pb-2.5 pr-3">Movie</th>
                  <th className="pb-2.5 px-3 text-right">Budget</th>
                  <th className="pb-2.5 px-3 text-right">Collection</th>
                  <th className="pb-2.5 px-3 text-right">Net Profit</th>
                  <th className="pb-2.5 px-3 text-right">ROI</th>
                  <th className="pb-2.5 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {topProfitable.map((item) => (
                  <tr
                    key={item.Movie_ID}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => onSelectMovie(item.Movie_ID)}
                        className="group inline-flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 text-left"
                      >
                        <span>{item.Title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.Genre_Name || 'Uncategorized'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-xs text-slate-600 dark:text-slate-300">
                      {formatCurrency(item.Total_Budget)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-xs text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.Total_Collection)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right tabular-nums font-mono text-xs font-semibold ${
                        item.Profit_Loss >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatSignedCurrency(item.Profit_Loss)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-xs text-slate-700 dark:text-slate-300">
                      {formatROI(item.ROI)}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <StatusBadge status={item.Status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
