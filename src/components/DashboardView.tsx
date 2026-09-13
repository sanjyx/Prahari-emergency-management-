import React from 'react';
import {
  AlertTriangle,
  Flame,
  CloudRain,
  Mountain,
  Waves,
  TrendingUp,
  MapPin,
  Clock,
  Send,
  RefreshCw,
  Info,
  ShieldAlert,
  Mic
} from 'lucide-react';
import { AlertItem, Incident, RiskResult, UserProfile, Zone } from '../types';
import { RISK_LEVELS, ZONES } from '../data/zones';
import { SituationSummaryPanel } from './SituationSummaryPanel';
import { isFeatureEnabled } from '../config/features';

interface DashboardViewProps {
  selectedZone: Zone;
  onSelectZone: (zone: Zone) => void;
  rainMultiplier: number;
  onMultiplierChange: (val: number) => void;
  riskResult: RiskResult;
  onOpenIncidentModal: () => void;
  onOpenVoiceModal?: () => void;
  onNavigateToRouting: () => void;
  incidents?: Incident[];
  alerts?: AlertItem[];
  responders?: UserProfile[];
  onSelectIncident?: (incident: Incident) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedZone,
  onSelectZone,
  rainMultiplier,
  onMultiplierChange,
  riskResult,
  onOpenIncidentModal,
  onOpenVoiceModal,
  onNavigateToRouting,
  incidents = [],
  alerts = [],
  responders = [],
  onSelectIncident
}) => {
  const currentRiskMeta = RISK_LEVELS[riskResult.level];

  // Presets
  const applyPreset = (mult: number) => {
    onMultiplierChange(mult);
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Status / Alert Banner */}
      <div
        className={`flex items-center justify-between rounded-lg border p-3.5 ${
          riskResult.level === 'Critical'
            ? 'border-rose-500/60 bg-rose-950/40 text-rose-200'
            : riskResult.level === 'High'
            ? 'border-orange-500/50 bg-orange-950/40 text-orange-200'
            : riskResult.level === 'Moderate'
            ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
            : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/40">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                {selectedZone.name} — Status:
              </span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold uppercase ${currentRiskMeta.chip}`}
              >
                {riskResult.level} Risk ({riskResult.score}/100)
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-300">{currentRiskMeta.banner}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {isFeatureEnabled('voiceReporting') && onOpenVoiceModal && (
            <button
              id="dash-voice-report-btn"
              type="button"
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 rounded border border-purple-500/50 bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-600/30"
              title="Speak emergency report with Web Speech recognition"
            >
              <Mic className="size-3.5 text-purple-400" />
              Voice Report
            </button>
          )}
          {isFeatureEnabled('citizenReporting') && (
            <button
              type="button"
              onClick={onOpenIncidentModal}
              className="flex items-center gap-1.5 rounded border border-rose-500/50 bg-rose-600/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-600/30"
            >
              <Flame className="size-3.5 text-rose-400" />
              Report Incident
            </button>
          )}
          {isFeatureEnabled('aStarRouting') && (
            <button
              type="button"
              onClick={onNavigateToRouting}
              className="flex items-center gap-1.5 rounded border border-cyan-500/50 bg-cyan-600/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-600/30"
            >
              <Send className="size-3.5 text-cyan-400" />
              A* Evacuation Route
            </button>
          )}
        </div>
      </div>

      {/* AI DISASTER SITUATION SUMMARY PANEL (with safe deterministic fallback) */}
      {isFeatureEnabled('aiSituationSummary') ? (
        <SituationSummaryPanel
          incidents={incidents}
          alerts={alerts}
          zones={ZONES}
          responders={responders}
          onNavigateToIncident={onSelectIncident}
          onNavigateToAStar={(inc) => onNavigateToRouting()}
        />
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
              Disaster Operations Snapshot (Deterministic Telemetry)
            </span>
            <span className="font-mono text-[0.65rem] text-slate-400">
              AI Summary Module Disabled
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-slate-400 block text-[0.62rem] uppercase">Total Incidents</span>
              <span className="text-lg font-bold text-white">{incidents.length}</span>
            </div>
            <div className="rounded border border-rose-500/30 bg-rose-950/20 p-2.5">
              <span className="text-rose-400 block text-[0.62rem] uppercase">Critical &amp; High</span>
              <span className="text-lg font-bold text-rose-300">
                {incidents.filter((i) => i.severity === 'critical' || i.severity === 'high').length}
              </span>
            </div>
            <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5">
              <span className="text-emerald-400 block text-[0.62rem] uppercase">Active Responders</span>
              <span className="text-lg font-bold text-emerald-300">
                {responders.filter((r) => r.isOnline).length} units
              </span>
            </div>
            <div className="rounded border border-cyan-500/30 bg-cyan-950/20 p-2.5">
              <span className="text-cyan-400 block text-[0.62rem] uppercase">Active Alerts</span>
              <span className="text-lg font-bold text-cyan-300">{alerts.length} broadcast</span>
            </div>
          </div>
        </div>
      )}

      {/* Zone Selector Strip */}

      <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2">
        <div className="flex items-center justify-between pb-1.5 px-2">
          <span className="label-caps">Monitored Hilly Catchment Sectors</span>
          <span className="font-mono text-[0.65rem] text-slate-400">
            6 Instrumented Watersheds
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          {ZONES.map((zone) => {
            const isSelected = zone.id === selectedZone.id;
            return (
              <button
                key={zone.id}
                id={`select-zone-${zone.id}`}
                type="button"
                onClick={() => onSelectZone(zone)}
                className={`flex flex-col rounded p-2 text-left transition-all ${
                  isSelected
                    ? 'border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 shadow-sm'
                    : 'border border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold uppercase tracking-tight text-xs truncate">
                    {zone.name.split(' ')[0]}
                  </span>
                  <span className="font-mono text-[0.6rem] text-slate-500">
                    {zone.elevationM}m
                  </span>
                </div>
                <span className="truncate text-[0.68rem] text-slate-400">
                  {zone.district}, {zone.state}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Gauge & Factors, Right Scenario & Telemetry */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: Risk Gauge & Model Explainability (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Risk Gauge Card */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-200">
                  Flash Flood Vulnerability Assessment
                </h2>
                <p className="font-mono text-[0.68rem] text-slate-400">
                  Real-time hydrologic hazard index based on telemetry weights
                </p>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                <Clock className="size-3.5 text-cyan-400" />
                <span>Lead Time: <strong className="text-white">{riskResult.leadTimeMin} min</strong></span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 items-center gap-6 sm:grid-cols-12">
              {/* Radial Meter Visual */}
              <div className="flex flex-col items-center justify-center sm:col-span-5">
                <div className="relative flex size-36 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950">
                  {/* Gauge Arc Background */}
                  <svg className="size-full -rotate-90">
                    <circle
                      cx="68"
                      cy="68"
                      r="58"
                      stroke="#1e293b"
                      strokeWidth="10"
                      fill="none"
                    />
                    <circle
                      cx="68"
                      cy="68"
                      r="58"
                      stroke={currentRiskMeta.color}
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray="364"
                      strokeDashoffset={364 - (364 * riskResult.score) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                      {riskResult.score}
                    </span>
                    <span className="font-mono text-[0.65rem] uppercase text-slate-400">
                      Score / 100
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <span
                    className={`inline-block rounded px-2.5 py-0.5 font-mono text-xs font-bold uppercase ${currentRiskMeta.chip}`}
                  >
                    {riskResult.level} Level
                  </span>
                </div>
              </div>

              {/* Action Directive */}
              <div className="space-y-3 sm:col-span-7">
                <div className="rounded border border-slate-800 bg-slate-950/80 p-3">
                  <span className="label-caps block text-cyan-400">Recommended Tactical Posture</span>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {currentRiskMeta.action}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="rounded border border-slate-800/80 bg-slate-950/50 p-2">
                    <span className="text-[0.62rem] text-slate-400 uppercase">Population at Risk</span>
                    <p className="text-sm font-bold text-slate-200">
                      {selectedZone.population.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="rounded border border-slate-800/80 bg-slate-950/50 p-2">
                    <span className="text-[0.62rem] text-slate-400 uppercase">Active Shelters</span>
                    <p className="text-sm font-bold text-slate-200">
                      {selectedZone.shelters.length} Available
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Why This Score? Factor Decomposition */}
            <div className="mt-5 border-t border-slate-800/80 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="label-caps">Why This Score? Factor Contribution</span>
                <span className="font-mono text-[0.65rem] text-slate-400">Weighted Linear Formula</span>
              </div>

              <div className="space-y-3">
                {riskResult.factors.map((factor) => (
                  <div key={factor.key} className="rounded border border-slate-800/60 bg-slate-950/40 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{factor.label}</span>
                        <span className="font-mono text-[0.65rem] text-cyan-400">
                          (weight: {Math.round(factor.weight * 100)}%)
                        </span>
                      </div>
                      <div className="font-mono text-xs">
                        <span className="font-bold text-white">{factor.raw}</span>
                        <span className="text-slate-400 ml-1.5">
                          → +{factor.contribution.toFixed(1)} pts
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, factor.index)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[0.68rem] text-slate-400">{factor.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scenario Simulator & Shelters (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Interactive Scenario Controls */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
                  Scenario Simulator
                </h3>
                <p className="font-mono text-[0.65rem] text-slate-400">
                  Simulate meteorological variations &amp; cloudburst stress
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyPreset(1.0)}
                className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-[0.65rem] text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="size-3" />
                Reset
              </button>
            </div>

            {/* Slider */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-300">Rainfall Multiplier</span>
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
                  {rainMultiplier.toFixed(1)}x
                </span>
              </div>
              <input
                id="rain-multiplier-slider"
                type="range"
                min="0.5"
                max="2.8"
                step="0.1"
                value={rainMultiplier}
                onChange={(e) => onMultiplierChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between font-mono text-[0.6rem] text-slate-400">
                <span>0.5x (Light)</span>
                <span>1.0x (Normal)</span>
                <span>1.8x (Heavy)</span>
                <span>2.8x (Cloudburst)</span>
              </div>
            </div>

            {/* Preset Action Buttons */}
            <div className="mt-4 space-y-1.5">
              <span className="label-caps">Quick Simulation Scenarios</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(1.0)}
                  className={`rounded border p-2 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 1.0
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Monsoon Norm
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(1.7)}
                  className={`rounded border p-2 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 1.7
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Heavy Rain
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(2.5)}
                  className={`rounded border p-2 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 2.5
                      ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Cloudburst
                </button>
              </div>
            </div>
          </div>

          {/* Safe Shelters & Evacuation Centers */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
                  Designated High-Ground Shelters
                </h3>
                <p className="font-mono text-[0.65rem] text-slate-400">
                  Nearest safe evacuation points for {selectedZone.name}
                </p>
              </div>
              <MapPin className="size-4 text-emerald-400" />
            </div>

            <div className="mt-3 space-y-2.5">
              {selectedZone.shelters.map((shelter, idx) => (
                <div
                  key={idx}
                  className="rounded border border-slate-800 bg-slate-950/60 p-2.5 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-white">{shelter.name}</h4>
                      <div className="mt-1 flex items-center gap-3 font-mono text-[0.68rem] text-slate-400">
                        <span>Dist: <strong className="text-slate-200">{shelter.distanceKm} km</strong></span>
                        <span>Elev: <strong className="text-slate-200">+{shelter.elevationM - selectedZone.elevationM}m</strong></span>
                        <span>Cap: <strong className="text-emerald-400">{shelter.capacity} pers</strong></span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[0.68rem] text-slate-400 italic">
                    Route: {shelter.route}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={onNavigateToRouting}
                className="w-full rounded border border-cyan-500/40 bg-cyan-950/30 py-2 text-center font-mono text-xs font-semibold text-cyan-300 hover:bg-cyan-950/60"
              >
                Compute Evacuation Path with A* Pathfinder →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
