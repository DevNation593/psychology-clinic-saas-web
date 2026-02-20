'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface UsageCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  current: number;
  limit: number;
  unit?: string;
  formatValue?: (value: number) => string;
  onUpgrade?: () => void;
  onManage?: () => void;
  upgradeLabel?: string;
  manageLabel?: string;
}

export function UsageCard({
  title,
  description,
  icon: Icon,
  current,
  limit,
  unit = '',
  formatValue,
  onUpgrade,
  onManage,
  upgradeLabel = 'Actualizar Plan',
  manageLabel = 'Gestionar',
}: UsageCardProps) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - current, 0);

  // Color coding based on usage percentage
  const getColor = () => {
    if (percentage >= 100) return 'red';
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  };

  const color = getColor();

  const colorClasses = {
    green: {
      progress: 'bg-green-500',
      text: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
    },
    yellow: {
      progress: 'bg-yellow-500',
      text: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
    },
    red: {
      progress: 'bg-red-500',
      text: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
    },
  };

  const classes = colorClasses[color];

  const formatNumber = (value: number) => {
    if (formatValue) return formatValue(value);
    return value.toLocaleString('es-ES');
  };

  const showWarning = percentage >= 80;

  return (
    <Card className={cn(
      'transition-all',
      showWarning && 'border-2',
      showWarning && classes.border
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', classes.icon)} />
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {description && (
                <CardDescription className="text-xs mt-0.5">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {showWarning && (
            <AlertTriangle className={cn('h-5 w-5', classes.icon)} />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Usage Stats */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              Uso actual
            </span>
            <span className={cn('font-semibold', classes.text)}>
              {formatNumber(current)} / {formatNumber(limit)} {unit}
            </span>
          </div>

          <Progress 
            value={percentage} 
            className={cn('h-2', classes.progress)}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{percentage.toFixed(0)}% utilizado</span>
            <span>
              {remaining > 0 ? `${formatNumber(remaining)} ${unit} disponibles` : 'Límite alcanzado'}
            </span>
          </div>
        </div>

        {/* Warning Message */}
        {showWarning && (
          <div className={cn(
            'rounded-lg p-3 text-sm',
            classes.bg,
            'border',
            classes.border
          )}>
            <p className={classes.text}>
              {percentage >= 100 ? (
                <strong>¡Límite alcanzado!</strong>
              ) : percentage >= 90 ? (
                <strong>¡Cerca del límite!</strong>
              ) : (
                <strong>Alto uso detectado</strong>
              )}
              {' '}
              {percentage >= 100 ? (
                'No puedes agregar más elementos.'
              ) : (
                `Quedan solo ${remaining} ${unit} disponibles.`
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManage}
              className="flex-1"
            >
              {manageLabel}
            </Button>
          )}

          {onUpgrade && showWarning && (
            <Button
              variant={percentage >= 90 ? 'default' : 'secondary'}
              size="sm"
              onClick={onUpgrade}
              className="flex-1 gap-1.5"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {upgradeLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
