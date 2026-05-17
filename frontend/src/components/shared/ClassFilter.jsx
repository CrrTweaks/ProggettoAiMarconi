import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

/**
 * Tabs orizzontali per filtrare risorse per classe.
 * value: "" = tutte le classi, altrimenti class_id.
 */
export default function ClassFilter({ value, onChange }) {
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data.classes || [],
    staleTime: 5 * 60 * 1000,
  });

  if (classes.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onChange("")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
          value === ""
            ? "bg-primary text-primary-fg shadow-sm"
            : "bg-elevated/40 text-muted-fg hover:bg-elevated/70 hover:text-fg"
        )}
      >
        <Users className="size-3" />
        Tutte
      </button>
      {classes.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
            value === c.id
              ? "bg-primary text-primary-fg shadow-sm"
              : "bg-elevated/40 text-muted-fg hover:bg-elevated/70 hover:text-fg"
          )}
        >
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: c.color || "#3b82f6" }}
          />
          {c.name}
        </button>
      ))}
    </div>
  );
}
