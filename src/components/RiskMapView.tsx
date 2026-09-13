import React, { useState } from 'react';
import {
  Layers,
  MapPin,
  Shield,
  Flame,
  UserCheck,
  Route,
  Eye,
  Info,
  Navigation
} from 'lucide-react';
import { AStarPathResult, Incident, RiskLevel, RouteNode, UserProfile, Zone } from '../types';
import { RISK_LEVELS, ZONES } from '../data/zones';

interface RiskMapViewProps {
  selectedZone: Zone;
  onSelectZone: (zone: Zone) => void;
  zoneRisks: Record<string, { score: number; level: RiskLevel }>;
  incidents: Incident[];
  responders: UserProfile[];
  activeRoute: AStarPathResult | null;
  onSelectIncident?: (incident: Incident) => void;
  onSelectResponder?: (responder: UserProfile) => void;
}

export const RiskMapView: React.FC<RiskMapViewProps> = ({
  selectedZone,
  onSelectZone,
  zoneRisks,
  incidents,
  responders,
  activeRoute,
  onSelectIncident,
  onSelectResponder
}) => {
  // Layer toggles
  const [showShelters, setShowShelters] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showResponders, setShowResponders] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      {/* Map Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-white">
              Hilly Catchment Topological Risk Map
            </h2>
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[0.65rem] text-cyan-300">
              Interactive GIS Schematic
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            Real-time geospatial overlay of flood hazard contours, incidents, and responder telemetry
          </p>
        </div>

        {/* Layer Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setShowShelters(!showShelters)}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 ${
              showShelters
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-slate-800 bg-slate-950 text-slate-500'
            }`}
          >
            <Shield className="size-3 text-emerald-400" />
            Shelters
          </button>
          <button
            type="button"
            onClick={() => setShowIncidents(!showIncidents)}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 ${
              showIncidents
                ? 'border-rose-500/50 bg-rose-950/40 text-rose-300'
                : 'border-slate-800 bg-slate-950 text-slate-500'
            }`}
          >
            <Flame className="size-3 text-rose-400" />
            Incidents ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setShowResponders(!showResponders)}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 ${
              showResponders
                ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
                : 'border-slate-800 bg-slate-950 text-slate-500'
            }`}
          >
            <UserCheck className="size-3 text-cyan-400" />
            Responders ({responders.length})
          </button>
          {activeRoute && activeRoute.pathFound && (
            <button
              type="button"
              onClick={() => setShowRoute(!showRoute)}
              className={`flex items-center gap-1 rounded border px-2.5 py-1 ${
                showRoute
                  ? 'border-sky-400 bg-sky-950/60 text-sky-200'
                  : 'border-slate-800 bg-slate-950 text-slate-500'
              }`}
            >
              <Route className="size-3 text-sky-300" />
              A* Route ({activeRoute.totalDistanceKm}km)
            </button>
          )}
        </div>
      </div>

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
            {/* River Gradient */}
            <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.6" />
            </linearGradient>
            {/* Route Glow Filter */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="1000" height="620" fill="url(#grid)" />

          {/* Topographic Mountain Ridge Contours */}
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

          {/* River Stream Paths */}
          {/* Main River Trunk: Alaknanda / Teesta Gorge Line */}
          <path
            d="M 20 120 C 180 210, 320 180, 480 310 S 720 460, 980 490"
            fill="none"
            stroke="url(#riverGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* Tributary Stream */}
          <path
            d="M 380 40 C 440 140, 470 230, 480 310"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeDasharray="4 2"
            opacity="0.6"
          />
          {/* South Stream */}
          <path
            d="M 720 460 C 650 540, 520 580, 420 600"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeDasharray="4 2"
            opacity="0.6"
          />

          {/* Active A* Route Line Overlay */}
          {showRoute && activeRoute && activeRoute.pathFound && activeRoute.nodes.length > 1 && (
            <g className="route-layer">
              <polyline
                points={activeRoute.nodes.map((n) => `${n.x * 10},${n.y * 6.2}`).join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#routeGlow)"
                className="transition-all duration-300"
              />
              <polyline
                points={activeRoute.nodes.map((n) => `${n.x * 10},${n.y * 6.2}`).join(' ')}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
              {/* Waypoint nodes on the route */}
              {activeRoute.nodes.map((node, i) => (
                <g key={`route-node-${i}`} transform={`translate(${node.x * 10}, ${node.y * 6.2})`}>
                  <circle r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                  {i === 0 && (
                    <text y="-8" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                      START
                    </text>
                  )}
                  {i === activeRoute.nodes.length - 1 && (
                    <text y="-8" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                      DESTINATION
                    </text>
                  )}
                </g>
              ))}
            </g>
          )}

          {/* Zone Catchment Polygons & Markers */}
          {ZONES.map((zone) => {
            const risk = zoneRisks[zone.id] || { score: 35, level: 'Low' as RiskLevel };
            const riskMeta = RISK_LEVELS[risk.level];
            const isSelected = zone.id === selectedZone.id;
            const cx = zone.x * 10;
            const cy = zone.y * 6.2;

            return (
              <g
                key={`zone-marker-${zone.id}`}
                className="cursor-pointer transition-all duration-200"
                onClick={() => {
                  onSelectZone(zone);
                  setSelectedEntity({ type: 'zone', data: zone, risk });
                }}
              >
                {/* Pulsing Zone Hazard Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 38 : 28}
                  fill={riskMeta.color}
                  fillOpacity={isSelected ? 0.22 : 0.12}
                  stroke={riskMeta.color}
                  strokeWidth={isSelected ? 2 : 1.2}
                  strokeDasharray={risk.level === 'Critical' ? '4 2' : undefined}
                  className={risk.level === 'Critical' ? 'animate-pulse' : ''}
                />

                {/* Core Center Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 8 : 6}
                  fill={riskMeta.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Zone Label Tag */}
                <rect
                  x={cx - 55}
                  y={cy + 12}
                  width="110"
                  height="22"
                  rx="4"
                  fill="#0b131e"
                  fillOpacity="0.88"
                  stroke={isSelected ? '#38bdf8' : '#283548'}
                  strokeWidth={isSelected ? 1.5 : 1}
                />
                <text
                  x={cx}
                  y={cy + 26}
                  textAnchor="middle"
                  fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                  fontSize="10"
                  fontFamily="Barlow Condensed"
                  fontWeight="bold"
                >
                  {zone.name.split(' ')[0]} ({risk.score})
                </text>
              </g>
            );
          })}

          {/* Safe Shelters Markers */}
          {showShelters &&
            ZONES.map((zone) =>
              zone.shelters.map((shelter, sIdx) => {
                // Approximate coordinate offset around zone
                const sx = (zone.x + (sIdx === 0 ? 3.5 : -3.5)) * 10;
                const sy = (zone.y + (sIdx === 0 ? -4.2 : 4.5)) * 6.2;

                return (
                  <g
                    key={`shelter-${zone.id}-${sIdx}`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntity({ type: 'shelter', data: shelter, zoneName: zone.name });
                    }}
                  >
                    <rect
                      x={sx - 8}
                      y={sy - 8}
                      width="16"
                      height="16"
                      rx="3"
                      fill="#065f46"
                      stroke="#10b981"
                      strokeWidth="1.5"
                    />
                    <text
                      x={sx}
                      y={sy + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      S
                    </text>
                  </g>
                );
              })
            )}

          {/* Incidents Markers */}
          {showIncidents &&
            incidents.map((incident) => {
              const ix = (incident.location.mapX || selectedZone.x) * 10;
              const iy = (incident.location.mapY || selectedZone.y) * 6.2;
              const isCrit = incident.severity === 'critical';

              return (
                <g
                  key={`map-inc-${incident.id}`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntity({ type: 'incident', data: incident });
                    if (onSelectIncident) onSelectIncident(incident);
                  }}
                >
                  {isCrit && (
                    <circle
                      cx={ix}
                      cy={iy}
                      r="16"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      className="animate-ping"
                    />
                  )}
                  <polygon
                    points={`${ix},${iy - 12} ${ix + 10},${iy + 6} ${ix - 10},${iy + 6}`}
                    fill={isCrit ? '#ef4444' : '#f97316'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={ix}
                    y={iy + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </g>
              );
            })}

          {/* Responder Locations Markers ("LAST KNOWN LOCATION") */}
          {showResponders &&
            responders.map((resp) => {
              // Estimate coordinates on schematic map
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
                  {/* Beacon Halo */}
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

        {/* Legend / Overlay Badge */}
        <div className="absolute bottom-3 left-3 rounded border border-slate-800/90 bg-slate-950/85 p-2.5 backdrop-blur font-mono text-[0.68rem] text-slate-300">
          <div className="font-semibold text-slate-400 mb-1.5 uppercase">Map Legend</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500" />
              <span>Critical Zone (&gt;75)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-orange-500" />
              <span>High Risk (55-75)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" />
              <span>Moderate (35-55)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <span>Low Risk (&lt;35)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded bg-emerald-700 border border-emerald-400" />
              <span>High-Ground Shelter</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-sky-500 border border-white" />
              <span>Last Known GPS (QRT)</span>
            </div>
          </div>
        </div>

        {/* Selected Entity Inspector Card (Bottom-Right) */}
        {selectedEntity && (
          <div className="absolute top-3 right-3 max-w-xs rounded-lg border border-cyan-500/40 bg-slate-950/95 p-3.5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="label-caps text-cyan-400">
                {selectedEntity.type === 'zone'
                  ? 'Zone Telemetry'
                  : selectedEntity.type === 'shelter'
                  ? 'Shelter Overview'
                  : selectedEntity.type === 'incident'
                  ? 'Incident Dispatch'
                  : 'Last Known Location'}
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
                    <div>Elevation: {selectedEntity.data.elevationM} m · Slope: {selectedEntity.data.slopePct}%</div>
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
                  <p className="text-slate-300">Zone: {selectedEntity.zoneName}</p>
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
                    <div>ID: {selectedEntity.data.id} · Status: <span className="uppercase text-amber-300">{selectedEntity.data.status}</span></div>
                    <div>Severity: <span className="uppercase text-rose-300">{selectedEntity.data.severity}</span></div>
                    <p className="text-slate-300 mt-1">{selectedEntity.data.description}</p>
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
