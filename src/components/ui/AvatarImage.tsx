import { useEffect, useState } from 'react';
import { getInitials } from '../../utils/format';

interface AvatarImageProps {
  src?: string | null;
  name: string;
  className?: string;
}

export function AvatarImage({ src, name, className = 'w-10 h-10' }: AvatarImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-display font-semibold text-xs shrink-0 select-none ${className}`}
        aria-label={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 ${className}`}
    />
  );
}
