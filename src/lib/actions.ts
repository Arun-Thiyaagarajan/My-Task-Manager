'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addTask, deleteTask, updateTask, getTaskById } from './data';
import { taskSchema } from './validators';
import type { z } from 'zod';
import type { Task } from './types';

type TaskData = z.infer<typeof taskSchema>;

export async function createTaskAction(data: TaskData) {
  const validationResult = taskSchema.safeParse(data);

  if (!validationResult.success) {
    throw new Error('Invalid task data passed to action.');
  }

  const newTask = addTask(validationResult.data);
  revalidatePath('/');
  redirect(`/tasks/${newTask.id}`);
}

export async function updateTaskAction(id: string, data: TaskData) {
  if (!getTaskById(id)) {
    throw new Error('Task not found');
  }
  
  const validationResult = taskSchema.safeParse(data);

  if (!validationResult.success) {
    throw new Error('Invalid task data passed to action.');
  }

  updateTask(id, validationResult.data as Partial<Task>);
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
