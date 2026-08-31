import { z } from 'zod';

/**
 * Response from POST /api/bug-reports.
 *
 * Only `id` is required: it is the one field the widget shows back to the user
 * ("Report filed as …"), so a backend that cannot return a ticket reference is a
 * backend the success screen cannot honestly render.
 */
export const bugReportCreatedSchema = z.object({
  id: z.string().min(1),
  /** Link to the created ticket, when the backend has one to give. */
  url: z.url().optional(),
});

export type BugReportCreated = z.infer<typeof bugReportCreatedSchema>;
