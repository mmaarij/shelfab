import * as React from 'react';
import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(({ className, label, id, ...props }, ref) => {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={id}
        ref={ref}
        className={cn(
          'h-4 w-4 shrink-0 rounded border border-input bg-background accent-primary cursor-pointer',
          className
        )}
        {...props}
      />
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none cursor-pointer select-none text-foreground/80"
        >
          {label}
        </label>
      )}
    </div>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };
