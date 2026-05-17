import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, LogOut, Search, Settings, Sparkles, User } from "lucide-react";

import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { initials, formatTime, roleLabel } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const NOTIF_LABEL = {
  homework: "Compiti",
  exam: "Verifica scritta",
  interrogation: "Interrogazione",
  lesson: "Lezione",
  absence: "Assenza",
  message: "Messaggio",
  system: "Sistema",
  ai: "AI",
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const { togglePalette, toggleAIPanel } = useUI();
  const nav = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ data: list }, { data: c }] = await Promise.all([
          api.get("/notifications"),
          api.get("/notifications/unread-count"),
        ]);
        if (!mounted) return;
        setNotifications(list.notifications || []);
        setUnread(c.count || 0);
      } catch {}
    })();

    const s = getSocket();
    const onNotif = (n) => {
      setNotifications((p) => [n, ...p].slice(0, 30));
      setUnread((u) => u + 1);
      toast(n.title, { description: n.body });
    };
    s.on("notification:new", onNotif);
    return () => {
      mounted = false;
      s.off("notification:new", onNotif);
    };
  }, []);

  const markAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((ns) =>
        ns.map((n) => ({ ...n, read_at: new Date().toISOString() })),
      );
      setUnread(0);
    } catch {}
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/40 bg-bg/70 backdrop-blur-xl px-4 sm:px-6">
      {/* Trigger ricerca */}
      <button
        onClick={togglePalette}
        className="group flex h-9 max-w-md flex-1 items-center gap-3 rounded-md border border-border bg-elevated/40 px-3 text-sm text-muted-fg transition-colors hover:bg-elevated"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Cerca tutto…</span>
        <kbd className="ml-auto hidden items-center gap-1 rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-fg sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Pulsante AI */}
      <Button
        variant="gradient"
        onClick={toggleAIPanel}
        className="hidden sm:inline-flex"
      >
        <Sparkles className="size-4" />
        Chiedi all'AI
      </Button>

      {/* Notifiche */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-5" />
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-danger text-[10px] font-bold text-white"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="font-semibold">Notifiche</div>
            <Button variant="ghost" size="sm" onClick={markAll}>
              Segna tutte come lette
            </Button>
          </div>
          <ScrollArea className="max-h-96">
            <AnimatePresence initial={false}>
              {notifications.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-fg">
                  Nessuna notifica
                </div>
              )}
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-border/60 px-4 py-3 hover:bg-elevated/50"
                  aria-label="Notifica"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant={n.read_at ? "secondary" : "accent"}>
                      {NOTIF_LABEL[n.type] || n.type}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-muted-fg line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-muted-fg">
                        {formatTime(n.created_at)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Menu utente */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full p-1 hover:bg-elevated">
            <Avatar className="size-8">
              {user?.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
              )}
              <AvatarFallback>{initials(user?.full_name)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium normal-case tracking-normal text-fg">
              {user?.full_name}
            </span>
            <span className="text-[11px] text-muted-fg normal-case tracking-normal">
              {user?.email}
            </span>
            <Badge variant="secondary" className="mt-1 w-fit">
              {roleLabel(user?.role)}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => nav("/settings")}>
            <User className="size-4" /> Profilo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => nav("/settings")}>
            <Settings className="size-4" /> Impostazioni
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await logout();
              nav("/auth/login");
            }}
            className="text-danger focus:text-danger"
          >
            <LogOut className="size-4" /> Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
