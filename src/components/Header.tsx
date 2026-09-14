import React, { useState } from 'react';
import {
  Shield,
  Radio,
  Wifi,
  WifiOff,
  MapPin,
  Flame,
  Route,
  Activity,
  BarChart3,
  Bell,
  Info,
  Layers,
  RefreshCw,
  UserCheck,
  Sliders
} from 'lucide-react';
import { NetworkMode, UserProfile, UserRole } from '../types';
import { isFeatureEnabled } from '../config/features';
import { FeatureSettingsModal } from './FeatureSettingsModal';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  networkMode: NetworkMode;
  pendingSyncCount: number;
  openSyncModal: () => void;
  currentUser: UserProfile;
  onRoleChange: (role: UserRole) => void;
  onShareLocation: () => void;
  isSharingLocation: boolean;
  locationStatus: string | null;
  onFeaturesUpdated?: () => void;
  onOpenScenarioConsole?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  networkMode,
  pendingSyncCount,
  openSyncModal,
  currentUser,
  onRoleChange,
  onShareLocation,
  isSharingLocation,
  locationStatus,
  onFeaturesUpdated,
  onOpenScenarioConsole
}) => {
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  const rawNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, requiredFeature: null },
    { id: 'risk-map', label: 'Risk Map', icon: Layers, requiredFeature: 'disasterRiskLayer' as const },
    { id: 'incidents', label: 'Incidents', icon: Flame, requiredFeature: 'citizenReporting' as const },
    { id: 'responders', label: 'Responders', icon: MapPin, requiredFeature: 'rescueTracking' as const },
    { id: 'routing', label: 'A* Pathfinder', icon: Route, requiredFeature: 'aStarRouting' as const },
    { id: 'sensors', label: 'Live Sensors', icon: Radio, requiredFeature: 'sensorMonitoring' as const },
    { id: 'analysis', label: 'Risk Analysis', icon: BarChart3, requiredFeature: null },
    { id: 'alerts', label: 'Alerts', icon: Bell, requiredFeature: 'publicAlerts' as const },
    { id: 'about', label: 'About', icon: Info, requiredFeature: null }
  ];

  const navItems = rawNavItems.filter((item) => {
    if (!item.requiredFeature) return true;
    return isFeatureEnabled(item.requiredFeature);
  });

  return (
    <header className="sticky top-0 z-40 border-b border-[#283548] bg-[#111823]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
            <Shield className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold uppercase tracking-wider text-white">
                PRAHARI
              </span>
              <span className="rounded border border-cyan-500/30 bg-cyan-950/60 px-1.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-widest text-cyan-400">
                Command OS
              </span>
            </div>
            <p className="font-mono text-[0.65rem] text-slate-400">
              Hilly Region Flash Flood &amp; Emergency Management
            </p>
          </div>
        </div>

        {/* Action Controls: Location, Sync, Role, Features */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Last Known Location Action (if enabled) */}
          {isFeatureEnabled('lastKnownLocation') && (
            <button
              id="share-location-btn"
              type="button"
              onClick={onShareLocation}
              disabled={isSharingLocation}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
                currentUser.lastKnownLocation
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-cyan-500/50'
              }`}
              title={locationStatus || 'Update Last Known Location via GPS'}
            >
              <MapPin className={`size-3.5 ${isSharingLocation ? 'animate-bounce text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">
                {currentUser.lastKnownLocation ? 'Last Known GPS' : 'Share GPS'}
              </span>
              {currentUser.lastKnownLocation && (
                <span className="font-mono text-[0.6rem] text-emerald-400">
                  {Math.round((Date.now() - currentUser.lastKnownLocation.timestamp) / 60000)}m ago
                </span>
              )}
            </button>
          )}

          {/* Network Mode & Sync Status Indicator (if enabled) */}
          {isFeatureEnabled('lowConnectivity') && (
            <button
              id="network-sync-btn"
              type="button"
              onClick={openSyncModal}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
                networkMode === 'online'
                  ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400 hover:border-emerald-500/60'
                  : networkMode === 'low_connectivity'
                  ? 'border-amber-500/40 bg-amber-950/40 text-amber-400 hover:border-amber-500/70'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-400 hover:border-rose-500/70'
              }`}
            >
              {networkMode === 'online' ? (
                <Wifi className="size-3.5" />
              ) : networkMode === 'low_connectivity' ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
              <span className="capitalize">{networkMode.replace('_', ' ')}</span>
              {pendingSyncCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.2 font-mono text-[0.6rem] font-bold text-slate-950">
                  {pendingSyncCount} queued
                </span>
              )}
            </button>
          )}

          {/* User Role Switcher */}
          <div className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-2 py-1">
            <UserCheck className="size-3.5 text-slate-400" />
            <span className="hidden text-[0.68rem] text-slate-400 md:inline font-mono">Role:</span>
            <select
              id="user-role-select"
              value={currentUser.role}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent font-mono text-xs font-semibold capitalize text-cyan-300 outline-none cursor-pointer"
            >
              <option value="citizen" className="bg-slate-900 text-slate-200">Citizen</option>
              <option value="responder" className="bg-slate-900 text-cyan-300">Responder</option>
              <option value="authority" className="bg-slate-900 text-amber-300">Authority</option>
              <option value="admin" className="bg-slate-900 text-rose-300">Admin</option>
            </select>
          </div>

          {/* Emergency Scenario Mode Button */}
          {onOpenScenarioConsole && (
            <button
              id="header-scenario-mode-btn"
              type="button"
              onClick={onOpenScenarioConsole}
              className="flex items-center gap-1.5 rounded border border-rose-500/50 bg-rose-950/60 px-2.5 py-1 font-mono text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 transition-colors shadow-sm"
              title="Open Controlled Emergency Scenario Simulation Console"
            >
              <span className="size-2 rounded-full bg-rose-500 animate-ping" />
              <span className="hidden sm:inline">Scenario Mode</span>
              <span className="sm:hidden">Demo</span>
            </button>
          )}

          {/* Feature Configuration Toggle Button */}
          <button
            id="feature-toggles-btn"
            type="button"
            onClick={() => setShowFeatureModal(true)}
            className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-2 py-1 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
            title="Configure Modular Features"
          >
            <Sliders className="size-3.5" />
            <span className="hidden md:inline font-mono text-xs">Features</span>
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="border-t border-[#283548]/60 bg-[#141b25]/80 px-4">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto py-1 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 font-medium transition-all ${
                  isActive
                    ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className={`size-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Feature Settings Modal */}
      <FeatureSettingsModal
        isOpen={showFeatureModal}
        onClose={() => setShowFeatureModal(false)}
        onFeatureChange={() => {
          if (onFeaturesUpdated) onFeaturesUpdated();
        }}
      />
    </header>
  );
};
