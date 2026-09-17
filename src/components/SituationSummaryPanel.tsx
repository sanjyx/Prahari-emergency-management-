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
      className="rounded-xl border border-[#212d3d] bg-[#131b26] p-6 space-y-5"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#212d3d] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded border border-sky-500/30 bg-[#162334] text-sky-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                AI Disaster Situation Summary
              </h3>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-[#0f241a] px-2 py-0.5 font-mono text-xs font-semibold uppercase text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="size-3" /> Verified Data
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-[#162334] px-2 py-0.5 font-mono text-xs font-semibold uppercase text-sky-300 border border-sky-500/30">
                  <Sparkles className="size-3" /> AI Synthesis
                </span>
              </div>
            </div>
            <p className="font-mono text-xs text-slate-400 mt-0.5">
              Autonomous incident intelligence &amp; tactical briefing synthesized from active catchment telemetry
            </p>
          </div>
        </div>

        {/* Action & Timestamp */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Clock className="size-3.5 text-sky-400" />
            <span>Updated: <strong className="text-slate-200">{lastUpdatedFormatted}</strong></span>
          </div>
          <button
            type="button"
            onClick={fetchSummary}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded border border-sky-500/40 bg-[#162334] px-3.5 py-1.5 font-mono text-xs font-semibold text-sky-300 hover:bg-[#1e324b] disabled:opacity-50 transition-colors"
            title="Re-analyze active telemetry"
          >
            <RefreshCw className={`size-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Analyzing...' : 'Refresh Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Empty / Insufficient Data State */}
      {insufficientData ? (
        <div className="py-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
            <CheckCircle2 className="size-5" />
          </div>
          <h4 className="font-display font-bold uppercase tracking-wider text-sm text-slate-200">
            All Monitored Sectors Clear
          </h4>
          <p className="mt-2 font-mono text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {narrative}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5">
              <span className="font-mono text-xs text-slate-400 uppercase block font-semibold">Active Incidents</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-white">
                  {verifiedFacts.totalActive}
                </span>
                <span className="font-mono text-xs text-slate-500">logged</span>
              </div>
            </div>

            <div className="rounded-lg border border-rose-500/30 bg-[#170e12] p-3.5">
              <span className="font-mono text-xs text-rose-400 uppercase block font-semibold">Critical / High</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-rose-400">
                  {verifiedFacts.criticalCount + verifiedFacts.highCount}
                </span>
                <span className="font-mono text-xs text-rose-300/70">
                  ({verifiedFacts.criticalCount} crit)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-[#181308] p-3.5">
              <span className="font-mono text-xs text-amber-400 uppercase block font-semibold">People At Risk</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-amber-300">
                  {verifiedFacts.estimatedPeopleAffected.count}+
                </span>
                <span className="font-mono text-xs text-amber-400/70">
                  {verifiedFacts.estimatedPeopleAffected.verifiedReported > 0 ? 'verified' : 'est.'}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-red-500/30 bg-[#170e12] p-3.5">
              <span className="font-mono text-xs text-red-400 uppercase block font-semibold">Blocked Corridors</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-red-400">
                  {verifiedFacts.blockedCorridors.length}
                </span>
                <span className="font-mono text-xs text-red-400/70">impassable</span>
              </div>
            </div>

            <div className="rounded-lg border border-sky-500/30 bg-[#0e1724] p-3.5 col-span-2 sm:col-span-1">
              <span className="font-mono text-xs text-sky-400 uppercase block font-semibold">Primary Hotspot</span>
              <div className="mt-1 truncate">
                <span className="font-display font-bold text-sm text-white uppercase truncate block">
                  {verifiedFacts.mostAffectedZone.name.split(' ')[0]}
                </span>
                <span className="font-mono text-xs text-sky-300/80">
                  {verifiedFacts.mostAffectedZone.count} incidents
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Executive Briefing Card */}
          <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-4 text-xs text-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-sky-300 uppercase tracking-wider">
              <Sparkles className="size-3.5 text-sky-400" />
              <span>Executive Disaster Situation Briefing</span>
            </div>
            <div className="font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-line">
              {narrative}
            </div>
          </div>

          {/* Urgent Incident Spotlight & Shelter Status Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Urgent Incident Card (7 cols) */}
            {verifiedFacts.urgentIncident && (
              <div className="rounded-lg border border-rose-500/40 bg-[#170e12] p-4 md:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-2 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-400">
                        Most Urgent Incident Requiring Action
                      </span>
                    </div>
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-xs font-bold uppercase text-rose-200 border border-rose-500/40">
                      {verifiedFacts.urgentIncident.severity}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="font-display font-bold text-base text-white">
                      {verifiedFacts.urgentIncident.id} — {verifiedFacts.urgentIncident.title}
                    </h4>
                    <p className="mt-1.5 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {verifiedFacts.urgentIncident.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rose-500/20 pt-3 font-mono text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-rose-200">
                    <MapPin className="size-3.5 text-rose-400" />
                    <span>{verifiedFacts.urgentIncident.zoneName} · {verifiedFacts.urgentIncident.location.landmark}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {onNavigateToAStar && (
                      <button
                        type="button"
                        onClick={() => onNavigateToAStar(verifiedFacts.urgentIncident!)}
                        className="flex items-center gap-1.5 rounded bg-[#162334] border border-sky-500/40 px-3 py-1 text-sky-300 hover:bg-[#1e324b] text-xs font-medium"
                      >
                        <Send className="size-3 text-sky-400" />
                        <span>A* Route</span>
                      </button>
                    )}
                    {onNavigateToIncident && (
                      <button
                        type="button"
                        onClick={() => onNavigateToIncident(verifiedFacts.urgentIncident!)}
                        className="flex items-center gap-1.5 rounded bg-rose-600 px-3 py-1 text-white hover:bg-rose-500 font-semibold text-xs"
                      >
                        <span>Dispatch Console</span>
                        <ArrowRight className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Blocked Corridors & Shelter Info (5 cols) */}
            <div className="space-y-3 md:col-span-5">
              {/* Blocked Corridors Mini-Card */}
              <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="label-caps text-red-400 flex items-center gap-1.5 font-bold">
                    <Ban className="size-3.5" /> Blocked Transport Links ({verifiedFacts.blockedCorridors.length})
                  </span>
                </div>
                {verifiedFacts.blockedCorridors.length === 0 ? (
                  <p className="font-mono text-xs text-emerald-400 leading-relaxed">All primary highway links currently open.</p>
                ) : (
                  <ul className="space-y-1.5 font-mono text-xs text-slate-300">
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
                <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-caps text-emerald-400 flex items-center gap-1.5 font-bold">
                      <Building className="size-3.5" /> Safe Shelters ({verifiedFacts.mostAffectedZone.name})
                    </span>
                  </div>
                  <div className="font-mono text-xs text-slate-300 space-y-1">
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
          <div className="border-t border-[#212d3d] pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="label-caps text-sky-300 font-bold">
                Actionable Command Directives (Data-Derived)
              </span>
              <span className="font-mono text-xs text-slate-400">
                Prioritized Tactical Recommendations
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {keyRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5 text-xs flex flex-col justify-between hover:border-sky-500/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                          rec.priority === 'URGENT'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : rec.priority === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="font-mono text-xs text-slate-400 truncate max-w-[120px]">
                        Target: {rec.target}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-300 leading-relaxed">
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
