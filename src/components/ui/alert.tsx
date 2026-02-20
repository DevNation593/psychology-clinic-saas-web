import { AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  title?: string;
  description?: string;
}

export function Alert({
  className,
  variant = 'default',
  title,
  description,
  children,
  ...props
}: AlertProps) {
  const icons = {
    default: Info,
    destructive: XCircle,
    success: CheckCircle2,
    warning: AlertCircle,
  };

  const Icon = icons[variant];

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        {
          'bg-background text-foreground': variant === 'default',
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive':
            variant === 'destructive',
          'border-green-500/50 bg-green-50 text-green-900 [&>svg]:text-green-600':
            variant === 'success',
          'border-orange-500/50 bg-orange-50 text-orange-900 [&>svg]:text-orange-600':
            variant === 'warning',
        },
        className
      )}
      {...props}
    >
      <div className="flex gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          {title && <h5 className="font-medium leading-none">{title}</h5>}
          {description && (
            <p className="text-sm opacity-90 [&_p]:leading-relaxed">{description}</p>
          )}
          {children && <div className="text-sm">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function AlertTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn('font-medium leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h5>
  );
}

function AlertDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export { AlertTitle, AlertDescription };
