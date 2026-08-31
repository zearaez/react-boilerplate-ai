import * as React from 'react';

import { View } from 'react-native';

import { cn } from '~/lib/utils';

import { TextClassContext } from './text';

export type CardProps = React.ComponentProps<typeof View>;

export function Card({ className, ...props }: CardProps) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View className={cn('rounded-lg border border-border bg-card', className)} {...props} />
    </TextClassContext.Provider>
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <View className={cn('gap-1.5 p-4 pb-2', className)} {...props} />;
}

export function CardContent({ className, ...props }: CardProps) {
  return <View className={cn('gap-2 p-4 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  return <View className={cn('flex-row items-center gap-2 p-4 pt-0', className)} {...props} />;
}
