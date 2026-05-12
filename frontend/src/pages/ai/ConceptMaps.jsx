import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  ConnectionLineType,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Network,
  Sparkles,
  Loader2,
  Download,
  FileText,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { api, aiApi } from "@/lib/api";
import { useAuth } from "@/store/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function ConceptMaps() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [graph, setGraph] = useState(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: maps = [] } = useQuery({
    queryKey: ["concept-maps"],
    queryFn: async () => (await api.get("/ai/concept-maps")).data.maps || [],
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["ai-rag-docs"],
    queryFn: async () =>
      (await api.get("/ai/rag/documents")).data.documents || [],
  });

  const generate = async (mode) => {
    if (mode === "text" && !text.trim())
      return toast.warning("Fornisci del testo");
    if (mode === "pdf" && !docId) return toast.warning("Seleziona un PDF");
    setLoading(true);
    try {
      const { data } = await aiApi.post("/concept-map", {
        user_id: user.id,
        title: title || undefined,
        text: mode === "text" ? text : undefined,
        document_id: mode === "pdf" ? docId : undefined,
        max_concepts: 14,
      });
      setGraph(data);
      qc.invalidateQueries({ queryKey: ["concept-maps"] });
      toast.success("Mappa concettuale generata");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Generazione fallita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Network}
        title="Mappe Concettuali"
        subtitle="Crea automaticamente grafi di conoscenza interattivi con l'AI"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Generator */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-4 shadow-card">
            <div className="space-y-1.5 mb-3">
              <Label>Titolo (opzionale)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Concetti chiave di calcolo…"
              />
            </div>

            <Tabs defaultValue="text">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="text">Da testo</TabsTrigger>
                <TabsTrigger value="pdf">Da PDF</TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <Textarea
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Incolla le tue note, un articolo, un capitolo…"
                />
                <Button
                  variant="gradient"
                  className="mt-3 w-full"
                  disabled={loading || !text.trim()}
                  onClick={() => generate("text")}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Genera mappa
                </Button>
              </TabsContent>

              <TabsContent value="pdf">
                <select
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm"
                >
                  <option value="">Seleziona un PDF…</option>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename}
                    </option>
                  ))}
                </select>
                <Button
                  variant="gradient"
                  className="mt-3 w-full"
                  disabled={loading || !docId}
                  onClick={() => generate("pdf")}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Genera da PDF
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* History */}
          <div className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl shadow-card overflow-hidden">
            <div className="border-b border-border/40 p-3 text-sm font-semibold tracking-tight">
              Mappe recenti
            </div>
            <ScrollArea className="max-h-72">
              {maps.length === 0 && (
                <div className="p-4 text-xs text-muted-fg text-center">
                  Nessuna mappa
                </div>
              )}
              {maps.map((m) => (
                <button
                  key={m.id}
                  onClick={async () => {
                    const { data } = await api.get(`/ai/concept-maps/${m.id}`);
                    const g = data.map?.graph || {};
                    setGraph({
                      title: data.map.title,
                      nodes: g.nodes || [],
                      edges: g.edges || [],
                    });
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-elevated/60 border-t border-border/40 first:border-0"
                >
                  <Network className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">{m.title}</span>
                </button>
              ))}
            </ScrollArea>
          </div>
        </aside>

        {/* Graph */}
        <div className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl shadow-card overflow-hidden h-[70vh]">
          {!graph ? (
            <div className="grid h-full place-items-center">
              <EmptyState
                icon={Network}
                title="Nessuna mappa"
                description="Genera una mappa concettuale da testo o da uno dei tuoi PDF."
              />
            </div>
          ) : (
            <FlowGraph data={graph} onExport={() => exportSVG(graph)} />
          )}
        </div>
      </div>
    </div>
  );
}

