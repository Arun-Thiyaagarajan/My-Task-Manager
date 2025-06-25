'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addTask, deleteTask, updateTask, getTaskById } from './data';
import { taskSchema } from './validators';
import type { z } from 'zod';
import type { Task, Environment } from './types';

type TaskFormData = z.infer<typeof taskSchema>;

const parsePrLinks = (links: string | undefined): string[] => {
  if (!links) return [];
  return links.split('\n').map(l => l.trim()).filter(Boolean);
};

export async function createTaskAction(data: TaskFormData) {
  const validationResult = taskSchema.safeParse(data);

  if (!validationResult.success) {
    console.error(validationResult.error.flatten().fieldErrors);
    throw new Error('Invalid task data passed to action.');
  }

  const { prLinks, ...rest } = validationResult.data;

  const processedPrLinks = Object.fromEntries(
    Object.entries(prLinks).map(([env, links]) => [env, parsePrLinks(links)])
  ) as { [key in Environment]?: string[] };
  
  const taskData: Omit<Task, 'id'> = {
      ...rest,
      prLinks: processedPrLinks,
  }

  const newTask = addTask(taskData);
  revalidatePath('/');
  redirect(`/tasks/${newTask.id}`);
}

export async function updateTaskAction(id: string, data: TaskFormData) {
  if (!getTaskById(id)) {
    throw new Error('Task not found');
  }
  
  const validationResult = taskSchema.safeParse(data);

  if (!validationResult.success) {
    console.error(validationResult.error.flatten().fieldErrors);
    throw new Error('Invalid task data passed to action.');
  }

  const { prLinks, ...rest } = validationResult.data;

  const processedPrLinks = Object.fromEntries(
    Object.entries(prLinks).map(([env, links]) => [env, parsePrLinks(links)])
  ) as { [key in Environment]?: string[] };

  const taskData: Partial<Task> = {
    ...rest,
    prLinks: processedPrLinks,
  };

  updateTask(id, taskData);
  revalidatePath('/');
  revalidatePath(`/tasks/${id}`);
  redirect(`/tasks/${id}`);
}

export async function deleteTaskAction(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) {
    throw new Error('Task ID is required for deletion.');
  }
  deleteTask(id);
  revalidatePath('/');
  revalidatePath(`/tasks/${id}`); 
  redirect('/');
}
