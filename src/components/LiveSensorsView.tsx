import React from 'react';
import { Radio, Battery, Activity, Wifi, RefreshCw, Layers } from 'lucide-react';
import { SensorNode, Zone } from '../types';

interface LiveSensorsViewProps {
  sensors: SensorNode[];
  selectedZone: Zone;
  onRefreshSensors: () => void;
}

export const LiveSensorsView: React.FC<LiveSensorsViewProps> = ({
  sensors,
  selectedZone,
  onRefreshSensors
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              Catchment IoT Sensor Telemetry
            </h2>
            <span className="rounded border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 font-mono text-[0.65rem] text-cyan-300">
              {selectedZone.name}
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            Real-time radar river gauges, pore-pressure piezometers, soil probes, and rain gauges
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshSensors}
          className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw className="size-3.5 text-cyan-400" />
          <span>Ping Sensor Array</span>
        </button>
      </div>

      {/* Sensor Nodes Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sensors.map((sensor) => {
          const isOnline = sensor.status === 'Online';
          const isDegraded = sensor.status === 'Degraded';

          return (
            <div
              key={sensor.id}
              className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 transition-all hover:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[0.68rem] text-slate-500">{sensor.id}</span>
                  <h3 className="font-bold text-sm text-white mt-0.5">{sensor.type}</h3>
                  <p className="font-mono text-[0.68rem] text-slate-400">{sensor.label}</p>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-bold uppercase ${
                    isOnline
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                      : isDegraded
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {sensor.status}
                </span>
              </div>

              {/* Value display */}
              <div className="mt-3 rounded border border-slate-800 bg-slate-950 p-2.5">
                <span className="text-[0.62rem] text-slate-500 uppercase font-mono block">Current Reading</span>
                <span className="text-base font-bold text-cyan-300 font-mono">{sensor.value}</span>
              </div>

              {/* Sparkline mini-graph */}
              <div className="mt-3">
                <div className="flex items-center justify-between font-mono text-[0.62rem] text-slate-500 mb-1">
                  <span>12h Trend History</span>
                  <span>{sensor.lastPing}</span>
                </div>
                <div className="flex items-end gap-1 h-8 bg-slate-950/60 p-1 rounded border border-slate-800/60">
                  {sensor.spark.map((val, idx) => {
                    const maxVal = Math.max(...sensor.spark, 1);
                    const heightPct = Math.max(10, Math.round((val / maxVal) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-cyan-500/60 hover:bg-cyan-400 rounded-t transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`Point ${idx + 1}: ${val}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Footer: Battery & Ping */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 font-mono text-[0.68rem] text-slate-400">
                <div className="flex items-center gap-1">
                  <Battery className="size-3.5 text-emerald-400" />
                  <span>Battery: {sensor.battery}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wifi className="size-3.5 text-cyan-400" />
                  <span>Ping: {sensor.lastPing}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
