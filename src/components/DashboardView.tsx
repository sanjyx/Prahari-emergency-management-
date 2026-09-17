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
    <div className="space-y-6">
      {/* Top Operations Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#212d3d] bg-[#131b26] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded border border-sky-500/40 bg-[#162334] text-sky-400">
            <Activity className="size-4" />
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-slate-400 block font-semibold">
              Disaster Monitoring Sector
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-display text-base font-bold uppercase text-white">
                {selectedZone.name}
              </span>
              <span className="font-mono text-xs text-slate-400">
                ({selectedZone.district}, {selectedZone.elevationM}m ASL)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Dispatch Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenScenarioConsole && (
            <button
              id="dash-scenario-mode-btn"
              type="button"
              onClick={onOpenScenarioConsole}
              className="flex items-center gap-2 rounded-lg border border-rose-500/50 bg-[#170e12] px-3.5 py-2 font-mono text-xs font-bold text-rose-300 hover:bg-rose-950/60 hover:border-rose-400 transition-colors shadow-sm"
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
              className="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-[#162334] px-3.5 py-2 font-mono text-xs font-bold text-sky-300 hover:bg-[#1e324b] hover:border-sky-400 transition-colors"
              title="Speak emergency report with Web Speech recognition"
            >
              <Mic className="size-3.5 text-sky-400" />
              <span>Voice SOS</span>
            </button>
          )}

          {isFeatureEnabled('citizenReporting') && (
            <button
              type="button"
              onClick={onOpenIncidentModal}
              className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-[#170e12] px-3.5 py-2 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-950/60 transition-colors"
            >
              <Flame className="size-3.5 text-rose-400" />
              <span>Report Incident</span>
            </button>
          )}

          {isFeatureEnabled('aStarRouting') && (
            <button
              type="button"
              onClick={onNavigateToRouting}
              className="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-[#162334] px-3.5 py-2 font-mono text-xs font-semibold text-sky-300 hover:bg-[#1e324b] transition-colors"
            >
              <Send className="size-3.5 text-sky-400" />
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
        className="relative rounded-xl border border-[#212d3d] bg-[#131b26] p-6 text-slate-100 transition-all"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
          {/* Left Hero Metric Gauge & Score Readout (5 cols) */}
          <div className="flex flex-col sm:flex-row items-center gap-6 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#212d3d] pb-6 lg:pb-0 pr-0 lg:pr-6">
            {/* Circular Gauge */}
            <div className="relative flex size-36 shrink-0 items-center justify-center rounded-full border-4 border-[#212d3d] bg-[#0c1118]">
              <svg className="size-full -rotate-90">
                <circle
                  cx="68"
                  cy="68"
                  r="56"
                  stroke="#1b2533"
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
                <span className="font-mono text-4xl font-extrabold tracking-tight text-white">
                  {riskResult.score}
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
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
                  className={`font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wider ${
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
                  className={`inline-block mt-1.5 rounded px-2.5 py-1 font-mono text-xs font-bold uppercase ${currentRiskMeta.chip}`}
                >
                  Status: Level {riskResult.level === 'Critical' ? '4 - Red' : riskResult.level === 'High' ? '3 - Orange' : riskResult.level === 'Moderate' ? '2 - Yellow' : '1 - Green'}
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 font-mono text-xs text-slate-300 pt-1">
                <Clock className="size-4 text-sky-400" />
                <span>
                  Flash Flood Lead Time: <strong className="text-white font-bold">{riskResult.leadTimeMin} min</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero Tactical Summary & Action Directive (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            {/* Tactical Recommended Posture */}
            <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="label-caps text-sky-400 font-bold">
                  Recommended Command Action Directive:
                </span>
                <span className="font-mono text-xs text-slate-400 uppercase">
                  Standard Operating Protocol
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
                {currentRiskMeta.action}
              </p>
            </div>

            {/* 4 Core Hydrological Telemetry Factors */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
              <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                  <CloudRain className="size-3.5 text-sky-400" />
                  <span className="text-xs uppercase font-bold">Rainfall</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {rainfallMm} <span className="text-xs text-slate-400 font-normal">mm/h</span>
                </div>
                <span className="text-xs text-sky-300 mt-1 block">
                  {rainfallMm > 80 ? 'Extreme Surge' : rainfallMm > 40 ? 'Heavy Inflow' : 'Normal Baseline'}
                </span>
              </div>

              <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                  <Mountain className="size-3.5 text-amber-400" />
                  <span className="text-xs uppercase font-bold">Moisture</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {soilMoisture}%
                </div>
                <span className="text-xs text-amber-300 mt-1 block">
                  {soilMoisture > 75 ? 'Pore Over-Sat' : soilMoisture > 50 ? 'Moderate Sat' : 'Sub-Saturation'}
                </span>
              </div>

              <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                  <Waves className="size-3.5 text-rose-400" />
                  <span className="text-xs uppercase font-bold">River Surge</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {riverDischarge} <span className="text-xs text-slate-400 font-normal">m³/s</span>
                </div>
                <span className="text-xs text-rose-300 mt-1 block truncate">
                  {Number(riverDischarge) > 180 ? 'Above Danger' : 'Within Channel'}
                </span>
              </div>

              <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                  <TrendingUp className="size-3.5 text-orange-400" />
                  <span className="text-xs uppercase font-bold">Slope Risk</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {slopeRisk}%
                </div>
                <span className="text-xs text-orange-300 mt-1 block">
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
        <div className="rounded-xl border border-[#212d3d] bg-[#131b26] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#212d3d] pb-3">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
              Disaster Operations Snapshot (Deterministic Telemetry)
            </span>
            <span className="font-mono text-xs text-slate-400">
              Telemetry Live
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
            <div className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5">
              <span className="text-slate-400 block text-xs uppercase font-semibold">Total Incidents</span>
              <span className="text-xl font-bold text-white mt-1 block">{incidents.length}</span>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-[#170e12] p-3.5">
              <span className="text-rose-400 block text-xs uppercase font-semibold">Critical &amp; High</span>
              <span className="text-xl font-bold text-rose-300 mt-1 block">
                {incidents.filter((i) => i.severity === 'critical' || i.severity === 'high').length}
              </span>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-[#0f241a] p-3.5">
              <span className="text-emerald-400 block text-xs uppercase font-semibold">Active Responders</span>
              <span className="text-xl font-bold text-emerald-300 mt-1 block">
                {responders.filter((r) => r.isOnline).length} units
              </span>
            </div>
            <div className="rounded-lg border border-sky-500/30 bg-[#0e1724] p-3.5">
              <span className="text-sky-400 block text-xs uppercase font-semibold">Active Alerts</span>
              <span className="text-xl font-bold text-sky-300 mt-1 block">{alerts.length} broadcast</span>
            </div>
          </div>
        </div>
      )}

      {/* Monitored Catchment Sector Strip */}
      <div className="rounded-xl border border-[#212d3d] bg-[#131b26] p-5 space-y-3">
        <div className="flex items-center justify-between pb-1 px-1">
          <span className="label-caps font-bold text-slate-300">Hilly Catchment Sectors (Select to Switch Active Focus)</span>
          <span className="font-mono text-xs text-slate-400">
            6 Instrumented Watershed Basins
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {ZONES.map((zone) => {
            const isSelected = zone.id === selectedZone.id;
            return (
              <button
                key={zone.id}
                id={`select-zone-${zone.id}`}
                type="button"
                onClick={() => onSelectZone(zone)}
                className={`flex flex-col rounded-lg p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-2 border-sky-500 bg-[#162334] text-sky-200 font-bold'
                    : 'border border-[#212d3d] bg-[#0c1118] text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold uppercase tracking-tight text-xs truncate">
                    {zone.name.split(' ')[0]}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {zone.elevationM}m
                  </span>
                </div>
                <span className="truncate text-xs text-slate-400 mt-1">
                  {zone.district}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Factor Breakdown & Simulator / Shelters */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Factor Decomposition (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-xl border border-[#212d3d] bg-[#131b26] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#212d3d] pb-3">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
                  Risk Factor Breakdown (Linear Hydrologic Model)
                </h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  Mathematical weights driving the Overall Hazard Score
                </p>
              </div>
              <span className="font-mono text-xs text-sky-400 font-bold">
                Σ = {riskResult.score} pts
              </span>
            </div>

            <div className="space-y-3">
              {riskResult.factors.map((factor) => (
                <div
                  key={factor.key}
                  className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{factor.label}</span>
                      <span className="font-mono text-xs text-sky-400">
                        ({Math.round(factor.weight * 100)}% weight)
                      </span>
                    </div>
                    <div className="font-mono text-xs">
                      <span className="font-bold text-white">{factor.raw}</span>
                      <span className="text-slate-400 ml-2">
                        → +{factor.contribution.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, factor.index)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{factor.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Rainfall Simulator & Designated High-Ground Shelters (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Interactive Meteorological Stress Simulator */}
          <div className="rounded-xl border border-[#212d3d] bg-[#131b26] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#212d3d] pb-3">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
                  Meteorological Stress Simulator
                </h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  Simulate precipitation surge &amp; cloudburst conditions
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyPreset(1.0)}
                className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="size-3" />
                Reset
              </button>
            </div>

            {/* Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-300">Rainfall Multiplier</span>
                <span className="rounded bg-[#162334] px-2.5 py-1 font-mono text-xs font-bold text-sky-300 border border-sky-500/30">
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
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between font-mono text-xs text-slate-400">
                <span>0.5x (Light)</span>
                <span>1.0x (Baseline)</span>
                <span>2.0x (Heavy)</span>
                <span>3.2x (Cloudburst)</span>
              </div>
            </div>

            {/* Preset Action Buttons */}
            <div className="space-y-2 pt-1">
              <span className="label-caps font-bold">Quick Meteorological Presets</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset(1.0)}
                  className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 1.0
                      ? 'border-emerald-500 bg-[#0f241a] text-emerald-300 font-bold'
                      : 'border-[#212d3d] bg-[#0c1118] hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Baseline
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(1.8)}
                  className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 1.8
                      ? 'border-amber-500 bg-[#181308] text-amber-300 font-bold'
                      : 'border-[#212d3d] bg-[#0c1118] hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Heavy Surge
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(3.2)}
                  className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-colors ${
                    rainMultiplier === 3.2
                      ? 'border-rose-500 bg-[#170e12] text-rose-300 font-bold'
                      : 'border-[#212d3d] bg-[#0c1118] hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Cloudburst
                </button>
              </div>
            </div>
          </div>

          {/* Safe Shelters & Evacuation Centers */}
          <div className="rounded-xl border border-[#212d3d] bg-[#131b26] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#212d3d] pb-3">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
                  Designated Safe Shelters
                </h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  High-ground evacuation sites for {selectedZone.name}
                </p>
              </div>
              <MapPin className="size-4 text-emerald-400" />
            </div>

            <div className="space-y-3">
              {selectedZone.shelters.map((shelter, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[#212d3d] bg-[#0c1118] p-3.5 transition-colors hover:border-slate-600"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-white">{shelter.name}</h4>
                      <div className="mt-1 flex items-center gap-3 font-mono text-xs text-slate-400">
                        <span>Dist: <strong className="text-slate-200">{shelter.distanceKm} km</strong></span>
                        <span>Elev: <strong className="text-slate-200">+{shelter.elevationM - selectedZone.elevationM}m</strong></span>
                        <span>Cap: <strong className="text-emerald-400">{shelter.capacity} pers</strong></span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 italic leading-relaxed">
                    Route: {shelter.route}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={onNavigateToRouting}
                className="w-full rounded-lg border border-sky-500/40 bg-[#162334] py-2.5 px-4 text-center font-mono text-xs font-semibold text-sky-300 hover:bg-[#1e324b] transition-colors"
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
