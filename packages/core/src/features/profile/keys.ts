/**
 * A single-resource key factory: no `list`/`detail` split, because there is only
 * ever one profile. Keeping the `all` root anyway means `invalidateQueries({
 * queryKey: profileKeys.all })` still works and the shape stays recognisable next
 * to postKeys.
 */
export const profileKeys = {
  all: ['profile'] as const,
  current: () => [...profileKeys.all, 'current'] as const,
};
