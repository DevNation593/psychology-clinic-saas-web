'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { Task, TaskStatus } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export function useTasks(params?: Parameters<typeof tasksApi.list>[0]) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TASKS, params],
    queryFn: async () => {
      const response = await tasksApi.list(params);
      return extractArray(response);
    },
  });
}

export function useMyTasks() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: [...QUERY_KEYS.TASKS_MY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await tasksApi.list({ assignedToId: user.id });
      return extractArray(response);
    },
    enabled: !!user?.id,
  });
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.TASKS_OVERDUE,
    queryFn: async () => {
      const response = await tasksApi.list({ status: TaskStatus.PENDING });
      const tasks = extractArray(response);
      return tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED
      );
    },
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TASK_DETAIL(id),
    queryFn: () => tasksApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS_MY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS_OVERDUE });
      toast.success('Tarea creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear tarea');
    },
  });
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASK_DETAIL(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS_MY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS_OVERDUE });
      toast.success('Tarea actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar tarea');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS_MY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS_OVERDUE });
      toast.success('Tarea eliminada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar tarea');
    },
  });
}

export function useCompleteTask(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      tasksApi.update(id, { status: TaskStatus.COMPLETED, completedAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASK_DETAIL(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS_MY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS_OVERDUE });
      toast.success('Tarea completada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al completar tarea');
    },
  });
}
