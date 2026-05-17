import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Save, Settings as SettingsIcon, User } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { initials, roleLabel } from "@/lib/utils";

export default function Settings() {
  const { user, refreshMe } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    avatar_url: user?.avatar_url || "",
    bio: user?.bio || "",
  });
  const [prefs, setPrefs] = useState({
    notifications_email: user?.preferences?.notifications_email ?? true,
    sound: user?.preferences?.sound ?? true,
    voice_lang: user?.preferences?.voice_lang || "it",
    default_model: user?.preferences?.default_model || "llama3",
  });

  const save = useMutation({
    mutationFn: (payload) => api.put("/users/me", payload),
    onSuccess: async () => {
      await refreshMe();
      toast.success("Profilo salvato");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Impossibile"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SettingsIcon}
        title="Impostazioni"
        subtitle="Gestisci il tuo profilo e le preferenze"
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full grid grid-cols-3 max-w-lg">
          <TabsTrigger value="profile">Profilo</TabsTrigger>
          <TabsTrigger value="preferences">Preferenze</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-6 shadow-card max-w-2xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="size-16">
                {form.avatar_url && <AvatarImage src={form.avatar_url} />}
                <AvatarFallback className="text-lg">
                  {initials(form.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-semibold">
                  {form.full_name || "—"}
                </div>
                <div className="text-sm text-muted-fg">{user?.email}</div>
                <Badge variant="secondary" className="mt-1">
                  {roleLabel(user?.role)}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>URL avatar</Label>
                <Input
                  type="url"
                  value={form.avatar_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, avatar_url: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bio: e.target.value }))
                  }
                />
              </div>
              <Button
                variant="gradient"
                onClick={() => save.mutate(form)}
                disabled={save.isPending}
              >
                {save.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}{" "}
                Salva modifiche
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="preferences">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-6 shadow-card max-w-2xl space-y-5"
          >
            <PrefRow
              title="Notifiche email"
              subtitle="Ricevi un riepilogo di compiti, verifiche e suggerimenti AI"
              value={prefs.notifications_email}
              onChange={(v) =>
                setPrefs((p) => ({ ...p, notifications_email: v }))
              }
            />
            <PrefRow
              title="Suono notifiche"
              subtitle="Riproduci un suono leggero quando arriva qualcosa"
              value={prefs.sound}
              onChange={(v) => setPrefs((p) => ({ ...p, sound: v }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Lingua vocale</Label>
                <select
                  value={prefs.voice_lang}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, voice_lang: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm"
                >
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Modello AI predefinito</Label>
                <select
                  value={prefs.default_model}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, default_model: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm"
                >
                  <option value="llama3">Llama 3</option>
                  <option value="mistral">Mistral</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="codellama">CodeLlama</option>
                </select>
              </div>
            </div>

            <Button
              variant="gradient"
              onClick={() => save.mutate({ preferences: prefs })}
              disabled={save.isPending}
            >
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}{" "}
              Salva preferenze
            </Button>
          </motion.div>
        </TabsContent>

        <TabsContent value="account">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-6 shadow-card max-w-2xl space-y-4"
          >
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-elevated/30 p-4">
              <User className="size-5 text-muted-fg" />
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-xs text-muted-fg">{user?.email}</div>
              </div>
            </div>
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="font-medium text-rose-300">Zona pericolosa</div>
              <div className="mt-1 text-xs text-rose-300/80">
                L'eliminazione dell'account è permanente e rimuove tutti i tuoi
                dati.
              </div>
              <Button
                variant="destructive"
                className="mt-3"
                onClick={() =>
                  toast("Eliminazione account non ancora abilitata nella demo")
                }
              >
                Elimina account
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PrefRow({ title, subtitle, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-elevated/30 p-4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs text-muted-fg">{subtitle}</div>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
