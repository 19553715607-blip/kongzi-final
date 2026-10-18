"use client";

import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import { getNeighborhood } from "@/lib/api";
import { t, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import type { GraphData, GraphNode } from "@/lib/types";
import ChineseBackdrop from "@/components/ChineseBackdrop";

// 类型 / 关系 / 快捷起点的中文标签移入 lib/i18n，这里只保留 key
const TYPE_KEY: Record<string, string> = {
  person: "graph.person",
  concept: "graph.concept",
  passage: "graph.passage",
  proposition: "graph.proposition",
  school: "graph.school",
};
const TYPE_COLORS: Record<string, string> = {
  person: "#993C1D",
  concept: "#0F6E56",
  passage: "#854F0B",
  proposition: "#534AB7",
  school: "#1E5F8E",
};
const EDGE_KEY: Record<string, string> = {
  DISCIPLE_OF: "rel.mentor",
  RELATED_TO: "rel.related",
  MENTIONS: "rel.mention",
  PROPOSED: "rel.propose",
  ABOUT: "rel.discuss",
  BELONGS_TO: "rel.belong",
  FROM: "rel.from",
};
const START_NODES = [
  { id: "ren", key: "graph.node.ren" },
  { id: "li", key: "graph.node.li" },
  { id: "junzi", key: "graph.node.junzi" },
  { id: "yi", key: "graph.node.yi" },
  { id: "kongzi", key: "graph.node.kongzi" },
];
const FALLBACK_TYPE: GraphNode["type"] = "concept";

function normalizeGraph(input: GraphData): GraphData {
  const allowedTypes = new Set(Object.keys(TYPE_KEY));
  const nodeMap = new Map<string, GraphNode>();

  input.nodes.forEach((node) => {
    if (!node?.id) return;
    const type = allowedTypes.has(node.type) ? node.type : FALLBACK_TYPE;
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, {
        ...node,
        type: type as GraphNode["type"],
        label: node.label || node.id,
        color: node.color || TYPE_COLORS[type],
        meta: node.meta || {},
      });
    }
  });

  const edgeKeys = new Set<string>();
  const edges = input.edges.filter((edge) => {
    if (!edge?.source || !edge?.target || !edge.label) return false;
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) return false;
    const key = `${edge.source}\u0000${edge.target}\u0000${edge.label}`;
    if (edgeKeys.has(key)) return false;
    edgeKeys.add(key);
    return true;
  });

  return { ...input, nodes: Array.from(nodeMap.values()), edges };
}

