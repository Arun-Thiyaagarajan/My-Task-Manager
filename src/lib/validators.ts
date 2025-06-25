import { z } from 'zod';
import { TASK_STATUSES, REPOSITORIES } from './constants';

export const taskSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long.' }),
  status: z.enum(TASK_STATUSES, {
    errorMap: () => ({ message: 'Please select a valid status.' }),
  }),
  repository: z.enum(REPOSITORIES, {
    errorMap: () => ({ message: 'Please select a valid repository.' }),
  }),
  azureId: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});
