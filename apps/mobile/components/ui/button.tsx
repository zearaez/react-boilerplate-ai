import * as React from 'react';

import { Pressable } from 'react-native';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '~/lib/utils';

import { TextClassContext } from './text';

/**
 * Note the absence of `hover:` variants and the use of `active:opacity-*` instead
 * of `hover:bg-primary/90`. That is not an oversight:
 *
 *   - React Native has no hover state on touch devices.
 *   - The native Tailwind preset omits Tailwind's `<alpha-value>` placeholder
 *     (see packages/tokens/src/preset.ts), so `bg-primary/90` would not compile
 *     here the way it does on web.
 *
 * Web's shadcn Button uses the opacity-modifier form. Both express the same
 * intent for their platform; that is the trade of not sharing UI components.
 */
const buttonVariants = cva(
  'flex-row items-center justify-center gap-2 rounded-md active:opacity-90 disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        destructive: 'bg-destructive',
        outline: 'border border-input bg-background',
        secondary: 'bg-secondary',
        ghost: '',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3',
        lg: 'h-12 px-8',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

/** Text classes paired with each variant, applied through TextClassContext. */
const buttonTextVariants = cva('text-base font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
    },
    size: {
      default: '',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: '',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        // Every button is a button to a screen reader. Without this, TalkBack and
        // VoiceOver announce it as plain text.
        accessibilityRole="button"
        accessibilityState={{ disabled: props.disabled ?? false }}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { buttonTextVariants, buttonVariants };
