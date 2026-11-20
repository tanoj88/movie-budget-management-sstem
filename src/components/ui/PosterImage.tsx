import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';

interface PosterImageProps {
  src?: string | null;
  title: string;
  genre?: string | null;
  className?: string;
}

export function PosterImage({ src, title, genre, className = 'w-12 h-16' }: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden rounded border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 text-slate-600 dark:text-slate-300 select-none ${className}`}
        aria-label={`${title} poster placeholder`}
      >
        <Film className="w-5 h-5 opacity-60 mb-1 shrink-0" />
        <span className="px-1.5 text-[10px] font-display font-semibold text-center leading-tight line-clamp-2">
          {title}
        </span>
        {genre && (
          <span className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[90%]">
            {genre}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${title} poster`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover rounded border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 ${className}`}
    />
  );
}
