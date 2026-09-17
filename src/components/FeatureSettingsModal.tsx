import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, XCircle, RotateCcw, Shield, Sparkles, Mic, Wifi, Route, MapPin, Radio, Bell } from 'lucide-react';
import { DEFAULT_FEATURES, FeatureFlags, isFeatureEnabled, setFeatureOverride, resetFeatureOverrides } from '../config/features';

interface FeatureSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeatureChange?: () => void;
}

interface FeatureMeta {
  key: keyof FeatureFlags;
  label: string;
  category: string;
  description: string;
  fallbackText: string;
}

const FEATURE_CATALOG: FeatureMeta[] = [
  {
    key: 'aiSituationSummary',
    label: 'AI Situation Summary',
    category: 'Intelligence',
    description: 'Autonomous disaster briefing synthesized from active telemetry and incidents.',
    fallbackText: 'When disabled: Replaced with standard deterministic incident tallies.'
  },
  {
    key: 'voiceReporting',
    label: 'Voice Emergency Reporting',
    category: 'Reporting',
    description: 'Natural speech recognition with Web Speech API and deterministic extraction.',
    fallbackText: 'When disabled: Manual incident reporting form remains fully functional.'
  },
  {
    key: 'lowConnectivity',
    label: 'Low-Connectivity & Offline Sync',
    category: 'Resilience',
    description: 'Local-first offline queueing with automated FIFO sync and bandwidth modes.',
    fallbackText: 'When disabled: Operates in direct online mode without offline queueing.'
  },
  {
    key: 'aStarRouting',
    label: 'A* Emergency Evacuation Routing',
    category: 'Tactical',
    description: 'Multi-factor mountain pathfinding accounting for slope gradients and road blocks.',
    fallbackText: 'When disabled: Standard mountain map without dynamic route calculation.'
  },
  {
    key: 'lastKnownLocation',
    label: 'Last Known Location (LKL)',
    category: 'Telemetry',
    description: 'Device GPS coordinates tracking with timestamp staleness indicators.',
    fallbackText: 'When disabled: Sector centroid landmarks used as default coordinates.'
  },
  {
    key: 'rescueTracking',
    label: 'Rescue Team Telemetry',
    category: 'Tactical',
    description: 'Live field unit monitoring, responder check-ins, and radio callsigns.',
    fallbackText: 'When disabled: Responders tab hidden from public command navigation.'
  },
  {
    key: 'disasterRiskLayer',
    label: 'Disaster Risk Map Layer',
    category: 'Mapping',
    description: 'Interactive canvas topography with watershed boundaries and risk heatmap.',
    fallbackText: 'When disabled: Visual risk map hidden; tabular catchment data displayed.'
  },
  {
    key: 'citizenReporting',
    label: 'Citizen Incident Reporting',
    category: 'Reporting',
    description: 'Public emergency reporting portal with authority dispatch lifecycle.',
    fallbackText: 'When disabled: Incident logging restricted to direct monitoring view.'
  },
  {
    key: 'sensorMonitoring',
    label: 'Live Watershed Sensors',
    category: 'Sensors',
    description: 'IoT sensor network monitoring water levels, rain gauges, and soil saturation.',
    fallbackText: 'When disabled: Sensor network tab hidden from operations bar.'
  },
  {
    key: 'publicAlerts',
    label: 'Public Warnings & Alerts',
    category: 'Alerts',
    description: 'Broadcast alerts, SMS emergency dissemination, and warning sirens.',
    fallbackText: 'When disabled: Alert broadcast management panel hidden.'
  }
];

export const FeatureSettingsModal: React.FC<FeatureSettingsModalProps> = ({
  isOpen,
  onClose,
  onFeatureChange
}) => {
  const [currentStates, setCurrentStates] = useState<Record<keyof FeatureFlags, boolean>>({
    ...DEFAULT_FEATURES
  });

  const loadStates = () => {
    const states: any = {};
    FEATURE_CATALOG.forEach((f) => {
      states[f.key] = isFeatureEnabled(f.key);
    });
    setCurrentStates(states);
  };

  useEffect(() => {
    if (isOpen) {
      loadStates();
    }
  }, [isOpen]);

  const handleToggle = (key: keyof FeatureFlags) => {
    const nextVal = !currentStates[key];
    setFeatureOverride(key, nextVal);
    setCurrentStates((prev) => ({ ...prev, [key]: nextVal }));
    if (onFeatureChange) onFeatureChange();
  };

  const handleResetAll = () => {
    resetFeatureOverrides();
    loadStates();
    if (onFeatureChange) onFeatureChange();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sliders className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                Modular Feature Toggle System
              </h3>
              <p className="font-mono text-xs text-slate-400">
                Team configuration: enable or disable features independently without breaking the system
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 font-mono text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Info Banner */}
        <div className="mt-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-2.5 font-mono text-[0.68rem] text-cyan-200">
          <strong>Teammate Quick-Toggle Guide:</strong> Toggling any feature here applies immediately. Each feature is cleanly decoupled — disabling a feature activates its documented safe fallback without affecting other modules.
        </div>

        {/* Feature List */}
        <div className="mt-4 max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
          {FEATURE_CATALOG.map((f) => {
            const isEnabled = currentStates[f.key];
            return (
              <div
                key={f.key}
                className={`rounded-lg border p-3 transition-all ${
                  isEnabled
                    ? 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    : 'border-slate-800/60 bg-slate-950/30 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold uppercase tracking-wide text-white">
                        {f.label}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[0.6rem] text-slate-400">
                        {f.category}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[0.6rem] font-bold uppercase ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{f.description}</p>
                    <p className="mt-0.5 font-mono text-[0.65rem] text-slate-500">{f.fallbackText}</p>
                  </div>

                  {/* Switch Button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(f.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-cyan-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-1.5 font-mono text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset All to Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded bg-cyan-600 px-5 py-1.5 font-mono text-xs font-semibold text-white hover:bg-cyan-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