function buildLayout(nodes, edges) {
  // Radial layout: root in the centre, others on rings
  const childCount = new Map();
  edges.forEach((e) => childCount.set(e.target, childCount.get(e.target) || 0));
  const incoming = new Map();
  edges.forEach((e) => {
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target).push(e.source);
  });

  const root = nodes[0];
  const positioned = new Map();
  positioned.set(root.id, { x: 0, y: 0 });

  const remaining = nodes.filter((n) => n.id !== root.id);
  const ringSize = Math.ceil(remaining.length);
  const radius = 320;
  remaining.forEach((n, i) => {
    const angle = (i / ringSize) * Math.PI * 2;
    positioned.set(n.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  const rfNodes = nodes.map((n, i) => {
    const isRoot = i === 0 || n.type === "root";
    return {
      id: n.id,
      data: { label: n.label },
      position: positioned.get(n.id) || { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: isRoot
          ? "linear-gradient(135deg, hsl(205 100% 60% / .25), hsl(188 95% 58% / .25))"
          : "hsl(222 35% 11%)",
        color: "#e6f1ff",
        border: isRoot
          ? "1px solid hsl(205 100% 60% / .6)"
          : "1px solid hsl(222 25% 22%)",
        borderRadius: 14,
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: isRoot
          ? "0 0 30px hsl(205 100% 60% / .35)"
          : "0 4px 16px -8px hsl(222 47% 4% / .8)",
        minWidth: 110,
        textAlign: "center",
      },
    };
  });

  const rfEdges = edges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(205 100% 60%)" },
    style: { stroke: "hsl(205 100% 60% / .6)", strokeWidth: 1.5 },
    labelStyle: { fill: "hsl(215 16% 65%)", fontSize: 11, fontWeight: 500 },
    labelBgPadding: [4, 2],
    labelBgStyle: { fill: "hsl(222 35% 11%)", stroke: "hsl(222 25% 22%)" },
  }));

  return { rfNodes, rfEdges };
}

function FlowGraph({ data, onExport }) {
  const { rfNodes, rfEdges } = useMemo(
    () => buildLayout(data.nodes, data.edges),
    [data],
  );
  const [nodes, , onNodesChange] = useNodesState(rfNodes);
  const [edges, , onEdgesChange] = useEdgesState(rfEdges);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data.title || "concept-map").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <span className="rounded-md bg-bg/80 px-3 py-1 text-sm font-semibold backdrop-blur ring-1 ring-border/60">
          {data.title}
        </span>
      </div>
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={exportJSON}>
          <Download className="size-3.5" /> JSON
        </Button>
        <Button size="sm" variant="outline" onClick={onExport}>
          <FileText className="size-3.5" /> PNG
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(222 25% 16%)" gap={18} />
        <MiniMap
          pannable
          zoomable
          style={{
            background: "hsl(222 40% 8%)",
            border: "1px solid hsl(222 25% 18%)",
            borderRadius: 8,
          }}
          nodeColor="hsl(205 100% 60%)"
          maskColor="hsl(222 47% 5% / 0.7)"
        />
        <Controls className="!bg-panel/80 !border !border-border/60 !rounded-md !shadow-card [&>button]:!bg-elevated [&>button]:!border-border [&>button]:!text-fg" />
      </ReactFlow>
    </div>
  );
}

function exportSVG(data) {
  // Simple SVG export of nodes & labels (browsers can rasterise to PNG).
  const { rfNodes, rfEdges } = buildLayout(data.nodes, data.edges);
  const minX = Math.min(...rfNodes.map((n) => n.position.x)) - 200;
  const maxX = Math.max(...rfNodes.map((n) => n.position.x)) + 200;
  const minY = Math.min(...rfNodes.map((n) => n.position.y)) - 200;
  const maxY = Math.max(...rfNodes.map((n) => n.position.y)) + 200;
  const w = maxX - minX,
    h = maxY - minY;

  const escape = (s) =>
    String(s).replace(
      /[<>&]/g,
      (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c],
    );

  const nodesSvg = rfNodes
    .map(
      (n) => `
    <g transform="translate(${n.position.x - minX},${n.position.y - minY})">
      <rect x="-60" y="-18" width="120" height="36" rx="12" fill="#0f1626" stroke="#3a8eff" />
      <text text-anchor="middle" dy="4" fill="#e6f1ff" font-family="Inter,sans-serif" font-size="12" font-weight="600">${escape(n.data.label)}</text>
    </g>`,
    )
    .join("");
  const edgesSvg = rfEdges
    .map((e) => {
      const s = rfNodes.find((n) => n.id === e.source);
      const t = rfNodes.find((n) => n.id === e.target);
      if (!s || !t) return "";
      return `<line x1="${s.position.x - minX}" y1="${s.position.y - minY}" x2="${t.position.x - minX}" y2="${t.position.y - minY}" stroke="#3a8eff" stroke-width="1.4" />`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="background:#0a0f1a">${edgesSvg}${nodesSvg}</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(data.title || "concept-map").toLowerCase().replace(/\s+/g, "-")}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
