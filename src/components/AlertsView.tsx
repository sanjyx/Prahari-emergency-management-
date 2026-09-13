import React, { useState } from 'react';
import { Bell, Send, AlertTriangle, Radio, Shield, CheckCircle, Plus } from 'lucide-react';
import { AlertItem, RiskLevel, UserProfile, Zone } from '../types';
import { ZONES, RISK_LEVELS } from '../data/zones';

interface AlertsViewProps {
  alerts: AlertItem[];
  currentUser: UserProfile;
  onCreateAlert: (alert: Omit<AlertItem, 'id' | 'issued'>) => Promise<void>;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  currentUser,
  onCreateAlert
}) => {
  const [showModal, setShowModal] = useState(false);
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const [level, setLevel] = useState<RiskLevel>('High');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('SMS Broadcast + Siren Array');
  const [isSending, setIsSending] = useState(false);

  const canBroadcast = currentUser.role === 'authority' || currentUser.role === 'admin';

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setIsSending(true);
    try {
      const zName = ZONES.find((z) => z.id === zoneId)?.name || 'Hilly Zone';
      await onCreateAlert({
        zoneId,
        zone: zName,
        level,
        message,
        channel,
        status: 'Active',
        createdBy: currentUser.uid
      });
      setMessage('');
      setShowModal(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              Public Safety Alerts &amp; Siren Dispatch
            </h2>
            <span className="rounded border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 font-mono text-[0.65rem] text-amber-300">
              National Early Warning Network
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            Emergency broadcast system pushing alerts via Cell Broadcast, CAP, SMS, and acoustic sirens
          </p>
        </div>

        {canBroadcast && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded bg-amber-600 px-3.5 py-2 font-mono text-xs font-semibold text-white hover:bg-amber-500"
          >
            <Plus className="size-4" />
            <span>Issue Emergency Broadcast</span>
          </button>
        )}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const meta = RISK_LEVELS[alert.level];
          return (
            <div
              key={alert.id}
              className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 transition-all hover:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500">{alert.id}</span>
                    <span className={`rounded px-1.5 py-0.5 font-bold uppercase text-[0.65rem] ${meta.chip}`}>
                      {alert.level} Hazard
                    </span>
                    <span className="text-slate-400">{alert.issued}</span>
                  </div>
                  <h3 className="mt-1 font-bold text-sm text-white">{alert.zone}</h3>
                </div>

                <div className="rounded bg-slate-950 px-2.5 py-1 font-mono text-[0.68rem] text-cyan-300 border border-slate-800">
                  Channel: {alert.channel}
                </div>
              </div>

              <p className="mt-2.5 rounded bg-slate-950/80 border border-slate-800/80 p-3 text-xs text-slate-200 leading-relaxed font-mono">
                {alert.message}
              </p>
            </div>
          );
        })}
      </div>

      {/* Modal: Issue Alert */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-lg font-bold uppercase text-white">
                Issue Public Safety Broadcast
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="font-mono text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="mt-4 space-y-3.5 text-xs font-mono">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Target Watershed Catchment</label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                >
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Alert Severity</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as RiskLevel)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Transmission Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="SMS Broadcast + Siren Array">SMS + Siren Array</option>
                    <option value="Cell Broadcast (CAP)">Cell Broadcast (CAP)</option>
                    <option value="Civil Defense Radio + App">Civil Defense Radio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Broadcast Text Message</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Flash flood warning issued for Chamoli Upper Valley. Immediate evacuation from riverbanks advised."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="rounded bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {isSending ? 'Transmitting...' : 'Dispatch Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
