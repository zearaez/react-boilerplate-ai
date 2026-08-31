import * as React from 'react';

import { TextInput } from 'react-native';

import { cn } from '~/lib/utils';

export type InputProps = React.ComponentProps<typeof TextInput>;

export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        'h-11 rounded-md border border-input bg-background px-3 text-base text-foreground',
        // Android clips descenders on multiline-capable inputs unless padding is
        // disabled explicitly; this is the standard RN workaround.
        'align-middle',
        props.editable === false && 'opacity-50',
        className,
      )}
      placeholderClassName="text-muted-foreground"
      {...props}
    />
  );
}

export type TextareaProps = InputProps;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      className={cn(
        'min-h-24 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground',
        className,
      )}
      placeholderClassName="text-muted-foreground"
      {...props}
    />
  );
}
