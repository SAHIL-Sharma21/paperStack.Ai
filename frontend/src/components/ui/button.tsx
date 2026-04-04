import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70',
  {
    variants: {
      variant: {
        default:
          'bg-orange-500 text-zinc-950 hover:bg-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,.35)]',
        secondary:
          'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 shadow-[0_0_0_1px_rgba(244,244,245,.06)]',
        ghost: 'bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
        danger:
          'bg-rose-500/90 text-zinc-50 hover:bg-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,.35)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
