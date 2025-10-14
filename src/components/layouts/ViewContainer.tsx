import { ReactNode } from 'react';

interface ViewContainerProps {
  children: ReactNode;
  className?: string;
  /** If true, uses flex-1 overflow-y-auto for scrolling content */
  scrollable?: boolean;
  /** If true, centers content with max-w-7xl */
  centered?: boolean;
}

/**
 * Standardized container for all view pages
 * Ensures consistent sizing, spacing, and responsive behavior
 */
export function ViewContainer({
  children,
  className = '',
  scrollable = true,
  centered = true,
}: ViewContainerProps): JSX.Element {
  const baseClasses = 'flex-1 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950';
  const scrollClasses = scrollable ? 'overflow-y-auto' : 'overflow-hidden flex flex-col';
  const paddingClasses = 'px-12 py-8';

  return (
    <div className={`${baseClasses} ${scrollClasses} ${paddingClasses} ${className}`}>
      {centered ? <div className="w-full">{children}</div> : children}
    </div>
  );
}
