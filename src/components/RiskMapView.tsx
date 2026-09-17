import React, { useState, useEffect } from 'react';
import {
  Shield,
  Flame,
  UserCheck,
  Route,
  Layers,
  Info,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Incident, RiskLevel, UserProfile, Zone, AStarPathResult } from '../types';
import { ZONES } from '../data/zones';
import {
  INITIAL_MAP_LAYERS,
  MapLayerConfig,
  BHUVAN_LEGAL_ATTRIBUTION,
  buildBhuvanProxyUrl
} from '../services/bhuvanGisLayers';

interface RiskMapViewProps {
  zones?: Zone[];
  selectedZone: Zone;
  onSelectZone: (zone: Zone) => void;
  zoneRisks: Record<string, { score: number; level: RiskLevel | string }>;
  incidents: Incident[];
  responders: UserProfile[];
  activeRoute?: AStarPathResult | null;
  onSelectIncident?: (incident: Incident) => void;
  onSelectResponder?: (responder: UserProfile) => void;
  onZoneClick?: (zoneId: string) => void;
}

export const RiskMapView: React.FC<RiskMapViewProps> = ({
  zones = ZONES,
  selectedZone,
  onSelectZone,
  zoneRisks,
  incidents,
  responders,
  activeRoute,
  onSelectIncident,
  onSelectResponder,
  onZoneClick
}) => {
  // Modular Layer Configurations
  const [layers, setLayers] = useState<MapLayerConfig[]>(INITIAL_MAP_LAYERS);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  // Quick visibility helpers
  const isLayerActive = (layerId: string) => {
    const l = layers.find((x) => x.id === layerId);
    return l ? l.enabled : false;
  };

  const getLayerOpacity = (layerId: string) => {
    const l = layers.find((x) => x.id === layerId);
    return l ? l.opacity : 1.0;
  };

  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, enabled: !l.enabled } : l))
    );
  };

  const setLayerOpacity = (layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    );
  };

  // Helper color mappings for zone risk scores
  const getRiskColor = (score: number) => {
    if (score >= 75) return '#ef4444'; // Critical
    if (score >= 55) return '#f97316'; // High
    if (score >= 35) return '#f59e0b'; // Moderate
    return '#10b981'; // Low
  };

  const getRiskFillOpacity = (score: number) => {
    if (score >= 75) return 0.55;
    if (score >= 55) return 0.42;
    if (score >= 35) return 0.32;
    return 0.22;
  };

  return (
    <div className="space-y-6">
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#212d3d] bg-[#131b26] p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-white">
              Hilly Catchment Topological Risk Map
            </h2>
            <span className="rounded bg-[#162334] px-2 py-0.5 font-mono text-xs text-sky-300 border border-sky-500/30">
              ISRO / NRSC Bhuvan OGC &bull; PRAHARI Hybrid
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400 mt-1 leading-relaxed">
            Real-time geospatial overlay of ISRO Bhuvan thematic data, flood hazard contours, and live telemetry
          </p>
        </div>

        {/* Action Controls & Quick Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => toggleLayer('prahari_risk')}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 transition-colors ${
              isLayerActive('prahari_risk')
                ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
                : 'border-slate-800 bg-slate-950 text-slate-500'
            }`}
          >
            <span>Risk Scores</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer('prahari_incidents')}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 transition-colors ${
              isLayerActive('prahari_incidents')
                ? 'border-rose-500/50 bg-rose-950/40 text-rose-300'
                : 'border-slate-800 bg-slate-950 text-slate-500'
            }`}
          >
            <Flame className="size-3 text-rose-400" />
            <span>Incidents ({incidents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer('bhuvan_flood_hazard')}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 transition-colors ${
              isLayerActive('bhuvan_flood_hazard')
                ? 'border-indigo-500/50 bg-indigo-950/50 text-indigo-300'
                : 'border-slate-800 bg-slate-950 text-slate-500'
            }`}
          >
            <Globe className="size-3 text-indigo-400" />
            <span>Bhuvan Flood Hazard</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer('bhuvan_satellite')}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 transition-colors ${
              isLayerActive('bhuvan_satellite')
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-slate-800 bg-slate-950 text-slate-500'
            }`}
          >
            <span>Bhuvan Satellite</span>
          </button>

          {/* Layer Switcher Drawer Toggle Button */}
          <button
            type="button"
            id="toggle-layer-panel-btn"
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`flex items-center gap-1.5 rounded border px-3 py-1 font-bold ${
              showLayerPanel
                ? 'border-cyan-400 bg-cyan-600 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Layers className="size-3.5" />
            <span>Map Layers</span>
            {showLayerPanel ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Multi-Layer Switcher Panel */}
      {showLayerPanel && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-cyan-400" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Map Layer Controller &amp; Geospatial Services
              </h3>
            </div>
            <span className="font-mono text-[0.68rem] text-slate-400">
              Toggle visibility and blend opacity
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Category 1: PRAHARI Operational Layers */}
            <div className="rounded border border-slate-800 bg-slate-950/70 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="label-caps text-cyan-400">PRAHARI Operational</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.6rem] text-slate-300">
                  DEMO RISK DATA
                </span>
              </div>

              {layers
                .filter((l) => l.category === 'prahari_operational')
                .map((layer) => (
                  <div key={layer.id} className="rounded border border-slate-800/80 bg-slate-900/60 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
                        <input
                          type="checkbox"
                          checked={layer.enabled}
                          onChange={() => toggleLayer(layer.id)}
                          className="size-3.5 rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-0"
                        />
                        <span className="text-xs">{layer.name}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleLayer(layer.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {layer.enabled ? <Eye className="size-3 text-cyan-400" /> : <EyeOff className="size-3" />}
                      </button>
                    </div>

                    <p className="mt-1 font-mono text-[0.62rem] text-slate-400 leading-tight">
                      {layer.description}
                    </p>

                    {layer.enabled && (
                      <div className="mt-2 flex items-center gap-2 font-mono text-[0.65rem] text-slate-400">
                        <span>Opacity:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={layer.opacity}
                          onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                          className="w-full accent-cyan-500 h-1 bg-slate-800 rounded"
                        />
                        <span className="w-8 text-right font-bold text-slate-300">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Category 2: ISRO / NRSC Bhuvan Thematic Layers */}
            <div className="rounded border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="label-caps text-indigo-300">ISRO / NRSC Bhuvan Thematic</span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold text-indigo-300 border border-indigo-500/40">
                  BHUVAN / ISRO-NRSC
                </span>
              </div>

              {layers
                .filter((l) => l.category === 'bhuvan_thematic')
                .map((layer) => (
                  <div key={layer.id} className="rounded border border-slate-800/80 bg-slate-900/60 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
                        <input
                          type="checkbox"
                          checked={layer.enabled}
                          onChange={() => toggleLayer(layer.id)}
                          className="size-3.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                        />
                        <span className="text-xs">{layer.name}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleLayer(layer.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {layer.enabled ? <Eye className="size-3 text-indigo-400" /> : <EyeOff className="size-3" />}
                      </button>
                    </div>

                    <p className="mt-1 font-mono text-[0.62rem] text-slate-400 leading-tight">
                      {layer.description}
                    </p>

                    <div className="mt-1 flex items-center justify-between font-mono text-[0.58rem] text-indigo-300/80">
                      <span>Service: OGC WMS (ISRO-NRSC)</span>
                      <span>Scale: {layer.scale || '1:250k'}</span>
                    </div>

                    {layer.enabled && (
                      <div className="mt-2 flex items-center gap-2 font-mono text-[0.65rem] text-slate-400">
                        <span>Blend:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={layer.opacity}
                          onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 h-1 bg-slate-800 rounded"
                        />
                        <span className="w-8 text-right font-bold text-slate-300">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Category 3: Base Maps & Attribution Notice */}
            <div className="rounded border border-slate-800 bg-slate-950/70 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="label-caps text-slate-400">Base Map Layers</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.6rem] text-slate-400">
                  Cartography
                </span>
              </div>

              {layers
                .filter((l) => l.category === 'base_map')
                .map((layer) => (
                  <div key={layer.id} className="rounded border border-slate-800/80 bg-slate-900/60 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
                        <input
                          type="checkbox"
                          checked={layer.enabled}
                          onChange={() => toggleLayer(layer.id)}
                          className="size-3.5 rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-0"
                        />
                        <span className="text-xs">{layer.name}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleLayer(layer.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {layer.enabled ? <Eye className="size-3 text-cyan-400" /> : <EyeOff className="size-3" />}
                      </button>
                    </div>

                    <p className="mt-1 font-mono text-[0.62rem] text-slate-400 leading-tight">
                      {layer.description}
                    </p>

                    {layer.enabled && (
                      <div className="mt-2 flex items-center gap-2 font-mono text-[0.65rem] text-slate-400">
                        <span>Opacity:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={layer.opacity}
                          onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                          className="w-full accent-slate-400 h-1 bg-slate-800 rounded"
                        />
                        <span className="w-8 text-right font-bold text-slate-300">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}

              {/* Attribution and Legal Terms Box */}
              <div className="rounded border border-indigo-500/20 bg-indigo-950/30 p-2 font-mono text-[0.62rem] text-slate-400 space-y-1">
                <div className="font-bold text-indigo-300 flex items-center gap-1">
                  <Info className="size-3" />
                  <span>Official Attribution &amp; Data Notice</span>
                </div>
                <p>
                  {BHUVAN_LEGAL_ATTRIBUTION}. Used via documented OGC WMS/WMTS services.
                </p>
                <div className="text-[0.58rem] text-slate-400 pt-0.5">
                  PRAHARI risk scores are computed using the calibrated formula and controlled demo telemetry.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Map Canvas Area */}
      <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-[#0c131c] shadow-2xl">
        {/* SVG GIS Layer */}
        <svg
          viewBox="0 0 1000 620"
          className="w-full h-auto max-h-[640px] select-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #131b26 0%, #090e15 100%)' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1d2838" strokeWidth="0.8" strokeOpacity="0.4" />
            </pattern>
            {/* Mountain Contour Gradient */}
            <linearGradient id="ridgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
            </linearGradient>
            {/* Bhuvan Water Bodies River Gradient */}
            <linearGradient id="bhuvanRiverGradient" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.75" />
            </linearGradient>
            {/* Route Glow Filter */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Bhuvan Flood Hazard Pattern */}
            <pattern id="hazardHatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#b91c1c" strokeWidth="2.5" strokeOpacity="0.6" />
            </pattern>
            <pattern id="annualInundationHatch" width="10" height="10" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#1d4ed8" strokeWidth="2" strokeOpacity="0.5" />
            </pattern>
          </defs>

          {/* 1. Base Map: Topographic Grid */}
          {isLayerActive('standard_topo') && (
            <rect width="1000" height="620" fill="url(#grid)" opacity={getLayerOpacity('standard_topo')} />
          )}

          {/* 2. Base Map: Bhuvan Satellite Base Image (via Backend Proxy) */}
          {isLayerActive('bhuvan_satellite') && (
            <g opacity={getLayerOpacity('bhuvan_satellite')}>
              {/* OGC WMS Image Proxy Overlay */}
              <image
                href="/api/bhuvan/wms?service_type=vec&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=india3&STYLES=&SRS=EPSG:4326&BBOX=78.8,30.0,79.8,30.8&WIDTH=1000&HEIGHT=620&FORMAT=image/png"
                x="0"
                y="0"
                width="1000"
                height="620"
                preserveAspectRatio="none"
              />
            </g>
          )}

          {/* 3. Topographic Mountain Ridge Contours */}
          {isLayerActive('standard_topo') && (
            <g opacity={getLayerOpacity('standard_topo')}>
              <path
                d="M 50 200 Q 200 80, 450 160 T 900 120"
                fill="none"
                stroke="#1e2c3e"
                strokeWidth="3"
                strokeDasharray="6 4"
                opacity="0.6"
              />
              <path
                d="M 20 340 Q 300 240, 550 360 T 950 280"
                fill="none"
                stroke="#1c2b3d"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                opacity="0.5"
              />
              <path
                d="M 80 500 Q 350 420, 680 520 T 980 440"
                fill="none"
                stroke="#192636"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.5"
              />
            </g>
          )}

          {/* 4. ISRO / NRSC Bhuvan Flood Hazard Zonation (1:250k) Thematic Layer */}
          {isLayerActive('bhuvan_flood_hazard') && (
            <g opacity={getLayerOpacity('bhuvan_flood_hazard')} className="transition-opacity duration-300">
              {/* Bhuvan WMS Overlay Tile via Proxy */}
              <image
                href="/api/bhuvan/wms?service_type=hazard&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=flood_hazard&STYLES=&SRS=EPSG:4326&BBOX=78.8,30.0,79.8,30.8&WIDTH=1000&HEIGHT=620&FORMAT=image/png"
                x="0"
                y="0"
                width="1000"
                height="620"
                preserveAspectRatio="none"
              />
              {/* Thematic Flood Hazard Polygons (Derived from 1998-2007 Historic NRSC Records) */}
              <path
                d="M 120 310 C 180 290, 240 330, 290 315 C 330 305, 360 320, 390 310 L 390 340 C 340 355, 280 345, 230 360 C 170 375, 130 330, 120 310 Z"
                fill="url(#hazardHatch)"
                stroke="#b91c1c"
                strokeWidth="1.2"
              />
              <path
                d="M 460 350 C 510 330, 560 360, 610 345 C 650 335, 680 350, 710 340 L 710 375 C 660 390, 600 375, 550 395 C 490 410, 460 370, 460 350 Z"
                fill="url(#hazardHatch)"
                stroke="#b91c1c"
                strokeWidth="1.2"
              />
              {/* Thematic Label */}
              <text x="140" y="300" fill="#f87171" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                [NRSC 1:250k] VERY HIGH FLOOD HAZARD CORRIDOR
              </text>
            </g>
          )}

          {/* 5. ISRO / NRSC Bhuvan Annual Flood Inundation Layer */}
          {isLayerActive('bhuvan_flood_annual') && (
            <g opacity={getLayerOpacity('bhuvan_flood_annual')}>
              <path
                d="M 150 320 C 220 310, 280 340, 340 330 C 390 320, 430 335, 470 325 L 470 360 C 410 370, 360 355, 300 370 C 230 385, 170 340, 150 320 Z"
                fill="url(#annualInundationHatch)"
                stroke="#1d4ed8"
                strokeWidth="1.5"
              />
              <text x="160" y="380" fill="#60a5fa" fontSize="8" fontFamily="JetBrains Mono">
                [NRSC] RECURRENT ANNUAL INUNDATION FREQUENCY (&gt;5 YRS)
              </text>
            </g>
          )}

          {/* 6. ISRO / NRSC Bhuvan Water Bodies & Himalayan Drainage */}
          {isLayerActive('bhuvan_water_bodies') && (
            <g opacity={getLayerOpacity('bhuvan_water_bodies')}>
              {/* River Trunk 1: Main Alaknanda/Ganga Drainage Gorge */}
              <path
                d="M 20 280 Q 250 360, 480 320 T 780 370 T 990 310"
                fill="none"
                stroke="url(#bhuvanRiverGradient)"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* River Trunk 2: Mandakini/Bhagirathi Tributaries */}
              <path
                d="M 320 60 Q 420 200, 480 320 T 560 580"
                fill="none"
                stroke="url(#bhuvanRiverGradient)"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M 720 80 Q 750 240, 780 370 T 820 600"
                fill="none"
                stroke="url(#bhuvanRiverGradient)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Secondary Nullahs */}
              <path
                d="M 140 120 Q 200 220, 270 310"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3.5"
                strokeDasharray="4 2"
                opacity="0.7"
              />
              <path
                d="M 880 160 Q 860 260, 800 360"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="4 2"
                opacity="0.7"
              />
              <text x="35" y="270" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                [ISRO BHUVAN DRAINAGE] ALAKNANDA - GANGA TRUNK GORGE
              </text>
            </g>
          )}

          {/* 7. PRAHARI Risk Layer: Catchment Polygons & Scores */}
          {isLayerActive('prahari_risk') && (
            <g opacity={getLayerOpacity('prahari_risk')}>
              {zones.map((zone) => {
                const risk = zoneRisks[zone.id] || { score: 30, level: 'LOW' };
                const isSelected = selectedZone.id === zone.id;
                const riskColor = getRiskColor(risk.score);
                const fillOpacity = getRiskFillOpacity(risk.score);

                // Derive polygon coordinates scaled to 1000x620 SVG canvas
                const cx = (zone.x || 30) * 10;
                const cy = (zone.y || 40) * 6.2;
                const radius = 62;

                return (
                  <g
                    key={`map-zone-${zone.id}`}
                    id={`map-zone-${zone.id}`}
                    className="cursor-pointer transition-all duration-300"
                    onClick={() => {
                      onSelectZone(zone);
                      if (onZoneClick) onZoneClick(zone.id);
                      setSelectedEntity({ type: 'zone', data: zone, risk });
                    }}
                  >
                    {/* Catchment Hazard Polygon */}
                    <polygon
                      points={`
                        ${cx},${cy - radius}
                        ${cx + radius * 0.85},${cy - radius * 0.45}
                        ${cx + radius * 0.85},${cy + radius * 0.45}
                        ${cx},${cy + radius}
                        ${cx - radius * 0.85},${cy + radius * 0.45}
                        ${cx - radius * 0.85},${cy - radius * 0.45}
                      `}
                      fill={riskColor}
                      fillOpacity={fillOpacity}
                      stroke={isSelected ? '#38bdf8' : riskColor}
                      strokeWidth={isSelected ? 3.5 : 1.8}
                      strokeDasharray={isSelected ? 'none' : '4 2'}
                    />

                    {/* Zone ID & Risk Score Badge */}
                    <circle cx={cx} cy={cy} r="18" fill="#090e15" stroke={riskColor} strokeWidth="2" />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      {Math.round(risk.score)}
                    </text>

                    {/* Zone Name Label */}
                    <text
                      x={cx}
                      y={cy + radius + 14}
                      textAnchor="middle"
                      fill="#f1f5f9"
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      {zone.name}
                    </text>

                    {/* Risk Formula Indicator */}
                    <text
                      x={cx}
                      y={cy + radius + 25}
                      textAnchor="middle"
                      fill={riskColor}
                      fontSize="8"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      {risk.level}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* 8. Active A* Evacuation Route Layer */}
          {activeRoute && activeRoute.pathFound && activeRoute.nodes && activeRoute.nodes.length > 0 && (
            <g filter="url(#routeGlow)">
              <polyline
                points={activeRoute.nodes
                  .map((pt) => `${pt.x * 10},${pt.y * 6.2}`)
                  .join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 4"
              />
              {/* Waypoints */}
              {activeRoute.nodes.map((pt, idx) => (
                <circle
                  key={`route-pt-${idx}`}
                  cx={pt.x * 10}
                  cy={pt.y * 6.2}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                />
              ))}
            </g>
          )}

          {/* 9. PRAHARI Safe Locations & Shelters */}
          {isLayerActive('prahari_shelters') &&
            zones.flatMap((zone) =>
              (zone.shelters || []).map((shelter, idx) => {
                const sx = (zone.x + 3.2 + idx * 2.5) * 10;
                const sy = (zone.y - 4.5 + idx * 2.8) * 6.2;

                return (
                  <g
                    key={`map-shelter-${zone.id}-${idx}`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntity({ type: 'shelter', data: shelter, zoneName: zone.name });
                    }}
                  >
                    <rect
                      x={sx - 10}
                      y={sy - 10}
                      width="20"
                      height="20"
                      rx="4"
                      fill="#065f46"
                      stroke="#34d399"
                      strokeWidth="1.5"
                    />
                    <text
                      x={sx}
                      y={sy + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      S
                    </text>
                  </g>
                );
              })
            )}

          {/* 10. PRAHARI Live Incident Markers */}
          {isLayerActive('prahari_incidents') &&
            incidents.map((inc) => {
              const ix = (inc.location.mapX || 50) * 10;
              const iy = (inc.location.mapY || 50) * 6.2;
              const isCrit = inc.severity === 'critical';

              return (
                <g
                  key={`map-inc-${inc.id}`}
                  id={`map-incident-marker-${inc.id}`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntity({ type: 'incident', data: inc });
                    if (onSelectIncident) onSelectIncident(inc);
                  }}
                >
                  {/* Alert Wave Pulse */}
                  <circle
                    cx={ix}
                    cy={iy}
                    r={isCrit ? '16' : '12'}
                    fill={isCrit ? '#ef4444' : '#f97316'}
                    fillOpacity="0.3"
                    className="animate-ping"
                  />
                  <circle
                    cx={ix}
                    cy={iy}
                    r="8"
                    fill={isCrit ? '#ef4444' : '#f97316'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={ix}
                    y={iy + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </g>
              );
            })}

          {/* 11. PRAHARI Responders (Last Known GPS Telemetry) */}
          {isLayerActive('prahari_responders') &&
            responders.map((resp) => {
              const matchingZone = ZONES.find((z) => z.id === resp.lastKnownLocation?.zoneId) || selectedZone;
              const rx = (matchingZone.x + 1.8) * 10;
              const ry = (matchingZone.y - 2.5) * 6.2;

              return (
                <g
                  key={`map-resp-${resp.uid}`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntity({ type: 'responder', data: resp });
                    if (onSelectResponder) onSelectResponder(resp);
                  }}
                >
                  <circle cx={rx} cy={ry} r="12" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1" />
                  <circle cx={rx} cy={ry} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x={rx}
                    y={ry - 8}
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="8"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    QRT
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Map Legend Overlay (Bottom-Left) */}
        <div className="absolute bottom-10 left-3 rounded-lg border border-[#212d3d] bg-[#0c1118] p-3 font-mono text-xs text-slate-300">
          <div className="flex items-center justify-between mb-2 font-bold uppercase text-slate-400">
            <span>GIS Map Legend</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500" />
              <span>Critical (75-100)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-orange-500" />
              <span>High (55-74)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" />
              <span>Moderate (35-54)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <span>Low (0-34)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded bg-emerald-700 border border-emerald-400" />
              <span>Safe Shelter</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-sky-500 border border-white" />
              <span>Responder (QRT)</span>
            </div>
          </div>
        </div>

        {/* Legal Attribution Strip Pinned to Bottom */}
        <div className="absolute bottom-0 inset-x-0 bg-[#0c1118] border-t border-[#212d3d] px-3 py-1 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-sky-400 font-bold">BHUVAN / ISRO-NRSC:</span>
            <span>{BHUVAN_LEGAL_ATTRIBUTION}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sky-400">PRAHARI RISK DATA:</span>
            <span>Team HYDRAX Calibrated Formula</span>
          </div>
        </div>

        {/* Selected Entity Inspector Drawer / Card */}
        {selectedEntity && (
          <div className="absolute top-3 right-3 max-w-xs rounded-xl border border-sky-500/40 bg-[#131b26] p-4">
            <div className="flex items-center justify-between border-b border-[#212d3d] pb-2">
              <span className="label-caps text-sky-400 font-bold">
                {selectedEntity.type === 'zone'
                  ? 'Catchment Telemetry'
                  : selectedEntity.type === 'shelter'
                  ? 'Safe Shelter'
                  : selectedEntity.type === 'incident'
                  ? 'Incident Details'
                  : 'Responder Location'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                className="font-mono text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 space-y-1.5 text-xs">
              {selectedEntity.type === 'zone' && (
                <>
                  <h4 className="font-bold text-white text-sm">{selectedEntity.data.name}</h4>
                  <p className="text-slate-300">
                    District: {selectedEntity.data.district}, {selectedEntity.data.state}
                  </p>
                  <div className="font-mono text-[0.68rem] text-slate-400 space-y-0.5">
                    <div>Elevation: {selectedEntity.data.elevationM} m &bull; Slope: {selectedEntity.data.slopePct}%</div>
                    <div>Population: {selectedEntity.data.population.toLocaleString('en-IN')}</div>
                    <div className="text-cyan-400 font-bold">
                      Calculated Hazard Score: {selectedEntity.risk.score}/100 ({selectedEntity.risk.level})
                    </div>
                  </div>
                </>
              )}

              {selectedEntity.type === 'shelter' && (
                <>
                  <h4 className="font-bold text-emerald-400 text-sm">{selectedEntity.data.name}</h4>
                  <p className="text-slate-300">Catchment: {selectedEntity.zoneName}</p>
                  <div className="font-mono text-[0.68rem] text-slate-400 space-y-0.5">
                    <div>Capacity: {selectedEntity.data.capacity} persons</div>
                    <div>Distance: {selectedEntity.data.distanceKm} km</div>
                    <div>Elevation: {selectedEntity.data.elevationM} m (High-Ground)</div>
                    <div className="text-slate-300 italic">Route: {selectedEntity.data.route}</div>
                  </div>
                </>
              )}

              {selectedEntity.type === 'incident' && (
                <>
                  <h4 className="font-bold text-rose-400 text-sm">{selectedEntity.data.title}</h4>
                  <div className="font-mono text-[0.68rem] text-slate-400 space-y-0.5">
                    <div>ID: {selectedEntity.data.id} &bull; Status: <span className="uppercase text-amber-300">{selectedEntity.data.status}</span></div>
                    <div>Severity: <span className="uppercase text-rose-300">{selectedEntity.data.severity}</span></div>
                    <p className="text-slate-300 mt-1 leading-relaxed">{selectedEntity.data.description}</p>
                  </div>
                </>
              )}

              {selectedEntity.type === 'responder' && (
                <>
                  <h4 className="font-bold text-cyan-300 text-sm">{selectedEntity.data.name}</h4>
                  <p className="text-slate-300">{selectedEntity.data.unit}</p>
                  <div className="rounded border border-slate-800 bg-slate-900 p-2 font-mono text-[0.68rem] text-slate-400 space-y-0.5 mt-1">
                    <div className="text-emerald-400 font-bold">LAST KNOWN LOCATION</div>
                    <div>
                      {selectedEntity.data.lastKnownLocation?.lat.toFixed(4)}°N,{' '}
                      {selectedEntity.data.lastKnownLocation?.lng.toFixed(4)}°E
                    </div>
                    <div>
                      Timestamp:{' '}
                      {new Date(selectedEntity.data.lastKnownLocation?.timestamp || 0).toLocaleTimeString()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
