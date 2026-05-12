import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  BookOpen,
  FileText,
  GraduationCap,
  MessageSquare,
  Brain,
  Network,
  Mic,
  Settings,
  Bell,
  Sparkles,
  LogOut,
  Users,
} from "lucide-react";

import { useUI } from "@/store/ui";
import { useAuth } from "@/store/auth";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const ITEMS = [
  {
    group: "Generale",
    label: "Dashboard",
    to: "/",
    icon: LayoutDashboard,
    kbd: "G D",
  },
  {
    group: "Generale",
    label: "Calendario",
    to: "/calendar",
    icon: Calendar,
    kbd: "G C",
  },
  {
    group: "Generale",
    label: "Notifiche",
    to: "/notifications",
    icon: Bell,
    kbd: "G N",
  },

  { group: "Registro", label: "Compiti", to: "/homework", icon: ClipboardList },
  { group: "Registro", label: "Lezioni", to: "/lessons", icon: BookOpen },
  { group: "Registro", label: "Verifiche", to: "/exams", icon: FileText },
  {
    group: "Registro",
    label: "Interrogazioni",
    to: "/interrogations",
    icon: GraduationCap,
  },

  {
    group: "Strumenti AI",
    label: "Tutor AI",
    to: "/ai/chat",
    icon: MessageSquare,
    kbd: "G A",
  },
  { group: "Strumenti AI", label: "PDF / RAG", to: "/ai/rag", icon: Brain },
  {
    group: "Strumenti AI",
    label: "Mappe concettuali",
    to: "/ai/concept-maps",
    icon: Network,
  },
  { group: "Strumenti AI", label: "Voce AI", to: "/ai/voice", icon: Mic },

  { group: "Account", label: "Impostazioni", to: "/settings", icon: Settings },
];

const TEACHER_EXTRA = [
  { group: "Registro", label: "Classi", to: "/classes", icon: Users },
];

export default function CommandPalette() {
  const { paletteOpen, closePalette, togglePalette, toggleAIPanel } = useUI();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  const goto = (to) => {
    nav(to);
    closePalette();
  };

  const items = [
    ...ITEMS,
    ...(user?.role === "teacher" || user?.role === "admin"
      ? TEACHER_EXTRA
      : []),
  ];
  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={(v) => !v && closePalette()}
    >
      <CommandInput placeholder="Digita un comando, cerca una pagina, chiedi all'AI…" />
      <CommandList>
        <CommandEmpty>Nessun risultato.</CommandEmpty>

        <CommandGroup heading="Azioni rapide">
          <CommandItem
            onSelect={() => {
              toggleAIPanel();
              closePalette();
            }}
          >
            <Sparkles className="text-primary" /> Chiedi al Tutor AI
            <CommandShortcut>⌘ J</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {groups.map((g) => (
          <CommandGroup key={g} heading={g}>
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <CommandItem key={i.to} onSelect={() => goto(i.to)}>
                  <i.icon /> {i.label}
                  {i.kbd && <CommandShortcut>{i.kbd}</CommandShortcut>}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}

        <CommandSeparator />
        <CommandGroup heading="Sessione">
          <CommandItem
            onSelect={async () => {
              await logout();
              nav("/auth/login");
              closePalette();
            }}
          >
            <LogOut /> Esci
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
