import { Pressable } from 'react-native';

import { Link, Stack } from 'expo-router';

import { LogOut, User } from 'lucide-react-native';

import { useLogout, useTranslation } from '@repo/core';

/**
 * Header options live here, in one place, so every screen in the group matches.
 * Setting them per-screen is how header styling drifts.
 */
export default function AppLayout() {
  const { t } = useTranslation();
  const logout = useLogout();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('posts.listTitle'),
          headerLeft: () => (
            <Link href="/profile" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('profile.title')}
                hitSlop={12}
              >
                <User size={20} className="text-foreground" />
              </Pressable>
            </Link>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.signOut')}
              hitSlop={12}
              onPress={() => {
                logout.mutate();
              }}
            >
              <LogOut size={20} className="text-foreground" />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="profile" options={{ title: t('profile.title') }} />
      <Stack.Screen name="posts/new" options={{ title: t('posts.new'), presentation: 'modal' }} />
      <Stack.Screen name="posts/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="posts/[id]/edit" options={{ title: t('posts.editTitle') }} />
      {/* `pnpm gen feature` appends new screen options below this marker.
          expo-router registers a route from its file path regardless — these
          entries only set the title and presentation. */}
      {/* @gen:screens */}
    </Stack>
  );
}
