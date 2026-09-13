import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Flame,
  Users,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Building,
  Ban
} from 'lucide-react';
import { AlertItem, Incident, UserProfile, Zone } from '../types';
import { generateSituationSummary, SituationSummaryData } from '../services/aiAssistant';

interface SituationSummaryPanelProps {
  incidents: Incident[];
  alerts: AlertItem[];
  zones: Zone[];
  responders: UserProfile[];
  onNavigateToIncident?: (incident: Incident) => void;
  onNavigateToAStar?: (incident: Incident) => void;
}

export const SituationSummaryPanel: React.FC<SituationSummaryPanelProps> = ({
  incidents,
  alerts,
  zones,
  responders,
  onNavigateToIncident,
  onNavigateToAStar
}) => {
  const [summary, setSummary] = useState<SituationSummaryData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSummary = async () => {
    setIsRefreshing(true);
    try {
      const data = await generateSituationSummary(incidents, alerts, zones, responders);
      setSummary(data);
    } catch (e) {
      console.error('Failed to generate situation summary:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Re-generate automatically when incident list or alert list updates
  useEffect(() => {
    fetchSummary();
  }, [incidents, alerts, zones, responders]);

  if (!summary) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-48 bg-slate-800 rounded"></div>
          <div className="h-4 w-24 bg-slate-800 rounded"></div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="h-16 bg-slate-800/60 rounded"></div>
          <div className="h-16 bg-slate-800/60 rounded"></div>
          <div className="h-16 bg-slate-800/60 rounded"></div>
          <div className="h-16 bg-slate-800/60 rounded"></div>
        </div>
      </div>
    );
  }

  const { verifiedFacts, keyRecommendations, narrative, insufficientData, lastUpdatedFormatted } = summary;

  return (
    <div
      id="ai-situation-summary-panel"
      className="rounded-lg border border-purple-500/30 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-4 shadow-xl relative overflow-hidden"
    >
      {/* Background Subtle Radar Glow */}
      <div className="absolute -top-16 -right-16 size-56 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-inner">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                AI Disaster Situation Summary
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="size-2.5" /> Verified Data
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-purple-950/80 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase text-purple-300 border border-purple-500/40">
                  <Sparkles className="size-2.5" /> AI Synthesis
                </span>
              </div>
            </div>
            <p className="font-mono text-[0.65rem] text-slate-400">
              Autonomous incident intelligence &amp; tactical briefing synthesized from active catchment telemetry
            </p>
          </div>
        </div>

        {/* Action & Timestamp */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-mono text-[0.68rem] text-slate-400">
            <Clock className="size-3 text-cyan-400" />
            <span>Updated: <strong className="text-slate-200">{lastUpdatedFormatted}</strong></span>
          </div>
          <button
            type="button"
            onClick={fetchSummary}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded border border-purple-500/40 bg-purple-950/40 px-2.5 py-1 font-mono text-xs font-semibold text-purple-300 hover:bg-purple-900/60 disabled:opacity-50 transition-all shadow-sm"
            title="Re-analyze active telemetry"
          >
            <RefreshCw className={`size-3 text-purple-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Analyzing...' : 'Refresh Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Empty / Insufficient Data State */}
      {insufficientData ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
            <CheckCircle2 className="size-5" />
          </div>
          <h4 className="font-display font-bold uppercase tracking-wider text-sm text-slate-200">
            All Monitored Sectors Clear
          </h4>
          <p className="mt-1 font-mono text-xs text-slate-400 max-w-md mx-auto">
            {narrative}
          </p>
        </div>
      ) : (
        <div className="mt-3.5 space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded border border-slate-800 bg-slate-950/70 p-2.5">
              <span className="font-mono text-[0.62rem] text-slate-400 uppercase block">Active Incidents</span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-bold text-white">
                  {verifiedFacts.totalActive}
                </span>
                <span className="font-mono text-[0.62rem] text-slate-500">logged</span>
              </div>
            </div>

            <div className="rounded border border-rose-500/30 bg-rose-950/20 p-2.5">
              <span className="font-mono text-[0.62rem] text-rose-400 uppercase block">Critical / High</span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-bold text-rose-400">
                  {verifiedFacts.criticalCount + verifiedFacts.highCount}
                </span>
                <span className="font-mono text-[0.62rem] text-rose-300/60">
                  ({verifiedFacts.criticalCount} crit)
                </span>
              </div>
            </div>

            <div className="rounded border border-amber-500/30 bg-amber-950/20 p-2.5">
              <span className="font-mono text-[0.62rem] text-amber-400 uppercase block">People At Risk</span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-bold text-amber-300">
                  {verifiedFacts.estimatedPeopleAffected.count}+
                </span>
                <span className="font-mono text-[0.62rem] text-amber-400/60">
                  {verifiedFacts.estimatedPeopleAffected.verifiedReported > 0 ? 'verified' : 'est.'}
                </span>
              </div>
            </div>

            <div className="rounded border border-red-500/30 bg-red-950/20 p-2.5">
              <span className="font-mono text-[0.62rem] text-red-400 uppercase block">Blocked Corridors</span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-bold text-red-400">
                  {verifiedFacts.blockedCorridors.length}
                </span>
                <span className="font-mono text-[0.62rem] text-red-400/60">impassable</span>
              </div>
            </div>

            <div className="rounded border border-cyan-500/30 bg-cyan-950/20 p-2.5 col-span-2 sm:col-span-1">
              <span className="font-mono text-[0.62rem] text-cyan-400 uppercase block">Primary Hotspot</span>
              <div className="mt-0.5 truncate">
                <span className="font-display font-bold text-xs text-white uppercase truncate block">
                  {verifiedFacts.mostAffectedZone.name.split(' ')[0]}
                </span>
                <span className="font-mono text-[0.62rem] text-cyan-300/70">
                  {verifiedFacts.mostAffectedZone.count} incidents
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Executive Briefing Card */}
          <div className="rounded border border-purple-500/20 bg-purple-950/15 p-3.5 text-xs text-slate-200">
            <div className="flex items-center gap-1.5 mb-1.5 font-mono text-[0.65rem] font-bold text-purple-300 uppercase tracking-wider">
              <Sparkles className="size-3 text-purple-400" />
              <span>Executive Disaster Situation Briefing</span>
            </div>
            <div className="space-y-2 font-mono text-[0.72rem] leading-relaxed text-slate-300 whitespace-pre-line">
              {narrative}
            </div>
          </div>

          {/* Urgent Incident Spotlight & Shelter Status Row */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* Urgent Incident Card (7 cols) */}
            {verifiedFacts.urgentIncident && (
              <div className="rounded border border-rose-500/50 bg-rose-950/25 p-3 md:col-span-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex size-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-mono text-[0.65rem] font-bold uppercase tracking-wider text-rose-400">
                      Most Urgent Incident Requiring Action
                    </span>
                  </div>
                  <span className="rounded bg-rose-500/30 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase text-rose-200 border border-rose-500/50">
                    {verifiedFacts.urgentIncident.severity}
                  </span>
                </div>

                <div className="mt-2">
                  <h4 className="font-display font-bold text-sm text-white">
                    {verifiedFacts.urgentIncident.id} — {verifiedFacts.urgentIncident.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                    {verifiedFacts.urgentIncident.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-rose-500/20 pt-2 font-mono text-[0.68rem] text-slate-400">
                    <div className="flex items-center gap-1 text-rose-200">
                      <MapPin className="size-3 text-rose-400" />
                      <span>{verifiedFacts.urgentIncident.zoneName} · {verifiedFacts.urgentIncident.location.landmark}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onNavigateToAStar && (
                        <button
                          type="button"
                          onClick={() => onNavigateToAStar(verifiedFacts.urgentIncident!)}
                          className="flex items-center gap-1 rounded bg-cyan-600/30 border border-cyan-500/50 px-2 py-0.5 text-cyan-300 hover:bg-cyan-600/50"
                        >
                          <Send className="size-2.5" />
                          <span>A* Route</span>
                        </button>
                      )}
                      {onNavigateToIncident && (
                        <button
                          type="button"
                          onClick={() => onNavigateToIncident(verifiedFacts.urgentIncident!)}
                          className="flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-white hover:bg-rose-500 font-semibold"
                        >
                          <span>Dispatch Console</span>
                          <ArrowRight className="size-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Blocked Corridors & Shelter Info (5 cols) */}
            <div className="space-y-2 md:col-span-5">
              {/* Blocked Corridors Mini-Card */}
              <div className="rounded border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="label-caps text-red-400 flex items-center gap-1">
                    <Ban className="size-3" /> Blocked Transport Links ({verifiedFacts.blockedCorridors.length})
                  </span>
                </div>
                {verifiedFacts.blockedCorridors.length === 0 ? (
                  <p className="font-mono text-[0.65rem] text-emerald-400">All primary highway links currently open.</p>
                ) : (
                  <ul className="space-y-1 font-mono text-[0.68rem] text-slate-300">
                    {verifiedFacts.blockedCorridors.slice(0, 3).map((route, i) => (
                      <li key={i} className="truncate text-rose-200">
                        • {route}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Shelter Readiness Card */}
              {verifiedFacts.shelterStatus.length > 0 && (
                <div className="rounded border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="label-caps text-emerald-400 flex items-center gap-1">
                      <Building className="size-3" /> Safe Shelters ({verifiedFacts.mostAffectedZone.name})
                    </span>
                  </div>
                  <div className="font-mono text-[0.68rem] text-slate-300 space-y-0.5">
                    <div>Primary: <strong className="text-white">{verifiedFacts.shelterStatus[0].topShelter}</strong></div>
                    <div className="text-emerald-400 font-semibold">
                      Capacity: {verifiedFacts.shelterStatus[0].capacity} evacuees
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Tactical Recommendations */}
          <div className="border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="label-caps text-purple-300">
                Actionable Command Directives (Data-Derived)
              </span>
              <span className="font-mono text-[0.62rem] text-slate-400">
                Prioritized Tactical Recommendations
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {keyRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs flex flex-col justify-between hover:border-purple-500/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[0.6rem] font-bold uppercase ${
                          rec.priority === 'URGENT'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : rec.priority === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="font-mono text-[0.62rem] text-slate-400 truncate max-w-[120px]">
                        Target: {rec.target}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[0.68rem] text-slate-300 leading-relaxed">
                      {rec.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
