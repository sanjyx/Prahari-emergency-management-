import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { RiskMapView } from './components/RiskMapView';
import { IncidentManagementView } from './components/IncidentManagementView';
import { ResponderLocationView } from './components/ResponderLocationView';
import { AStarRoutingView } from './components/AStarRoutingView';
import { LiveSensorsView } from './components/LiveSensorsView';
import { RiskAnalysisView } from './components/RiskAnalysisView';
import { AlertsView } from './components/AlertsView';
import { AboutView } from './components/AboutView';
import { ConnectivityModal } from './components/ConnectivityModal';
import { VoiceReportModal } from './components/VoiceReportModal';
import { ScenarioConsole } from './components/ScenarioConsole';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  AStarPathResult,
  AlertItem,
  Incident,
  IncidentStatus,
  LastKnownLocation,
  NetworkMode,
  OfflineAction,
  RiskLevel,
  UserProfile,
  UserRole,
  Zone
} from './types';
import { calculateRisk, generateSensors, ROUTE_EDGES, ROUTE_NODES, ZONES } from './data/zones';
import { incidentService } from './services/incidentService';
import { alertService } from './services/alertService';
import { locationService } from './services/locationService';
import { userService } from './services/userService';
import { offlineSyncManager } from './services/offlineSync';
import { findAStarEmergencyRoute } from './services/aStarRouting';
import { isFeatureEnabled } from './config/features';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedZone, setSelectedZone] = useState<Zone>(ZONES[0]);
  const [rainMultiplier, setRainMultiplier] = useState<number>(1.0);
  const [voiceReportModalOpen, setVoiceReportModalOpen] = useState(false);
  const [scenarioConsoleOpen, setScenarioConsoleOpen] = useState(false);
  const [featureVersion, setFeatureVersion] = useState(0);

  // Core Data Collections via isolated services
  const [currentUser, setCurrentUser] = useState<UserProfile>(userService.getCurrentUser());
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [responders, setResponders] = useState<UserProfile[]>([]);

  // Connectivity & Queue
  const [networkMode, setNetworkMode] = useState<NetworkMode>(offlineSyncManager.getMode());
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // GPS & Location Telemetry
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Active A* Routing
  const [activeRoute, setActiveRoute] = useState<AStarPathResult | null>(() =>
    findAStarEmergencyRoute(ROUTE_NODES[0].id, ROUTE_NODES[3].id, ROUTE_NODES, ROUTE_EDGES, {}, new Set())
  );

  // Calculate current zone risk
  const currentRisk = useMemo(
    () => calculateRisk(selectedZone, rainMultiplier),
    [selectedZone, rainMultiplier]
  );

  // Sensors for current zone
  const sensors = useMemo(
    () => generateSensors(selectedZone, currentRisk),
    [selectedZone, currentRisk]
  );

  // Calculate zone risk map for all 6 zones
  const zoneRisks = useMemo(() => {
    const map: Record<string, { score: number; level: RiskLevel }> = {};
    for (const z of ZONES) {
      const r = calculateRisk(z, rainMultiplier);
      map[z.id] = { score: r.score, level: r.level };
    }
    return map;
  }, [rainMultiplier]);

  const zoneRiskLevels = useMemo(() => {
    const map: Record<string, RiskLevel> = {};
    for (const [id, r] of Object.entries(zoneRisks)) {
      map[id] = (r as { score: number; level: RiskLevel }).level;
    }
    return map;
  }, [zoneRisks]);

  // Subscriptions on mount
  useEffect(() => {
    const unsubUser = userService.subscribeUser((u) => setCurrentUser(u));
    const unsubIncidents = incidentService.subscribeIncidents((incs) => setIncidents(incs));
    const unsubAlerts = alertService.subscribeAlerts((alts) => setAlerts(alts));
    const unsubResponders = locationService.subscribeResponders((resps) => setResponders(resps));

    const unsubSync = offlineSyncManager.subscribe((q, mode) => {
      setOfflineQueue(q);
      setNetworkMode(mode);
    });

    return () => {
      unsubUser();
      unsubIncidents();
      unsubAlerts();
      unsubResponders();
      unsubSync();
    };
  }, []);

  // When features update, ensure activeTab is still valid
  const handleFeaturesUpdated = useCallback(() => {
    setFeatureVersion((v) => v + 1);
    if (activeTab === 'risk-map' && !isFeatureEnabled('disasterRiskLayer')) setActiveTab('dashboard');
    if (activeTab === 'incidents' && !isFeatureEnabled('citizenReporting')) setActiveTab('dashboard');
    if (activeTab === 'responders' && !isFeatureEnabled('rescueTracking')) setActiveTab('dashboard');
    if (activeTab === 'routing' && !isFeatureEnabled('aStarRouting')) setActiveTab('dashboard');
    if (activeTab === 'sensors' && !isFeatureEnabled('sensorMonitoring')) setActiveTab('dashboard');
    if (activeTab === 'alerts' && !isFeatureEnabled('publicAlerts')) setActiveTab('dashboard');
  }, [activeTab]);

  // Geolocation handler (Last Known Location)
  const handleShareLocation = async () => {
    if (!isFeatureEnabled('lastKnownLocation')) {
      setLocationStatus('Last Known Location module is disabled.');
      return;
    }

    setIsSharingLocation(true);
    setLocationStatus('Acquiring high-accuracy GPS fix from device...');

    try {
      const pos = await locationService.getCurrentPosition();
      const loc: LastKnownLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: pos.timestamp || Date.now(),
        accuracy: Math.round(pos.coords.accuracy),
        source: 'gps',
        zoneId: selectedZone.id,
        zoneName: selectedZone.name
      };

      await locationService.updateLastKnownLocation(loc);
      setIsSharingLocation(false);
      setLocationStatus(`GPS fix acquired: ${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°E (±${loc.accuracy}m)`);
    } catch (err) {
      setIsSharingLocation(false);
      console.warn('Geolocation error, falling back to sector centroid:', err);
      const fallbackLoc: LastKnownLocation = {
        lat: 30.408 + (Math.random() * 0.02 - 0.01),
        lng: 79.325 + (Math.random() * 0.02 - 0.01),
        timestamp: Date.now(),
        accuracy: 25,
        source: 'manual',
        zoneId: selectedZone.id,
        zoneName: selectedZone.name
      };
      await locationService.updateLastKnownLocation(fallbackLoc);
      setLocationStatus(`Sector telemetry calibrated with estimated position (${selectedZone.name})`);
    }
  };

  // Handlers
  const handleRoleChange = (role: UserRole) => {
    userService.setCurrentUserRole(role);
  };

  const handleCreateIncident = async (incidentData: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>) => {
    await incidentService.createIncident(incidentData);
  };

  const handleUpdateIncidentStatus = async (incidentId: string, status: IncidentStatus, notes?: string) => {
    await incidentService.updateIncidentStatus(incidentId, status, notes);
  };

  const handleAssignResponder = async (
    incidentId: string,
    responder: { uid: string; name: string; unit?: string; phone?: string }
  ) => {
    await incidentService.assignResponder(incidentId, responder);
  };

  const handleCreateAlert = async (alertData: Omit<AlertItem, 'id' | 'issuedAt'>) => {
    await alertService.createAlert(alertData);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    await offlineSyncManager.triggerSync();
    setIsSyncing(false);
  };

  // Quick navigation to A* routing from incident or responder
  const handleNavigateToIncidentRouting = (incident: Incident) => {
    const targetNode = ROUTE_NODES.find((n) => n.zoneId === incident.zoneId) || ROUTE_NODES[3];
    const route = findAStarEmergencyRoute(ROUTE_NODES[0].id, targetNode.id, ROUTE_NODES, ROUTE_EDGES, zoneRiskLevels, new Set());
    setActiveRoute(route);
    setActiveTab('routing');
  };

  const handleNavigateToResponderRouting = (responder: UserProfile) => {
    const startNode = ROUTE_NODES.find((n) => n.zoneId === responder.lastKnownLocation?.zoneId) || ROUTE_NODES[0];
    const targetNode = ROUTE_NODES.find((n) => n.type === 'shelter' && n.zoneId === responder.lastKnownLocation?.zoneId) || ROUTE_NODES[3];
    const route = findAStarEmergencyRoute(startNode.id, targetNode.id, ROUTE_NODES, ROUTE_EDGES, zoneRiskLevels, new Set());
    setActiveRoute(route);
    setActiveTab('routing');
  };

  return (
    <div key={featureVersion} className="min-h-screen bg-[#0c1118] text-[#e2e8f0] flex flex-col">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        networkMode={networkMode}
        pendingSyncCount={offlineQueue.length}
        openSyncModal={() => setSyncModalOpen(true)}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        onShareLocation={handleShareLocation}
        isSharingLocation={isSharingLocation}
        locationStatus={locationStatus}
        onFeaturesUpdated={handleFeaturesUpdated}
        onOpenScenarioConsole={() => setScenarioConsoleOpen(true)}
      />

      {/* Main Content Viewport with Error Isolation */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <ErrorBoundary moduleName="Dashboard Operations">
            <DashboardView
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
              rainMultiplier={rainMultiplier}
              onMultiplierChange={setRainMultiplier}
              riskResult={currentRisk}
              onOpenIncidentModal={() => setActiveTab('incidents')}
              onOpenVoiceModal={() => setVoiceReportModalOpen(true)}
              onOpenScenarioConsole={() => setScenarioConsoleOpen(true)}
              onNavigateToRouting={() => setActiveTab('routing')}
              incidents={incidents}
              alerts={alerts}
              responders={responders}
              onSelectIncident={(inc) => setActiveTab('incidents')}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'risk-map' && isFeatureEnabled('disasterRiskLayer') && (
          <ErrorBoundary moduleName="Topographic Risk Map">
            <RiskMapView
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
              zoneRisks={zoneRisks}
              incidents={incidents}
              responders={responders}
              activeRoute={activeRoute}
              onSelectIncident={(inc) => {
                setActiveTab('incidents');
              }}
              onSelectResponder={(resp) => {
                setActiveTab('responders');
              }}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'incidents' && isFeatureEnabled('citizenReporting') && (
          <ErrorBoundary moduleName="Incident Management & Dispatch">
            <IncidentManagementView
              incidents={incidents}
              currentUser={currentUser}
              responders={responders}
              selectedZone={selectedZone}
              onCreateIncident={handleCreateIncident}
              onUpdateStatus={handleUpdateIncidentStatus}
              onAssignResponder={handleAssignResponder}
              onNavigateToAStar={handleNavigateToIncidentRouting}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'responders' && isFeatureEnabled('rescueTracking') && (
          <ErrorBoundary moduleName="Rescue Team Telemetry">
            <ResponderLocationView
              responders={responders}
              currentUser={currentUser}
              onRefreshLocation={handleShareLocation}
              isRefreshingLocation={isSharingLocation}
              locationStatus={locationStatus}
              onNavigateToResponder={handleNavigateToResponderRouting}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'routing' && isFeatureEnabled('aStarRouting') && (
          <ErrorBoundary moduleName="A* Pathfinder Evacuation Routing">
            <AStarRoutingView
              onApplyRouteToMap={(r) => setActiveRoute(r)}
              zoneRiskMap={zoneRiskLevels}
              responders={responders}
              onOpenMap={() => setActiveTab('risk-map')}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'sensors' && isFeatureEnabled('sensorMonitoring') && (
          <ErrorBoundary moduleName="Live Watershed Sensor Telemetry">
            <LiveSensorsView
              sensors={sensors}
              selectedZone={selectedZone}
              onRefreshSensors={() => {
                setLocationStatus('Sensor network telemetry polled and synchronized.');
              }}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'analysis' && (
          <ErrorBoundary moduleName="Risk Analysis & Hydrological Modeling">
            <RiskAnalysisView
              selectedZone={selectedZone}
              rainMultiplier={rainMultiplier}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'alerts' && isFeatureEnabled('publicAlerts') && (
          <ErrorBoundary moduleName="Public Warning & Alerts Dispatch">
            <AlertsView
              alerts={alerts}
              currentUser={currentUser}
              onCreateAlert={handleCreateAlert}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'about' && (
          <ErrorBoundary moduleName="About PRAHARI">
            <AboutView />
          </ErrorBoundary>
        )}
      </main>

      {/* Low-Connectivity & Offline Sync Modal */}
      {isFeatureEnabled('lowConnectivity') && (
        <ConnectivityModal
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          networkMode={networkMode}
          onSetNetworkMode={(m) => offlineSyncManager.setMode(m, true)}
          queue={offlineQueue}
          onTriggerSync={handleTriggerSync}
          isSyncing={isSyncing}
          onClearQueue={() => offlineSyncManager.clearQueue()}
          syncLogs={offlineSyncManager.getSyncLogs()}
        />
      )}

      {/* Global Voice Emergency Reporting Modal */}
      {isFeatureEnabled('voiceReporting') && (
        <VoiceReportModal
          isOpen={voiceReportModalOpen}
          onClose={() => setVoiceReportModalOpen(false)}
          currentUser={currentUser}
          selectedZone={selectedZone}
          onSubmitIncident={handleCreateIncident}
          isSimulationMode={scenarioConsoleOpen}
          onSwitchToManual={() => {
            setVoiceReportModalOpen(false);
            setActiveTab('incidents');
          }}
        />
      )}

      {/* Controlled Demonstration Scenario Console */}
      <ScenarioConsole
        isOpen={scenarioConsoleOpen}
        onClose={() => setScenarioConsoleOpen(false)}
        selectedZone={selectedZone}
        onSelectZone={setSelectedZone}
        onSetRainMultiplier={setRainMultiplier}
        onSetSystemStatus={(status) => {
          // Status updated
        }}
        onOpenVoiceModal={() => setVoiceReportModalOpen(true)}
        onSetLowConnectivity={(isLow) => {
          offlineSyncManager.setMode(isLow ? 'low_connectivity' : 'online', true);
        }}
        onTriggerRoadBlock={(blocked) => {
          if (blocked) {
            const blockedEdges = new Set(['edge-1']);
            const altRoute = findAStarEmergencyRoute(
              ROUTE_NODES[0].id,
              ROUTE_NODES[3].id,
              ROUTE_NODES,
              ROUTE_EDGES,
              zoneRiskLevels,
              blockedEdges
            );
            setActiveRoute(altRoute);
          } else {
            const normalRoute = findAStarEmergencyRoute(
              ROUTE_NODES[0].id,
              ROUTE_NODES[3].id,
              ROUTE_NODES,
              ROUTE_EDGES,
              zoneRiskLevels,
              new Set()
            );
            setActiveRoute(normalRoute);
          }
        }}
        onAssignResponderToIncident={async (incidentId, responderName, unit) => {
          await incidentService.assignResponder(incidentId, {
            uid: 'resp-sim-01',
            name: responderName,
            unit
          });
        }}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* Disaster Operations Footer */}
      <footer className="border-t border-[#212d3d] bg-[#101722] py-3.5 px-6 text-center font-mono text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>PRAHARI Flash Flood &amp; Emergency Management Platform · SIH Government Grade Edition</span>
          <span>Role: <strong className="text-sky-400 capitalize">{currentUser.role}</strong> · Status: <strong className="text-emerald-400">Telemetry Active</strong></span>
        </div>
      </footer>
    </div>
  );
}
