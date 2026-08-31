import * as React from 'react';

import { Text as RNText } from 'react-native';

import { cn } from '~/lib/utils';

/**
 * Lets a parent (Button, Card, Badge) set the text style of its children without
 * every call site repeating the classes.
 *
 * This is the mechanism that makes `<Button><Text>Save</Text></Button>` render
 * the right colour — the Button provides the context, the Text consumes it. It is
 * the same approach react-native-reusables uses, and it exists because React
 * Native has no CSS inheritance: unlike the web, a colour on a View does not
 * cascade into the Text inside it.
 */
export const TextClassContext = React.createContext<string | undefined>(undefined);

export type TextProps = React.ComponentProps<typeof RNText>;

export function Text({ className, ...props }: TextProps) {
  const contextClass = React.useContext(TextClassContext);

  return <RNText className={cn('text-base text-foreground', contextClass, className)} {...props} />;
}
