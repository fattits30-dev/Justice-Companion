import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
};

const colorClasses = {
  primary: 'border-blue-500/30 border-t-blue-500',
  white: 'border-white/30 border-t-white',
  gray: 'border-gray-500/30 border-t-gray-500',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  text,
  className,
}: LoadingSpinnerProps): JSX.Element {
  const textColorClass = color === 'primary' ? 'text-blue-300' : color === 'white' ? 'text-white' : 'text-gray-400';

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          'rounded-full animate-spin',
          sizeClasses[size],
          colorClasses[color]
        )}
      >
        <span className="sr-only">{text || 'Loading...'}</span>
      </div>
      {text && (
        <p className={cn('font-medium', textSizeClasses[size], textColorClass)}>
          {text}
        </p>
      )}
    </div>
  );
}
