import * as React from 'react';
import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(({ className, label, id, ...props }, ref) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          id={id}
          ref={ref}
          className={cn(
            'peer h-4 w-4 shrink-0 appearance-none rounded-[4px] border border-muted-foreground/50 bg-muted/20 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:border-primary transition-colors cursor-pointer',
            className
          )}
          {...props}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute h-2.5 w-2.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none cursor-pointer select-none text-foreground/80 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
    </div>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };
