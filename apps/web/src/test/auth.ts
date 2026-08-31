import { login, useAuthStore } from '@repo/core';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@repo/mocks';

/**
 * Signs in against the mock backend so the axios auth interceptor has a real
 * token. Every /api/posts handler requires one — a mock that skipped auth would
 * let an unauthenticated bug reach production.
 */
export async function signInTestUser(): Promise<void> {
  const session = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  await useAuthStore.getState().signIn(session);
}
