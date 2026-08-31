import { getApiClient } from '../../api/client';
import { parseRequestBody, toApiError } from '../../api/errors';

import {
  type Profile,
  type UpdateProfileInput,
  profileSchema,
  updateProfileInputSchema,
} from './schemas';

/** Same three-step shape as every other api function: call, parse, toApiError. */

export async function getProfile(): Promise<Profile> {
  try {
    const response = await getApiClient().get('/api/profile');
    return profileSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  try {
    // Runs superRefine too, so the cross-field rules are enforced before the
    // network — not only inside the form.
    const body = parseRequestBody(updateProfileInputSchema, input);
    const response = await getApiClient().patch('/api/profile', body);
    return profileSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}
