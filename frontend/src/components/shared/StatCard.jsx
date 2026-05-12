import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function StatCard({ icon: Icon, label, value, hint, accent = 'primary', delay = 0 }) {
  const accents = {
    primary: 'from-primary/30 to-primary/5 ring-primary/20 text-primary',
    accent:  'from-accent/30 to-accent/5 ring-accent/20 text-accent',
    success: 'from-emerald-500/30 to-emerald-500/5 ring-emerald-500/20 text-emerald-400',
    warning: 'from-amber-500/30 to-amber-500/5 ring-amber-500/20 text-amber-400',
    danger:  'from-rose-500/30 to-rose-500/5 ring-rose-500/20 text-rose-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-5 shadow-card"
    >
      <div className={cn('absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br blur-2xl opacity-60', accents[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-fg">{label}</div>
          <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-fg">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn('grid size-10 place-items-center rounded-lg ring-1 bg-bg/40', accents[accent])}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
