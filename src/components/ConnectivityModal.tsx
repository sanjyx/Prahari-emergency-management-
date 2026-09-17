import React from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2
} from 'lucide-react';
import { NetworkMode, OfflineAction } from '../types';

interface ConnectivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkMode: NetworkMode;
  onSetNetworkMode: (mode: NetworkMode) => void;
  queue: OfflineAction[];
  onTriggerSync: () => void;
  isSyncing: boolean;
  onClearQueue: () => void;
  syncLogs: { id: string; message: string; timestamp: number; success: boolean }[];
}

export const ConnectivityModal: React.FC<ConnectivityModalProps> = ({
  isOpen,
  onClose,
  networkMode,
  onSetNetworkMode,
  queue,
  onTriggerSync,
  isSyncing,
  onClearQueue,
  syncLogs
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded bg-cyan-500/20 text-cyan-400">
              <Database className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold uppercase text-white">
                Low-Connectivity &amp; Offline Sync Center
              </h3>
              <p className="font-mono text-[0.68rem] text-slate-400">
                Local queue management &amp; network simulation controls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Network Mode Simulator Controls */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2 font-mono text-xs">
          <span className="label-caps text-cyan-400">Network Simulation State</span>
          <p className="text-[0.68rem] text-slate-400">
            Select an operational state to test offline caching, local queuing, and automatic reconciliation:
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSetNetworkMode('online')}
              className={`flex items-center justify-center gap-1.5 rounded border p-2 text-xs transition-colors ${
                networkMode === 'online'
                  ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 font-bold'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi className="size-3 text-emerald-400" />
              <span>Online</span>
            </button>

            <button
              type="button"
              onClick={() => onSetNetworkMode('low_connectivity')}
              className={`flex items-center justify-center gap-1.5 rounded border p-2 text-xs transition-colors ${
                networkMode === 'low_connectivity'
                  ? 'border-amber-500 bg-amber-950/50 text-amber-300 font-bold'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <RefreshCw className="size-3 text-amber-400" />
              <span>Low-Bandwidth</span>
            </button>

            <button
              type="button"
              onClick={() => onSetNetworkMode('offline')}
              className={`flex items-center justify-center gap-1.5 rounded border p-2 text-xs transition-colors ${
                networkMode === 'offline'
                  ? 'border-rose-500 bg-rose-950/50 text-rose-300 font-bold'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <WifiOff className="size-3 text-rose-400" />
              <span>Offline Sim</span>
            </button>
          </div>
        </div>

        {/* Queued Mutations */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="label-caps text-amber-400">
              Pending Sync Queue ({queue.length})
            </span>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={onClearQueue}
                className="flex items-center gap-1 font-mono text-[0.65rem] text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="size-3" /> Clear
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="rounded border border-slate-800/60 bg-slate-900/40 p-4 text-center font-mono text-xs text-slate-400">
              All transactions synced with server. No local mutations pending.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 p-2 font-mono text-xs"
                >
                  <div>
                    <span className="font-bold text-white uppercase text-[0.68rem]">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="block text-[0.62rem] text-slate-400">
                      ID: {item.id} · {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold uppercase ${
                      item.status === 'syncing'
                        ? 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                        : item.status === 'failed'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onTriggerSync}
              disabled={isSyncing || queue.length === 0 || networkMode === 'offline'}
              className="w-full flex items-center justify-center gap-2 rounded bg-cyan-600 py-2 font-mono text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing Transactions...' : 'Sync Pending Queue Now'}</span>
            </button>
          </div>
        </div>

        {/* Sync Audit Logs */}
        {syncLogs.length > 0 && (
          <div className="space-y-1 font-mono text-[0.68rem] text-slate-400">
            <span className="label-caps block mb-1">Recent Sync Transactions</span>
            <div className="max-h-24 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded border border-slate-800/80">
              {syncLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-center justify-between text-slate-300">
                  <span>{log.message}</span>
                  <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
