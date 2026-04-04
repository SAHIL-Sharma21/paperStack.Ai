import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-zinc-800 text-zinc-200',
        processing: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/35',
        completed: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/35',
        failed: 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/35',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
