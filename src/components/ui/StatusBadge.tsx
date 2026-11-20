import { TrendingUp, Minus, TrendingDown, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

type StatusKind =
  | 'Hit'
  | 'Average'
  | 'Flop'
  | 'Unbudgeted'
  | 'Exceeds Budget'
  | 'Below Budget'
  | 'Break-Even'
  | 'No Collections';

export function StatusBadge({ status }: { status: StatusKind }) {
  switch (status) {
    case 'Hit':
    case 'Exceeds Budget':
    case 'Break-Even':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80">
          {status === 'Hit' ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          {status}
        </span>
      );
    case 'Average':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap shrink-0 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80">
          <Minus className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    case 'Below Budget':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap shrink-0 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80">
          <AlertCircle className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    case 'Flop':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap shrink-0 bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/80">
          <TrendingDown className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap shrink-0 bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
          <Clock className="w-3.5 h-3.5" />
          {status}
        </span>
      );
  }
}
