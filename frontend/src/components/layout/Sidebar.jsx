import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
  ClipboardList,
  FileText,
  MessageSquare,
  Brain,
  Network,
  Mic,
  Bell,
  Settings,
  ChevronLeft,
  Sparkles,
  Users,
} from "lucide-react";
import { useUI } from "@/store/ui";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  {
    title: "Generale",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/calendar", icon: Calendar, label: "Calendario" },
      { to: "/notifications", icon: Bell, label: "Notifiche" },
    ],
  },
  {
    title: "Registro",
    items: [
      { to: "/homework", icon: ClipboardList, label: "Compiti" },
      { to: "/lessons", icon: BookOpen, label: "Lezioni" },
      { to: "/exams", icon: FileText, label: "Verifiche" },
      { to: "/interrogations", icon: GraduationCap, label: "Interrogazioni" },
    ],
  },
  {
    title: "Strumenti AI",
    items: [
      { to: "/ai/chat", icon: MessageSquare, label: "Tutor AI", glow: true },
      { to: "/ai/rag", icon: Brain, label: "PDF / RAG" },
      { to: "/ai/concept-maps", icon: Network, label: "Mappe concettuali" },
      { to: "/ai/voice", icon: Mic, label: "Voce AI" },
    ],
  },
];

const TEACHER_ITEMS = [{ to: "/classes", icon: Users, label: "Classi" }];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUI();
  const { user } = useAuth();
  const location = useLocation();

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 260 : 76 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className={cn(
        "sticky top-0 z-30 h-screen shrink-0",
        "border-r border-border/50 bg-panel/40 backdrop-blur-xl",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/40">
          <NavLink to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-glow">
              <Sparkles className="size-5 text-white" />
            </div>
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex flex-col"
                >
                  <span className="text-sm font-bold tracking-tight">
                    AI School
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-fg">
                    Workspace
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </NavLink>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className={cn("text-muted-fg", !sidebarOpen && "rotate-180")}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <AnimatePresence initial={false}>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-fg"
                  >
                    {group.title}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.to} {...item} compact={!sidebarOpen} />
                ))}
                {group.title === "Registro" &&
                  isTeacher &&
                  TEACHER_ITEMS.map((it) => (
                    <NavItem key={it.to} {...it} compact={!sidebarOpen} />
                  ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings */}
        <div className="border-t border-border/40 p-3">
          <NavItem
            to="/settings"
            icon={Settings}
            label="Impostazioni"
            compact={!sidebarOpen}
          />
        </div>
      </div>
    </motion.aside>
  );
}

function NavItem({ to, icon: Icon, label, compact, glow }) {
  return (
    <NavLink to={to} end={to === "/"}>
      {({ isActive }) => (
        <motion.div
          whileHover={{ x: 2 }}
          className={cn(
            "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/15 text-fg ring-1 ring-primary/30"
              : "text-muted-fg hover:bg-elevated/60 hover:text-fg",
          )}
        >
          {isActive && (
            <motion.span
              layoutId="active-pill"
              className="absolute inset-y-0 left-0 w-1 rounded-r bg-gradient-to-b from-primary to-accent"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <Icon
            className={cn("size-4 shrink-0", glow && isActive && "text-accent")}
          />
          <AnimatePresence initial={false}>
            {!compact && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="truncate"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </NavLink>
  );
}
