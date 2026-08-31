import { Link, Stack } from 'expo-router';

import { useTranslation } from '@repo/core';

import { Screen } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('common.notFound') }} />
      <Screen className="items-center justify-center gap-4 p-6">
        <Text className="text-lg font-semibold">{t('common.notFound')}</Text>
        <Link href="/" asChild>
          <Button variant="outline">
            <Text>{t('posts.listTitle')}</Text>
          </Button>
        </Link>
      </Screen>
    </>
  );
}
