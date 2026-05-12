import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
  'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ' +
  'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-fg shadow-glow hover:brightness-110 active:brightness-95',
        accent:
          'bg-accent text-accent-fg hover:brightness-110 shadow-glow-accent',
        gradient:
          'text-primary-fg bg-gradient-to-r from-primary to-accent shadow-glow hover:brightness-110',
        outline:
          'border border-border bg-transparent hover:bg-elevated text-fg',
        ghost:
          'hover:bg-elevated text-fg',
        secondary:
          'bg-elevated text-fg hover:bg-elevated/70 border border-border',
        destructive:
          'bg-danger text-white hover:brightness-110',
        link:
          'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-12 px-6 text-base',
        icon:    'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
