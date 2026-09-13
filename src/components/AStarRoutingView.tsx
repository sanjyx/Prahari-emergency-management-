import React, { useState } from 'react';
import {
  Route,
  Navigation,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Clock,
  Zap,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { AStarPathResult, RiskLevel, RouteEdge, RouteNode, UserProfile } from '../types';
import { ROUTE_EDGES, ROUTE_NODES } from '../data/zones';
import { findAStarEmergencyRoute } from '../services/aStarRouting';

interface AStarRoutingViewProps {
  onApplyRouteToMap: (route: AStarPathResult) => void;
  zoneRiskMap: Record<string, RiskLevel>;
  responders: UserProfile[];
  onOpenMap: () => void;
}

export const AStarRoutingView: React.FC<AStarRoutingViewProps> = ({
  onApplyRouteToMap,
  zoneRiskMap,
  responders,
  onOpenMap
}) => {
  const [startNodeId, setStartNodeId] = useState<string>(ROUTE_NODES[0].id);
  const [targetNodeId, setTargetNodeId] = useState<string>(ROUTE_NODES[3].id);
  const [blockedEdges, setBlockedEdges] = useState<Set<string>>(new Set());
  const [routeResult, setRouteResult] = useState<AStarPathResult>(() =>
    findAStarEmergencyRoute(ROUTE_NODES[0].id, ROUTE_NODES[3].id, ROUTE_NODES, ROUTE_EDGES, zoneRiskMap, new Set())
  );

  const handleComputeRoute = (start = startNodeId, target = targetNodeId, blocks = blockedEdges) => {
    const result = findAStarEmergencyRoute(start, target, ROUTE_NODES, ROUTE_EDGES, zoneRiskMap, blocks);
    setRouteResult(result);
    onApplyRouteToMap(result);
  };

  const toggleBlockEdge = (edgeKey: string) => {
    const next = new Set(blockedEdges);
    if (next.has(edgeKey)) {
      next.delete(edgeKey);
    } else {
      next.add(edgeKey);
    }
    setBlockedEdges(next);
    handleComputeRoute(startNodeId, targetNodeId, next);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              A* Emergency Evacuation &amp; Dispatch Pathfinder
            </h2>
            <span className="rounded border border-sky-500/40 bg-sky-950/60 px-2 py-0.5 font-mono text-[0.65rem] text-sky-300">
              Heuristic Graph Engine
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            Topological graph traversal factoring slope gradients, washed out culverts, and flood hazard costs
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            handleComputeRoute();
            onOpenMap();
          }}
          className="flex items-center gap-1.5 rounded bg-sky-600 px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-lg transition-colors hover:bg-sky-500"
        >
          <Layers className="size-4" />
          <span>Project on Topological Map</span>
        </button>
      </div>

      {/* Engineering Integrity Disclaimer Notice */}
      <div className="rounded border border-amber-500/30 bg-amber-950/20 p-3 font-mono text-xs text-amber-300/90 flex items-start gap-2.5">
        <Info className="size-4 shrink-0 text-amber-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Pathfinder Notice:</strong> Routes are computed mathematically using the A* heuristic search algorithm ($f(n) = g(n) + h(n)$) over the calibrated hilly catchment road graph. Traversal costs incorporate slope steepness and flood risk penalties. This model represents terrain topology and surveyed emergency bypasses.
        </p>
      </div>

      {/* Routing Controller Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Form: Selectors & Obstacle Toggles (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 space-y-4 text-xs">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-2">
              Route Parameters
            </h3>

            {/* Start Node */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Start Origin (Last Known Location / Base)
              </label>
              <select
                id="select-start-node"
                value={startNodeId}
                onChange={(e) => {
                  setStartNodeId(e.target.value);
                  handleComputeRoute(e.target.value, targetNodeId, blockedEdges);
                }}
                className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-slate-200 outline-none focus:border-sky-500"
              >
                {ROUTE_NODES.map((node) => (
                  <option key={node.id} value={node.id}>
                    [{node.type.toUpperCase()}] {node.name} ({node.elevationM}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Node */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Target Destination (Shelter / Incident / Checkpoint)
              </label>
              <select
                id="select-target-node"
                value={targetNodeId}
                onChange={(e) => {
                  setTargetNodeId(e.target.value);
                  handleComputeRoute(startNodeId, e.target.value, blockedEdges);
                }}
                className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-slate-200 outline-none focus:border-sky-500"
              >
                {ROUTE_NODES.map((node) => (
                  <option key={node.id} value={node.id}>
                    [{node.type.toUpperCase()}] {node.name} ({node.elevationM}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Obstacle / Hazard Simulation Toggles */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="label-caps text-amber-400">Simulate Road Obstacles / Washouts</span>
                <span className="font-mono text-[0.62rem] text-slate-400">A* will dynamically detour</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {ROUTE_EDGES.filter((e) => e.isBridge || e.isRiverAdjacent || e.slopePct > 20).map((edge, i) => {
                  const key = `${edge.from}->${edge.to}`;
                  const isBlocked = blockedEdges.has(key);
                  const fromName = ROUTE_NODES.find((n) => n.id === edge.from)?.name.split(' ')[0];
                  const toName = ROUTE_NODES.find((n) => n.id === edge.to)?.name.split(' ')[0];

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleBlockEdge(key)}
                      className={`flex w-full items-center justify-between rounded border p-2 text-left transition-colors font-mono text-[0.68rem] ${
                        isBlocked
                          ? 'border-rose-500/60 bg-rose-950/40 text-rose-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold">{fromName} ↔ {toName}</span>
                        <span className="block text-[0.6rem] text-slate-500">
                          {edge.isBridge ? 'Bridge / River Crossing' : `Steep Ridge (${edge.slopePct}% slope)`}
                        </span>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[0.6rem] uppercase font-bold shrink-0 ml-2 ${
                          isBlocked ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isBlocked ? 'BLOCKED' : 'CLEAR'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleComputeRoute()}
              className="w-full rounded bg-sky-600 py-2.5 font-mono text-xs font-bold text-white hover:bg-sky-500"
            >
              Recompute A* Route
            </button>
          </div>
        </div>

        {/* Right Panel: Path Results & Telemetry (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="label-caps text-sky-400">Optimal Safe Route Solution</span>
                <h3 className="font-display text-base font-bold uppercase text-white mt-0.5">
                  Path Metrics
                </h3>
              </div>

              <span
                className={`rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                  routeResult.pathFound
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {routeResult.pathFound ? 'Calculated' : 'Blocked'}
              </span>
            </div>

            {/* Metric Summary Cards */}
            <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <span className="text-[0.65rem] text-slate-400 uppercase block mb-1">Total Distance</span>
                <span className="text-xl font-bold text-white">
                  {routeResult.totalDistanceKm} <span className="text-xs font-normal text-slate-400">km</span>
                </span>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <span className="text-[0.65rem] text-slate-400 uppercase block mb-1">Estimated ETA</span>
                <span className="text-xl font-bold text-sky-300">
                  {routeResult.estimatedTimeMin} <span className="text-xs font-normal text-slate-400">min</span>
                </span>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <span className="text-[0.65rem] text-slate-400 uppercase block mb-1">Risk Rating</span>
                <span
                  className={`text-base font-bold uppercase ${
                    routeResult.overallRisk === 'Critical'
                      ? 'text-rose-400'
                      : routeResult.overallRisk === 'High'
                      ? 'text-orange-400'
                      : routeResult.overallRisk === 'Moderate'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {routeResult.overallRisk}
                </span>
              </div>
            </div>

            {/* Hazard Warnings or Detours */}
            {routeResult.hazardWarnings.length > 0 && (
              <div className="mt-3 space-y-1 rounded border border-amber-500/30 bg-amber-950/20 p-3 font-mono text-xs text-amber-300">
                <span className="font-bold flex items-center gap-1 mb-1">
                  <AlertTriangle className="size-3.5" /> Detour &amp; Safety Advisories:
                </span>
                {routeResult.hazardWarnings.map((warn, i) => (
                  <div key={i} className="text-[0.68rem] text-slate-300">
                    • {warn}
                  </div>
                ))}
              </div>
            )}

            {/* Step-by-Step Waypoint Traversal Sequence */}
            <div className="mt-4 border-t border-slate-800 pt-3">
              <span className="label-caps mb-2 block">Waypoint Traversal Sequence</span>
              <div className="space-y-2">
                {routeResult.nodes.map((node, idx) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-3 rounded border border-slate-800/80 bg-slate-950/70 p-2 text-xs"
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 font-mono text-[0.65rem] font-bold text-sky-400">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{node.name}</span>
                        <span className="font-mono text-[0.65rem] text-slate-400">
                          {node.elevationM}m elevation
                        </span>
                      </div>
                      <span className="font-mono text-[0.62rem] text-slate-400 capitalize">
                        Type: {node.type} · Sector: {node.zoneId || 'Transit Link'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
