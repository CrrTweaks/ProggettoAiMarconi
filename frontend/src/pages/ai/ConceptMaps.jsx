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
        {/* Generatore */}
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

          {/* Cronologia */}
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

        {/* Grafo */}
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
  if (!nodes || nodes.length === 0) return { rfNodes: [], rfEdges: [] };

  const root = nodes[0]; // The root node
  
  // 1. Build adjacency list of children in a tree structure (avoiding cycles)
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));
  const visited = new Set([root.id]);
  const nodeDepths = new Map();
  nodeDepths.set(root.id, 0);
  
  const queue = [root.id];
  while (queue.length > 0) {
    const parentId = queue.shift();
    const parentDepth = nodeDepths.get(parentId);
    
    edges.forEach(e => {
      if (e.source === parentId && !visited.has(e.target)) {
        visited.add(e.target);
        nodeDepths.set(e.target, parentDepth + 1);
        adj.get(parentId).push(e.target);
        queue.push(e.target);
      }
    });
  }
  
  // Handle orphans (disconnected nodes)
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      adj.get(root.id).push(n.id);
      visited.add(n.id);
      nodeDepths.set(n.id, 1);
    }
  });

  // 2. Position nodes using Hierarchical Radial Tree Layout
  const positioned = new Map();
  
  function layoutNode(nodeId, depth, minAngle, maxAngle) {
    const children = adj.get(nodeId) || [];
    const angle = (minAngle + maxAngle) / 2;
    
    // Radius increases with depth: 0, 180, 320, 460...
    const radius = depth === 0 ? 0 : 160 + depth * 140;
    
    positioned.set(nodeId, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
    
    if (children.length > 0) {
      const angleStep = (maxAngle - minAngle) / children.length;
      children.forEach((childId, index) => {
        const childMin = minAngle + index * angleStep;
        const childMax = childMin + angleStep;
        layoutNode(childId, depth + 1, childMin, childMax);
      });
    }
  }

  // Start positioning from the root
  layoutNode(root.id, 0, 0, Math.PI * 2);

  // 3. Map nodes to React Flow format with stunning premium glass styles
  const rfNodes = nodes.map((n, i) => {
    const isRoot = i === 0 || n.type === "root";
    const depth = nodeDepths.get(n.id) || 0;
    
    let nodeStyle = {};
    if (isRoot) {
      // Depth 0: Core Nucleus
      nodeStyle = {
        background: "linear-gradient(135deg, hsl(244 97% 66%), hsl(290 85% 60%))",
        color: "#ffffff",
        border: "1px solid hsl(290 85% 66% / 0.8)",
        borderRadius: 16,
        padding: "12px 18px",
        fontSize: 14,
        fontWeight: 800,
        boxShadow: "0 0 35px hsl(244 97% 66% / 0.45)",
        minWidth: 130,
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderLeft: "6px solid hsl(188 95% 58%)",
      };
    } else if (depth === 1) {
      // Depth 1: Major Branches
      nodeStyle = {
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.85))",
        color: "#f8fafc",
        border: "1px solid hsl(205 100% 60% / 0.45)",
        borderRadius: 12,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 0 15px hsl(205 100% 60% / 0.1), 0 8px 30px -10px rgba(0, 0, 0, 0.5)",
        minWidth: 120,
        textAlign: "center",
        borderLeft: "4px solid hsl(205 100% 60%)",
        backdropFilter: "blur(12px)",
      };
    } else {
      // Depth 2+: Sub-concepts / leaves
      nodeStyle = {
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.7))",
        color: "#cbd5e1",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 500,
        boxShadow: "0 4px 20px -8px rgba(0, 0, 0, 0.4)",
        minWidth: 100,
        textAlign: "center",
        borderLeft: "3px solid hsl(188 95% 58% / 0.6)",
        backdropFilter: "blur(8px)",
      };
    }

    return {
      id: n.id,
      data: { label: n.label },
      position: positioned.get(n.id) || { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: nodeStyle,
    };
  });

  // 4. Map edges with vibrant energy line styles based on connection depth
  const rfEdges = edges.map((e, i) => {
    const sourceDepth = nodeDepths.get(e.source) || 0;
    
    // Choose beautiful color themes for neon connections
    let lineColor = "hsl(205 100% 60% / .6)"; // standard cyan
    let arrowColor = "hsl(205 100% 60%)";
    let glowShadow = "0 0 8px hsl(205 100% 60% / 0.3)";
    
    if (sourceDepth === 0) {
      // Root to Level 1: Purple energy beam
      lineColor = "hsl(270 95% 65% / .7)";
      arrowColor = "hsl(270 95% 65%)";
      glowShadow = "0 0 12px hsl(270 95% 65% / 0.4)";
    } else if (sourceDepth === 1) {
      // Level 1 to Level 2: Cyan energy beam
      lineColor = "hsl(188 95% 58% / .65)";
      arrowColor = "hsl(188 95% 58%)";
      glowShadow = "0 0 10px hsl(188 95% 58% / 0.35)";
    }

    return {
      id: `e${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "smoothstep",
      animated: true,
      markerEnd: { 
        type: MarkerType.ArrowClosed, 
        color: arrowColor,
      },
      style: { 
        stroke: lineColor, 
        strokeWidth: sourceDepth === 0 ? 2.2 : 1.5,
      },
      labelStyle: { 
        fill: "#e2e8f0", 
        fontSize: 11, 
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
      },
      labelBgPadding: [6, 4],
      labelBgStyle: { 
        fill: "rgba(15, 23, 42, 0.95)", 
        stroke: lineColor,
        strokeWidth: 1,
        rx: 6,
        ry: 6,
      },
    };
  });

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
        <Background variant="dots" color="rgba(255, 255, 255, 0.08)" gap={16} size={1} />
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
  // Esportazione SVG semplice di nodi ed etichette (i browser possono rasterizzare in PNG).
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
