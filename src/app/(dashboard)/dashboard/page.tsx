'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, tasksApi, patientsApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import type { Appointment, Task } from '@/types';
import { TaskStatus } from '@/types';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { formatDate, formatRelativeDate } from '@/lib/utils';
import { APPOINTMENT_STATUS_COLORS, TASK_PRIORITY_COLORS } from '@/lib/constants';
import Link from 'next/link';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // Get start of week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStart = startOfWeek.toISOString().split('T')[0];

  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.APPOINTMENTS, 'today'],
    queryFn: async (): Promise<Appointment[]> => {
      const response = await appointmentsApi.list({ from: today, to: today });
      return extractArray(response);
    },
  });

  const { data: weekAppointments } = useQuery({
    queryKey: [...QUERY_KEYS.APPOINTMENTS, 'week'],
    queryFn: async (): Promise<Appointment[]> => {
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const response = await appointmentsApi.list({ from: weekStart, to: endOfWeek.toISOString().split('T')[0] });
      return extractArray(response);
    },
  });

  const { data: overdueTasks, isLoading: tasksLoading } = useQuery({
    queryKey: [...QUERY_KEYS.TASKS, 'overdue'],
    queryFn: async (): Promise<Task[]> => {
      const response = await tasksApi.list({ status: 'PENDING' });
      const allTasks = extractArray(response);
      return allTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED
      );
    },
  });

  const { data: patientsData } = useQuery({
    queryKey: [...QUERY_KEYS.PATIENTS, 'stats'],
    queryFn: async () => {
      const response = await patientsApi.list({ isActive: true });
      return extractArray(response);
    },
  });

  const completeTask = useMutation({
    mutationFn: (id: string) =>
      tasksApi.update(id, { status: TaskStatus.COMPLETED, completedAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
      toast.success('Tarea completada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al completar tarea');
    },
  });

  const upcomingThisWeek = (weekAppointments || []).filter(
    (a) => new Date(a.startTime) > new Date() && a.status !== 'CANCELLED'
  ).length;

  const completedThisWeek = (weekAppointments || []).filter(
    (a) => a.status === 'COMPLETED'
  ).length;

  const stats = {
    todayAppointments: todayAppointments?.length || 0,
    upcomingAppointments: upcomingThisWeek,
    overdueTasks: overdueTasks?.length || 0,
    activePatientsCount: patientsData?.length || 0,
    completedAppointmentsThisWeek: completedThisWeek,
  };
  const statsLoading = appointmentsLoading || tasksLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Vista general de tu clínica
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/patients/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Nueva Cita
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Citas Hoy
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.todayAppointments || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.upcomingAppointments || 0} próximas esta semana
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tareas Pendientes
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overdueTasks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Requieren atención
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pacientes Activos
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activePatientsCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Activos actualmente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Citas Completadas
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.completedAppointmentsThisWeek || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta semana
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Citas de Hoy</CardTitle>
              <Link href="/calendar">
                <Button variant="ghost" size="sm">
                  Ver todas
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : todayAppointments && todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.slice(0, 5).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {appointment.patient.firstName} {appointment.patient.lastName}
                        </p>
                        <Badge className={APPOINTMENT_STATUS_COLORS[appointment.status]}>
                          {appointment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(appointment.startTime, 'HH:mm')} -{' '}
                        {formatDate(appointment.endTime, 'HH:mm')}
                      </p>
                      {appointment.title && (
                        <p className="text-sm text-muted-foreground truncate">
                          {appointment.title}
                        </p>
                      )}
                    </div>
                    <Link href={`/patients/${appointment.patientId}`}>
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay citas programadas para hoy</p>
                <Link href="/calendar">
                  <Button variant="link" className="mt-2">
                    Programar cita
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tareas Vencidas</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">
                  Ver todas
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : overdueTasks && overdueTasks.length > 0 ? (
              <div className="space-y-3">
                {overdueTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        <p className="font-medium truncate">{task.title}</p>
                      </div>
                      {task.patient && (
                        <p className="text-sm text-muted-foreground">
                          Paciente: {task.patient.firstName} {task.patient.lastName}
                        </p>
                      )}
                      {task.dueDate && (
                        <p className="text-xs text-destructive">
                          Vencida {formatRelativeDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => completeTask.mutate(task.id)}
                    >
                      Completar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-500" />
                <p>¡No hay tareas vencidas!</p>
                <p className="text-sm mt-1">Excelente trabajo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/patients/new" className="block">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Plus className="h-6 w-6" />
                <span>Nuevo Paciente</span>
              </Button>
            </Link>
            <Link href="/calendar" className="block">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Calendar className="h-6 w-6" />
                <span>Agendar Cita</span>
              </Button>
            </Link>
            <Link href="/patients" className="block">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="h-6 w-6" />
                <span>Ver Pacientes</span>
              </Button>
            </Link>
            <Link href="/admin/team" className="block">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="h-6 w-6" />
                <span>Gestionar Equipo</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
