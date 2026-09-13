import React from 'react';
import { BarChart3, Calculator, TrendingUp, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { RiskResult, Zone } from '../types';
import { calculateRisk, RISK_LEVELS, ZONES } from '../data/zones';

interface RiskAnalysisViewProps {
  selectedZone: Zone;
  rainMultiplier: number;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({
  selectedZone,
  rainMultiplier
}) => {
  const currentResult = calculateRisk(selectedZone, rainMultiplier);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              Hydrological Vulnerability Mathematical Model
            </h2>
            <span className="rounded border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 font-mono text-[0.65rem] text-cyan-300">
              Formula Breakdown &amp; Calibration
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            Multi-variable weighted linear risk formula optimized for steep Himalayan and Western Ghat catchments
          </p>
        </div>
      </div>

      {/* Formula Specification Card */}
      <div className="rounded-lg border border-cyan-500/30 bg-slate-900/90 p-5">
        <span className="label-caps text-cyan-400">Weighted Risk Formula</span>
        <div className="mt-2 rounded border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-cyan-300 overflow-x-auto">
          <code>
            Risk Score = 0.40 × [Rainfall / 180mm] + 0.25 × [Soil Moisture %] + 0.25 × [River Level / Danger Mark] + 0.10 × [Slope %]
          </code>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4 font-mono text-xs">
          <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-cyan-400 font-bold block mb-1">40% Rainfall Intensity</span>
            <p className="text-[0.68rem] text-slate-400 leading-relaxed">
              24-hour precipitation normalized against 180 mm cloudburst threshold.
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-cyan-400 font-bold block mb-1">25% Soil Saturation</span>
            <p className="text-[0.68rem] text-slate-400 leading-relaxed">
              Ground moisture capacity. Saturated ground converts 95%+ of rain into surface runoff.
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-cyan-400 font-bold block mb-1">25% River Stage Ratio</span>
            <p className="text-[0.68rem] text-slate-400 leading-relaxed">
              Proximity to catastrophic flood stage level monitored via telemetry radar.
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-cyan-400 font-bold block mb-1">10% Terrain Incline</span>
            <p className="text-[0.68rem] text-slate-400 leading-relaxed">
              Catchment slope steepness governing hydrological flow acceleration.
            </p>
          </div>
        </div>
      </div>

      {/* Cross-Zone Comparative Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-display text-base font-bold uppercase text-white">
              Comparative Multi-Catchment Risk Matrix ({rainMultiplier.toFixed(1)}x Rain Multiplier)
            </h3>
            <p className="font-mono text-xs text-slate-400">
              Simultaneous real-time evaluation across all 6 instrumented mountain corridors
            </p>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[0.65rem] text-slate-400 uppercase">
                <th className="py-2.5 px-3">Catchment Sector</th>
                <th className="py-2.5 px-3">Elevation</th>
                <th className="py-2.5 px-3">Slope</th>
                <th className="py-2.5 px-3">Simulated Rain</th>
                <th className="py-2.5 px-3">Soil Moisture</th>
                <th className="py-2.5 px-3">River Level</th>
                <th className="py-2.5 px-3">Calculated Score</th>
                <th className="py-2.5 px-3">Risk Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {ZONES.map((z) => {
                const res = calculateRisk(z, rainMultiplier);
                const meta = RISK_LEVELS[res.level];
                return (
                  <tr key={z.id} className="hover:bg-slate-950/40">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {z.name}
                      <span className="block text-[0.62rem] text-slate-500">{z.district}, {z.state}</span>
                    </td>
                    <td className="py-2.5 px-3">{z.elevationM} m</td>
                    <td className="py-2.5 px-3">{z.slopePct}%</td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">{res.rainfall} mm</td>
                    <td className="py-2.5 px-3">{res.soilMoisture}%</td>
                    <td className="py-2.5 px-3">{res.riverLevel.toFixed(1)} m / {z.riverDangerLevel} m</td>
                    <td className="py-2.5 px-3 font-bold text-white text-sm">{res.score}/100</td>
                    <td className="py-2.5 px-3">
                      <span className={`rounded px-2 py-0.5 font-bold uppercase text-[0.65rem] ${meta.chip}`}>
                        {res.level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
