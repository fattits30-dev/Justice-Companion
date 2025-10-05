interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeMap = {
  small: 'w-4 h-4 border-2',
  medium: 'w-6 h-6 border-2',
  large: 'w-12 h-12 border-[3px]',
};

export function Spinner({ size = 'medium', className = '' }: SpinnerProps): JSX.Element {
  const sizeClass = sizeMap[size];

  return (
    <div
      className={`
        ${sizeClass}
        border-blue-500/30 border-t-blue-500
        rounded-full animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
