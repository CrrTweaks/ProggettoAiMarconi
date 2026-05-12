import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PageHeader({ title, subtitle, icon: Icon, actions, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-primary/20">
            <Icon className="size-6 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-fg">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
