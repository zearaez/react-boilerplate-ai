import { DEMO_EMAIL, DEMO_PASSWORD } from '@repo/mocks';

import { login } from '../features/auth/api';
import { useAuthStore } from '../features/auth/store';

/**
 * Signs in against the mock backend so the axios auth interceptor has a real
 * token to attach. Every /api/posts handler requires it, which is intentional —
 * a mock that skips auth lets an unauthenticated bug reach production.
 */
export async function authenticateTestUser(): Promise<void> {
  const session = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  await useAuthStore.getState().signIn(session);
}
