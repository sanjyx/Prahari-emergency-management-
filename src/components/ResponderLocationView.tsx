import React from 'react';
import {
  MapPin,
  Clock,
  BatteryCharging,
  Radio,
  Shield,
  UserCheck,
  Compass,
  AlertTriangle,
  RefreshCw,
  Send,
  Lock
} from 'lucide-react';
import { UserProfile } from '../types';

interface ResponderLocationViewProps {
  responders: UserProfile[];
  currentUser: UserProfile;
  onRefreshLocation: () => void;
  isRefreshingLocation: boolean;
  locationStatus: string | null;
  onNavigateToResponder: (responder: UserProfile) => void;
}

export const ResponderLocationView: React.FC<ResponderLocationViewProps> = ({
  responders,
  currentUser,
  onRefreshLocation,
  isRefreshingLocation,
  locationStatus,
  onNavigateToResponder
}) => {
  const isAuthorized = currentUser.role === 'responder' || currentUser.role === 'authority' || currentUser.role === 'admin';

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              Field Responder Telemetry &amp; Last Known Location
            </h2>
            <span className="rounded border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 font-mono text-[0.65rem] text-cyan-300">
              GPS Tactical Feed
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            Real-time geospatial tracking of SDRF, NDRF, and district emergency response units
          </p>
        </div>

        <button
          id="refresh-gps-btn"
          type="button"
          onClick={onRefreshLocation}
          disabled={isRefreshingLocation}
          className="flex items-center gap-1.5 rounded border border-emerald-500/50 bg-emerald-950/40 px-3.5 py-2 font-mono text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-900/50 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isRefreshingLocation ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{isRefreshingLocation ? 'Acquiring GPS Fix...' : 'Update My GPS Fix'}</span>
        </button>
      </div>

      {/* Location Status Message (if any) */}
      {locationStatus && (
        <div className="rounded border border-cyan-500/30 bg-cyan-950/30 p-2.5 font-mono text-xs text-cyan-300 flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-cyan-400" />
          <span>{locationStatus}</span>
        </div>
      )}

      {/* My Current User Location Card */}
      <div className="rounded-lg border border-cyan-500/40 bg-slate-900/95 p-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
              <Compass className="size-4" />
            </div>
            <div>
              <span className="label-caps text-cyan-400">My Device Telemetry</span>
              <h3 className="font-bold text-sm text-white">{currentUser.name} ({currentUser.role.toUpperCase()})</h3>
            </div>
          </div>

          <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[0.68rem] font-bold text-emerald-400 uppercase">
            {currentUser.isOnline ? 'Transmitting' : 'Cached Local'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4 font-mono text-xs">
          <div className="rounded border border-slate-800 bg-slate-950/80 p-2.5">
            <span className="text-[0.65rem] text-slate-400 uppercase block mb-0.5">STATUS LABEL</span>
            <span className="font-bold text-emerald-400">LAST KNOWN LOCATION</span>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/80 p-2.5">
            <span className="text-[0.65rem] text-slate-400 uppercase block mb-0.5">Coordinates</span>
            <span className="text-white font-semibold">
              {currentUser.lastKnownLocation
                ? `${currentUser.lastKnownLocation.lat.toFixed(5)}°N, ${currentUser.lastKnownLocation.lng.toFixed(5)}°E`
                : 'GPS Fix Not Acquired'}
            </span>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/80 p-2.5">
            <span className="text-[0.65rem] text-slate-400 uppercase block mb-0.5">Fix Timestamp</span>
            <span className="text-cyan-300">
              {currentUser.lastKnownLocation
                ? new Date(currentUser.lastKnownLocation.timestamp).toLocaleTimeString()
                : 'Pending'}
            </span>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/80 p-2.5">
            <span className="text-[0.65rem] text-slate-400 uppercase block mb-0.5">Accuracy / Source</span>
            <span className="text-slate-300">
              {currentUser.lastKnownLocation
                ? `±${currentUser.lastKnownLocation.accuracy || 15}m (${currentUser.lastKnownLocation.source || 'gps'})`
                : 'Awaiting Sensor'}
            </span>
          </div>
        </div>
      </div>

      {/* Role-Based Privacy Boundary Notice for Citizens */}
      {!isAuthorized ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-6 text-center">
          <Lock className="mx-auto size-8 text-amber-400 mb-2" />
          <h3 className="font-display text-base font-bold uppercase text-amber-300">
            Responder Tactical Telemetry Privacy Boundary
          </h3>
          <p className="mt-1 text-xs text-slate-300 max-w-md mx-auto">
            In accordance with disaster management protocols, precise responder coordinates are restricted to verified First Responders, Incident Commanders, and Authority dispatchers.
          </p>
          <p className="mt-2 font-mono text-[0.68rem] text-slate-400">
            (Switch role to <strong className="text-cyan-300">Responder</strong> or <strong className="text-amber-300">Authority</strong> in the top-right role selector to inspect live tactical responder tracking)
          </p>
        </div>
      ) : (
        /* Tactical Responders Directory */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="label-caps">Active Field Deployment Units ({responders.length})</span>
            <span className="font-mono text-[0.65rem] text-slate-400">
              SDRF / NDRF / Police QRT Grid
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {responders.map((resp) => (
              <div
                key={resp.uid}
                className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 transition-all hover:border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold text-cyan-300 uppercase">
                      Tactical QRT
                    </span>
                    <h3 className="mt-1 font-bold text-sm text-white">{resp.name}</h3>
                    <p className="font-mono text-[0.68rem] text-slate-400">{resp.unit}</p>
                  </div>
                  <span
                    className={`size-2.5 rounded-full ${
                      resp.isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                </div>

                <div className="mt-3 rounded border border-slate-800/80 bg-slate-950 p-2.5 font-mono text-[0.68rem] space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[0.62rem] uppercase font-bold text-emerald-400">
                      LAST KNOWN LOCATION:
                    </span>
                    <span className="text-slate-400">
                      {resp.lastKnownLocation
                        ? `${Math.round((Date.now() - resp.lastKnownLocation.timestamp) / 60000)}m ago`
                        : 'Offline'}
                    </span>
                  </div>
                  <div className="text-slate-200">
                    {resp.lastKnownLocation
                      ? `${resp.lastKnownLocation.lat.toFixed(4)}°N, ${resp.lastKnownLocation.lng.toFixed(4)}°E`
                      : 'Not Reported'}
                  </div>
                  <div className="text-slate-400 text-[0.62rem]">
                    Zone Sector: {resp.lastKnownLocation?.zoneName || 'Hilly District'} · Phone: {resp.phone || 'N/A'}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                  <span className="font-mono text-[0.65rem] text-slate-400">
                    Battery: <strong className="text-slate-200">84%</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateToResponder(resp)}
                    className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-950/30 px-2.5 py-1 font-mono text-[0.68rem] font-semibold text-cyan-300 hover:bg-cyan-950/60"
                  >
                    <Send className="size-3 text-cyan-400" />
                    <span>Route To Unit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
