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
  Mic,
  Activity,
  Play,
  CheckCircle2,
  Shield,
  Gauge
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
  onOpenScenarioConsole?: () => void;
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
  onOpenScenarioConsole,
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

  // Compute environmental factors
  const rainfallMm = Math.round(selectedZone.baseRainfallMm * rainMultiplier);
  const soilMoisture = Math.round(selectedZone.baseSoilMoisture * Math.min(1.4, 0.8 + rainMultiplier * 0.25));
  const riverDischarge = (selectedZone.baseRiverLevel * (0.7 + rainMultiplier * 0.4)).toFixed(1);
  const slopeRisk = Math.round(selectedZone.slopePct * 1.6);

  return (
    <div className="space-y-4">
      {/* Top Operations Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/95 p-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded bg-slate-800 border border-slate-700 text-cyan-400">
            <Activity className="size-4" />
          </div>
          <div>
            <span className="font-mono text-[0.62rem] uppercase tracking-wider text-slate-400">
              Disaster Monitoring Sector
            </span>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold uppercase text-white">
                {selectedZone.name}
              </span>
              <span className="font-mono text-[0.68rem] text-slate-400">
                ({selectedZone.district}, {selectedZone.elevationM}m ASL)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Dispatch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenScenarioConsole && (
            <button
              id="dash-scenario-mode-btn"
              type="button"
              onClick={onOpenScenarioConsole}
              className="flex items-center gap-1.5 rounded border border-rose-500/50 bg-rose-950/60 px-3 py-1.5 font-mono text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 transition-colors shadow-sm"
              title="Launch Controlled Demonstration Scenario Console"
            >
              <span className="size-2 rounded-full bg-rose-500 animate-ping" />
              <span>[ 🚨 SCENARIO MODE ]</span>
            </button>
          )}

          {isFeatureEnabled('voiceReporting') && onOpenVoiceModal && (
            <button
              id="dash-voice-report-btn"
              type="button"
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 rounded border border-purple-500/50 bg-purple-950/60 px-3 py-1.5 font-mono text-xs font-bold text-purple-300 hover:bg-purple-900/60 hover:border-purple-400 transition-colors shadow-sm"
              title="Speak emergency report with Web Speech recognition"
            >
              <Mic className="size-3.5 text-purple-400" />
              <span>Voice SOS</span>
            </button>
          )}

          {isFeatureEnabled('citizenReporting') && (
            <button
              type="button"
              onClick={onOpenIncidentModal}
              className="flex items-center gap-1.5 rounded border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition-colors"
            >
              <Flame className="size-3.5 text-rose-400" />
              <span>Report Incident</span>
            </button>
          )}

          {isFeatureEnabled('aStarRouting') && (
            <button
              type="button"
              onClick={onNavigateToRouting}
              className="flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 font-mono text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 transition-colors"
            >
              <Send className="size-3.5 text-cyan-400" />
              <span>A* Evacuation Route</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HERO SECTION: OVERALL RISK SCORE (MOST VISUALLY IMPORTANT METRIC ON DASH) */}
      {/* ========================================================================= */}
      <div
        id="hero-risk-score-card"
        className={`relative overflow-hidden rounded-xl border-2 p-5 shadow-2xl transition-all ${
          riskResult.level === 'Critical'
            ? 'border-rose-500 bg-gradient-to-br from-rose-950/80 via-slate-950 to-slate-950 text-rose-100 shadow-rose-950/50'
            : riskResult.level === 'High'
            ? 'border-orange-500 bg-gradient-to-br from-orange-950/70 via-slate-950 to-slate-950 text-orange-100 shadow-orange-950/40'
            : riskResult.level === 'Moderate'
            ? 'border-amber-500 bg-gradient-to-br from-amber-950/60 via-slate-950 to-slate-950 text-amber-100 shadow-amber-950/30'
            : 'border-emerald-500 bg-gradient-to-br from-emerald-950/60 via-slate-950 to-slate-950 text-emerald-100 shadow-emerald-950/30'
        }`}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
          {/* Left Hero Metric Gauge & Score Readout (5 cols) */}
          <div className="flex flex-col sm:flex-row items-center gap-6 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-800 pb-5 lg:pb-0 pr-0 lg:pr-6">
            {/* Circular Gauge */}
            <div className="relative flex size-36 shrink-0 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950 shadow-inner">
              <svg className="size-full -rotate-90">
                <circle
                  cx="68"
                  cy="68"
                  r="56"
                  stroke="#1e293b"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="68"
                  cy="68"
                  r="56"
                  stroke={currentRiskMeta.color}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="351"
                  strokeDashoffset={351 - (351 * riskResult.score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-4xl font-extrabold tracking-tight text-white drop-shadow">
                  {riskResult.score}
                </span>
                <span className="font-mono text-[0.62rem] font-bold uppercase tracking-widest text-slate-400">
                  / 100
                </span>
              </div>
            </div>

            {/* Prominent Risk Level Badge & Lead Time */}
            <div className="text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Overall Hazard Index
                </span>
                <span className="size-2 rounded-full bg-current animate-ping" />
              </div>

              <div>
                <h1
                  className={`font-display text-2xl sm:text-3xl font-black uppercase tracking-wider drop-shadow-sm ${
                    riskResult.level === 'Critical'
                      ? 'text-rose-400'
                      : riskResult.level === 'High'
                      ? 'text-orange-400'
                      : riskResult.level === 'Moderate'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {riskResult.level} Risk
                </h1>
                <span
                  className={`inline-block mt-1 rounded px-2.5 py-0.5 font-mono text-xs font-bold uppercase ${currentRiskMeta.chip}`}
                >
                  Status: Level {riskResult.level === 'Critical' ? '4 - Red' : riskResult.level === 'High' ? '3 - Orange' : riskResult.level === 'Moderate' ? '2 - Yellow' : '1 - Green'}
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 font-mono text-xs text-slate-300 pt-1">
                <Clock className="size-4 text-cyan-400" />
                <span>
                  Flash Flood Lead Time: <strong className="text-white font-bold">{riskResult.leadTimeMin} min</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero Tactical Summary & Action Directive (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            {/* Tactical Recommended Posture */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="label-caps text-cyan-400 font-bold">
                  Recommended Command Action Directive:
                </span>
                <span className="font-mono text-[0.62rem] text-slate-400 uppercase">
                  Standard Operating Protocol
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
                {currentRiskMeta.action}
              </p>
            </div>

            {/* 4 Core Hydrological Telemetry Factors */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 font-mono text-xs">
              <div className="rounded border border-slate-800 bg-slate-950/70 p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <CloudRain className="size-3.5 text-cyan-400" />
                  <span className="text-[0.62rem] uppercase font-bold">Rainfall Rate</span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  {rainfallMm} <span className="text-[0.68rem] text-slate-400 font-normal">mm/h</span>
                </div>
                <span className="text-[0.62rem] text-cyan-300 mt-0.5 block">
                  {rainfallMm > 80 ? 'Extreme Surge' : rainfallMm > 40 ? 'Heavy Inflow' : 'Normal Baseline'}
                </span>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/70 p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Mountain className="size-3.5 text-amber-400" />
                  <span className="text-[0.62rem] uppercase font-bold">Soil Moisture</span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  {soilMoisture}%
                </div>
                <span className="text-[0.62rem] text-amber-300 mt-0.5 block">
                  {soilMoisture > 75 ? 'Pore Over-Sat' : soilMoisture > 50 ? 'Moderate Sat' : 'Sub-Saturation'}
                </span>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/70 p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Waves className="size-3.5 text-rose-400" />
                  <span className="text-[0.62rem] uppercase font-bold">River Surge</span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  {riverDischarge} <span className="text-[0.68rem] text-slate-400 font-normal">m³/s</span>
                </div>
                <span className="text-[0.62rem] text-rose-300 mt-0.5 block truncate">
                  {Number(riverDischarge) > 180 ? 'Above Danger Mark' : 'Within Channel'}
                </span>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/70 p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <TrendingUp className="size-3.5 text-orange-400" />
                  <span className="text-[0.62rem] uppercase font-bold">Slope Risk</span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  {slopeRisk}%
                </div>
                <span className="text-[0.62rem] text-orange-300 mt-0.5 block">
                  {selectedZone.slopePct}% Incline
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI DISASTER SITUATION SUMMARY PANEL */}
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
              Telemetry Live
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

      {/* Monitored Catchment Sector Strip */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3">
        <div className="flex items-center justify-between pb-2 px-1">
          <span className="label-caps">Hilly Catchment Sectors (Select to Switch Active Focus)</span>
          <span className="font-mono text-[0.65rem] text-slate-400">
            6 Instrumented Watershed Basins
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {ZONES.map((zone) => {
            const isSelected = zone.id === selectedZone.id;
            return (
              <button
                key={zone.id}
                id={`select-zone-${zone.id}`}
                type="button"
                onClick={() => onSelectZone(zone)}
                className={`flex flex-col rounded-md p-2.5 text-left transition-all ${
                  isSelected
                    ? 'border-2 border-cyan-500 bg-cyan-950/50 text-cyan-200 shadow-md ring-1 ring-cyan-500/30 font-bold'
                    : 'border border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold uppercase tracking-tight text-xs truncate">
                    {zone.name.split(' ')[0]}
                  </span>
                  <span className="font-mono text-[0.6rem] text-slate-400">
                    {zone.elevationM}m
                  </span>
                </div>
                <span className="truncate text-[0.68rem] text-slate-400 mt-0.5">
                  {zone.district}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Factor Breakdown & Simulator / Shelters */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: Factor Decomposition (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
                  Risk Factor Breakdown (Linear Hydrologic Model)
                </h3>
                <p className="font-mono text-[0.68rem] text-slate-400">
                  Mathematical weights driving the Overall Hazard Score
                </p>
              </div>
              <span className="font-mono text-xs text-cyan-400 font-bold">
                Σ = {riskResult.score} pts
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {riskResult.factors.map((factor) => (
                <div
                  key={factor.key}
                  className="rounded border border-slate-800/80 bg-slate-950/50 p-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{factor.label}</span>
                      <span className="font-mono text-[0.65rem] text-cyan-400">
                        ({Math.round(factor.weight * 100)}% weight)
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

        {/* Right Column: Rainfall Simulator & Designated High-Ground Shelters (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Interactive Meteorological Stress Simulator */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
                  Meteorological Stress Simulator
                </h3>
                <p className="font-mono text-[0.65rem] text-slate-400">
                  Simulate precipitation surge &amp; cloudburst conditions
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
                max="3.5"
                step="0.1"
                value={rainMultiplier}
                onChange={(e) => onMultiplierChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between font-mono text-[0.6rem] text-slate-400">
                <span>0.5x (Light)</span>
                <span>1.0x (Baseline)</span>
                <span>2.0x (Heavy)</span>
                <span>3.2x (Cloudburst)</span>
              </div>
            </div>

            {/* Preset Action Buttons */}
            <div className="mt-4 space-y-1.5">
              <span className="label-caps">Quick Meteorological Presets</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(1.0)}
                  className={`rounded border p-2 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 1.0
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Baseline
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(1.8)}
                  className={`rounded border p-2 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 1.8
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Heavy Surge
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(3.2)}
                  className={`rounded border p-2 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 3.2
                      ? 'border-rose-500 bg-rose-950/40 text-rose-300 font-bold'
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
                  Designated Safe Shelters
                </h3>
                <p className="font-mono text-[0.65rem] text-slate-400">
                  High-ground evacuation sites for {selectedZone.name}
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
