import React from 'react';
import { Shield, Award, Cpu, Database, Radio, Globe, Layers, CheckCircle } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Brand Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-6 text-center space-y-3">
        <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/60 text-cyan-400">
          <Shield className="size-8" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
            PRAHARI: Hilly Emergency &amp; Disaster Management Platform
          </h1>
          <p className="font-mono text-xs text-cyan-400 mt-1">
            Upgraded Full-Stack Disaster Command &amp; Early Warning System
          </p>
        </div>
        <p className="text-xs text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Prahari is a specialized emergency and disaster-management platform designed for high-risk mountain catchments. Combining real-time hydrological risk scoring, citizen incident dispatch, responder tracking with Last Known Location telemetry, offline queuing, and A* pathfinding.
        </p>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Cpu className="size-4" />
            <h3 className="font-display text-sm font-bold uppercase">Multi-Variable Risk Engine</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Computes a deterministic 0–100 vulnerability score fusing 24h precipitation, soil moisture saturation, real-time river stage radar gauges, and catchment slope gradient with lead time prediction.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Radio className="size-4" />
            <h3 className="font-display text-sm font-bold uppercase">Low-Connectivity &amp; Offline Sync</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Engineered for mountain corridors with erratic GSM connectivity. Critical incidents and responder coordinates queue locally and automatically reconcile upon reconnection with idempotency protection.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2 text-sky-400 mb-2">
            <Layers className="size-4" />
            <h3 className="font-display text-sm font-bold uppercase">A* Emergency Pathfinder</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Mathematical heuristic graph search ($f(n) = g(n) + h(n)$) computing optimal evacuation and dispatch routes, avoiding critical flood washouts and road blocks across mountain topography.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Award className="size-4" />
            <h3 className="font-display text-sm font-bold uppercase">Government &amp; Agency Ready</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Multi-role role-based access control (Citizen, First Responder, Authority/SDMA, Admin) with privacy-protected GPS tracking, public alerts, and audit logs.
          </p>
        </div>
      </div>
    </div>
  );
};
