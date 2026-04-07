import * as React from 'react';
import { cn } from '../../lib/utils';

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: 'bg-primary/15 text-primary border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground border-secondary',
    outline: 'bg-transparent text-foreground border-border',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';

export { Badge };
