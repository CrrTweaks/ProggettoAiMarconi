import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-panel/30 p-10 text-center',
      className,
    )}>
      <div className="grid size-12 place-items-center rounded-full bg-elevated text-muted-fg">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <div className="font-semibold">{title}</div>
        {description && <div className="text-sm text-muted-fg max-w-md">{description}</div>}
      </div>
      {action}
    </div>
  );
}
