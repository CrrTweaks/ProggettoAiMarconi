import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:    'border-primary/20 bg-primary/10 text-primary',
        accent:     'border-accent/20 bg-accent/10 text-accent',
        secondary:  'border-border bg-elevated text-fg/80',
        outline:    'border-border text-muted-fg',
        success:    'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
        warning:    'border-amber-500/20 bg-amber-500/10 text-amber-400',
        danger:     'border-rose-500/20 bg-rose-500/10 text-rose-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
));
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
