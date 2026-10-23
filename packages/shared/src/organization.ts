import { z } from 'zod';
import { organizationNameSchema } from './auth.js';

export const updateOrganizationSchema = z.object({
  name: organizationNameSchema,
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