export default function GraphPage() {
  const [lang] = useLang();
  const [center, setCenter] = useState("ren");
  const [depth, setDepth] = useState(2);
  const [data, setData] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<string>("ren");
  const [err, setErr] = useState("");
  const [dark, setDark] = useState(false);
  // 视口宽度：窄屏(<md)时画布容器被 hidden，需要在跨越断点时重新评估初始化
  const [vp, setVp] = useState(0);
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const onResize = () => setVp(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 观察主题切换，驱动 echarts 重绘
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setErr("");
    getNeighborhood(center, depth)
      .then((d) => {
        setData(normalizeGraph(d));
        setSelected(center);
      })
      .catch(() => setErr(t("graph.noBackend", lang)));
  }, [center, depth, lang]);

  // ECharts（自包含：每次挂载/数据变更自建自销，StrictMode 安全）
  useEffect(() => {
    const el = elRef.current;
    // 窄屏容器 display:none → 宽高为 0，此时初始化 roam 坐标系会崩溃；跳过，等 vp 变化到桌面再建
    if (!el || !data || el.clientWidth === 0 || el.clientHeight === 0) return;
    const chart = echarts.init(el);
    chartRef.current = chart;

    const catIndex = Object.keys(TYPE_KEY);
    const categories = catIndex.map((ty) => ({
      name: t(TYPE_KEY[ty], lang),
      itemStyle: { color: TYPE_COLORS[ty] },
    }));
    const labelColor = dark ? "#ECE6DA" : "#2C2C2A";
    const edgeColor = dark ? "#9C9486" : "#888780";
    const lineColor = dark ? "rgba(255,255,255,0.16)" : "#c8c2b6";

    chart.setOption({
      // 柔和进场：力导图缓缓铺开，切换节点时平滑过渡
      animationDuration: 1200,
      animationEasing: "cubicOut",
      animationDurationUpdate: 600,
      animationEasingUpdate: "cubicOut",
      tooltip: {
        formatter: (p: { dataType?: string; data?: { label?: string; en?: string } }) =>
          p.dataType === "node"
            ? `${p.data?.label ?? ""}${p.data?.en ? `<br/><span style="color:#999">${p.data.en}</span>` : ""}`
            : "",
      },
      legend: [
        {
          data: categories.map((c) => c.name),
          bottom: 0,
          textStyle: { color: labelColor, fontSize: 11 },
        },
      ],
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          categories,
          force: { repulsion: 240, edgeLength: 120, gravity: 0.08 },
          label: {
            show: true,
            position: "right",
            fontSize: 12,
            color: labelColor,
            formatter: (p: { data: { label: string } }) => p.data.label,
          },
          edgeLabel: {
            show: true,
            fontSize: 9,
            color: edgeColor,
            formatter: (p: { data: { rel: string } }) =>
              t(EDGE_KEY[p.data.rel], lang) ?? p.data.rel,
          },
          emphasis: { focus: "adjacency", lineStyle: { width: 3 } },
          lineStyle: { color: lineColor, curveness: 0.06 },
          data: data.nodes.map((n) => ({
            id: n.id,
            name: n.id,
            label: n.label,
            en: n.label_en,
            value: n.type,
            category: Math.max(0, catIndex.indexOf(n.type)),
            symbolSize: n.id === center ? 46 : 30,
            itemStyle: { color: n.color },
          })),
          edges: data.edges.map((e) => ({ source: e.source, target: e.target, rel: e.label })),
        },
      ],
    });

    const onClick = (params: { dataType?: string; data?: { id?: string } }) => {
      if (params.dataType === "node" && params.data?.id) setSelected(params.data.id);
    };
    const onDbl = (params: { dataType?: string; data?: { id?: string } }) => {
      if (params.dataType === "node" && params.data?.id) setCenter(params.data.id);
    };
    chart.on("click", onClick as never);
    chart.on("dblclick", onDbl as never);
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [data, center, dark, lang, vp]);

  const nodeMap = useMemo(() => {
    const m: Record<string, GraphNode> = {};
    data?.nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [data]);

  const relations = useMemo(() => {
    if (!data) return [];
    return data.edges
      .filter((e) => e.source === selected || e.target === selected)
      .map((e) => ({
        rel: e.label,
        other: nodeMap[e.source === selected ? e.target : e.source],
      }))
      .filter((r) => r.other);
  }, [data, selected, nodeMap]);

  if (err)
    return (
      <div className="error-state">
        <span className="icon-plate">!</span>
        <span className="state-title">{t("state.error.title", lang)}</span>
        <span className="state-sub">{err}</span>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          {t("state.retry", lang)}
        </button>
      </div>
    );

  return (
    <div className="relative space-y-4">
      <ChineseBackdrop variant="waves" />
      {/* 控制条 */}
      <Reveal className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        <span className="text-xs text-faint">{t("graph.start", lang)}</span>
        {START_NODES.map((n) => (
          <button
            key={n.id}
            onClick={() => setCenter(n.id)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              center === n.id ? "bg-accent text-white" : "border border-line text-muted hover:bg-surface-2"
            }`}
          >
            {t(n.key, lang)}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        <span className="text-xs text-faint">{t("graph.depth", lang)}</span>
        {[1, 2, 3].map((d) => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              depth === d ? "bg-accent-soft text-accent" : "bg-surface-2 text-faint hover:text-muted"
            }`}
          >
            {d}
          </button>
        ))}
        <span className="ms-auto hidden text-xs text-faint sm:inline">
          {t("graph.hint", lang)}
        </span>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <Reveal delay={80}>
          <div
            ref={elRef}
            className="hidden h-[520px] rounded-2xl border border-line bg-surface md:block"
          />
        </Reveal>

        <aside className="space-y-2">
          {nodeMap[selected] && (
            <Reveal delay={120} className="card-hover rounded-xl border border-line bg-surface p-4">
              <div
                className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] text-white"
                style={{ background: nodeMap[selected].color }}
              >
                {t(TYPE_KEY[nodeMap[selected].type], lang)}
              </div>
              <div className="font-serif text-lg text-fg">{nodeMap[selected].label}</div>
              {nodeMap[selected].label_en && (
                <div className="text-xs italic text-faint">{nodeMap[selected].label_en}</div>
              )}
            </Reveal>
          )}
          <div className="px-1 text-xs text-faint">{t("graph.relationsN", lang).replace("{n}", String(relations.length))}</div>
          {relations.map((r, i) => (
            <Reveal key={`${r.other.id}-${r.rel}`} delay={160 + i * 50}>
              <button
                onClick={() => setCenter(r.other.id)}
                className="card-hover block w-full rounded-lg border border-line bg-surface p-3 text-start"
              >
                <span className="me-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-accent">
                  {t(EDGE_KEY[r.rel], lang) ?? r.rel}
                </span>
                <span className="font-serif text-sm text-fg">{r.other.label}</span>
                <span className="ms-1 text-[10px] text-faint">{t(TYPE_KEY[r.other.type], lang)}</span>
              </button>
            </Reveal>
          ))}
        </aside>
      </div>
    </div>
  );
}
