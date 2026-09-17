import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  FastForward,
  AlertTriangle,
  Flame,
  Radio,
  MapPin,
  Route,
  UserCheck,
  Sparkles,
  Clock,
  Shield,
  CheckCircle2,
  X,
  Volume2
} from 'lucide-react';
import {
  DEFAULT_SCENARIO_CONFIG,
  EmergencyScenarioConfig,
  ScenarioMilestone
} from '../config/scenarioConfig';
import {
  AStarPathResult,
  Incident,
  RiskLevel,
  ScenarioEventLog,
  ScenarioStage,
  ScenarioStatus,
  SystemStatus,
  UserProfile,
  Zone
} from '../types';
import { incidentService } from '../services/incidentService';
import { ZONES } from '../data/zones';

interface ScenarioConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  selectedZone: Zone;
  onSelectZone: (zone: Zone) => void;
  onSetRainMultiplier: (val: number) => void;
  onSetSystemStatus: (status: SystemStatus) => void;
  onOpenVoiceModal: () => void;
  onSetLowConnectivity: (isLow: boolean) => void;
  onTriggerRoadBlock: (blocked: boolean, routeInfo?: any) => void;
  onAssignResponderToIncident?: (incidentId: string, responderName: string, unit: string) => void;
  onUpdateAiSummary?: (summary: { headline: string; text: string; action: string } | null) => void;
  onNavigateToTab?: (tabId: string) => void;
}

export const ScenarioConsole: React.FC<ScenarioConsoleProps> = ({
  isOpen,
  onClose,
  selectedZone,
  onSelectZone,
  onSetRainMultiplier,
  onSetSystemStatus,
  onOpenVoiceModal,
  onSetLowConnectivity,
  onTriggerRoadBlock,
  onAssignResponderToIncident,
  onUpdateAiSummary,
  onNavigateToTab
}) => {
  const config = DEFAULT_SCENARIO_CONFIG;
  const [status, setStatus] = useState<ScenarioStatus>('READY');
  const [seconds, setSeconds] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [activeStage, setActiveStage] = useState<ScenarioStage>('DETECT');
  const [currentMilestone, setCurrentMilestone] = useState<ScenarioMilestone>(config.milestones[0]);
  const [eventLogs, setEventLogs] = useState<ScenarioEventLog[]>([]);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);

  // Responder 5s countdown state
  const [responderCountdown, setResponderCountdown] = useState<number | null>(null);
  const [responderAssignedNotice, setResponderAssignedNotice] = useState<string | null>(null);

  // Scenario Run ID for clean data isolation
  const scenarioRunIdRef = useRef<string>(`RUN-${Date.now()}`);
  const triggeredMilestonesRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<any>(null);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper to add event log
  const addLog = (
    title: string,
    type: 'info' | 'warning' | 'critical' | 'success' | 'action',
    details?: string
  ) => {
    const newLog: ScenarioEventLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestampStr: formatTime(seconds),
      scenarioSeconds: seconds,
      title,
      details,
      type
    };
    setEventLogs((prev) => [newLog, ...prev]);
  };

  // Reset Scenario
  const handleReset = () => {
    setStatus('READY');
    setSeconds(0);
    setActiveStage('DETECT');
    setCurrentMilestone(config.milestones[0]);
    setResponderCountdown(null);
    setResponderAssignedNotice(null);
    triggeredMilestonesRef.current.clear();
    setEventLogs([]);

    // Restore environmental baseline
    onSetRainMultiplier(1.0);
    onSetSystemStatus('NORMAL');
    onSetLowConnectivity(false);
    onTriggerRoadBlock(false);
    if (onUpdateAiSummary) onUpdateAiSummary(null);

    // Isolate & clear simulation records
    incidentService.clearSimulationData(scenarioRunIdRef.current);
    scenarioRunIdRef.current = `RUN-${Date.now()}`;

    // Select baseline zone (Sector A)
    const zoneA = ZONES.find((z) => z.id === 'chamoli') || ZONES[0];
    onSelectZone(zoneA);

    addLog('Scenario reset to baseline (00:00) — Simulated records purged', 'info');
  };

  // Milestone triggers execution
  const executeMilestone = async (m: ScenarioMilestone) => {
    if (triggeredMilestonesRef.current.has(m.id)) return;
    triggeredMilestonesRef.current.add(m.id);

    setCurrentMilestone(m);
    setActiveStage(m.stage);
    onSetSystemStatus(m.systemStatus);

    if (m.rainMultiplier) {
      onSetRainMultiplier(m.rainMultiplier);
    }

    // 1. Alert trigger
    if (m.triggerAlert) {
      try {
        await incidentService.createAlert({
          zoneId: m.zoneId,
          zone: m.zoneName,
          level: m.triggerAlert.level,
          message: m.triggerAlert.message,
          channel: 'EMERGENCY BROADCST (VHF / SMS)',
          status: 'Active',
          isSimulation: true,
          scenarioRunId: scenarioRunIdRef.current
        });
      } catch (err) {
        console.warn('Simulation alert push error:', err);
      }
    }

    // 2. Incident trigger
    if (m.triggerIncident) {
      try {
        const zoneA = ZONES.find((z) => z.id === m.zoneId) || selectedZone;
        const created = await incidentService.createIncident({
          title: m.triggerIncident.title,
          type: m.triggerIncident.type,
          severity: m.triggerIncident.severity,
          status: 'reported',
          description: m.triggerIncident.description,
          zoneId: m.zoneId,
          zoneName: m.zoneName,
          location: {
            lat: 30.415,
            lng: 79.332,
            landmark: m.triggerIncident.landmark,
            mapX: zoneA.x,
            mapY: zoneA.y
          },
          reportedBy: {
            uid: 'hydrax-sim-01',
            name: 'Hydrologic Telemetry Node RG-04',
            role: 'authority',
            contact: 'SDMA Automated Sentinel'
          },
          aiTriageSummary:
            'Critical flood crest detected. Automated alert issued for lower valley inhabitants.',
          isSimulation: true,
          scenarioRunId: scenarioRunIdRef.current,
          isSos: true,
          source: 'sensor'
        });
        setCreatedIncidentId(created.id);
      } catch (err) {
        console.warn('Simulation incident creation error:', err);
      }
    }

    // 3. Voice Reporting trigger
    if (m.triggerVoiceDemo) {
      // Create voice emergency report in database
      const voiceReport = {
        reportId: `VREP-${scenarioRunIdRef.current}-01`,
        transcript: m.triggerVoiceDemo.transcript,
        incidentType: m.triggerVoiceDemo.extracted.incidentType,
        severity: m.triggerVoiceDemo.extracted.severity,
        location: m.triggerVoiceDemo.extracted.landmark,
        latitude: 30.415,
        longitude: 79.332,
        roadBlocked: m.triggerVoiceDemo.extracted.roadBlocked,
        peopleAtRisk: m.triggerVoiceDemo.extracted.peopleAtRisk,
        peopleCount: 4,
        createdAt: Date.now(),
        status: 'sos_created' as const,
        source: 'voice' as const,
        isSimulation: true,
        scenarioRunId: scenarioRunIdRef.current
      };
      await incidentService.createEmergencyReport(voiceReport);
    }

    // 4. Low Connectivity trigger
    if (m.triggerConnectivity) {
      onSetLowConnectivity(true);
    }

    // 5. Blocked Road + A* Routing trigger
    if (m.triggerRoadBlock) {
      onTriggerRoadBlock(true, m.triggerRoadBlock);
    }

    // 6. Automatic Responder Assignment with 5-second countdown
    if (m.triggerResponderDispatch) {
      const resp = m.triggerResponderDispatch;
      setResponderCountdown(resp.countdownSeconds);
      let count = resp.countdownSeconds;

      const intId = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setResponderCountdown(count);
        } else {
          clearInterval(intId);
          setResponderCountdown(0);
          setResponderAssignedNotice(`Assigned ${resp.responderName} (${resp.unit}) — Status: EN ROUTE`);
          if (createdIncidentId && onAssignResponderToIncident) {
            onAssignResponderToIncident(createdIncidentId, resp.responderName, resp.unit);
          }
          addLog(
            `🚑 ${resp.responderName} ASSIGNED — Status: ${resp.status}`,
            'success',
            `Destination: ${m.zoneName}`
          );
        }
      }, 1000 / speed);
    }

    // 7. AI Situation Summary trigger
    if (m.triggerAiSummary && onUpdateAiSummary) {
      onUpdateAiSummary({
        headline: m.triggerAiSummary.headline,
        text: m.triggerAiSummary.summaryText,
        action: m.triggerAiSummary.recommendedAction
      });
    }

    addLog(m.eventFeedTitle, m.eventFeedType, m.description);
  };

  // Step the simulation forward
  useEffect(() => {
    if (status !== 'RUNNING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (next >= config.totalDurationSeconds) {
          setStatus('COMPLETED');
          clearInterval(timerRef.current);
        }
        return next;
      });
    }, 1000 / speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, speed, config.totalDurationSeconds]);

  // Check milestones as seconds progress
  useEffect(() => {
    if (status !== 'RUNNING' && status !== 'COMPLETED') return;

    // Find milestone matching current second
    for (const m of config.milestones) {
      if (seconds >= m.timeSeconds && !triggeredMilestonesRef.current.has(m.id)) {
        executeMilestone(m);
      }
    }
  }, [seconds, status]);

  // Jump to next event
  const handleNextEvent = () => {
    const upcoming = config.milestones.find((m) => m.timeSeconds > seconds);
    if (upcoming) {
      setSeconds(upcoming.timeSeconds);
      executeMilestone(upcoming);
    } else {
      setSeconds(config.totalDurationSeconds);
      setStatus('COMPLETED');
    }
  };

  if (!isOpen) return null;

  const stages: ScenarioStage[] = ['DETECT', 'ASSESS', 'REPORT', 'LOCATE', 'RESPOND'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-xl border border-rose-500/40 bg-slate-950 p-5 shadow-2xl my-6">
        {/* Emergency Scenario Mode Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <Shield className="size-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold uppercase tracking-wider text-white">
                  🚨 PRAHARI — EMERGENCY SCENARIO
                </span>
                <span className="rounded bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 font-mono text-[0.68rem] font-bold uppercase tracking-widest text-rose-300">
                  SIMULATION MODE
                </span>
                <span className="rounded bg-slate-900 border border-slate-700 px-1.5 py-0.5 font-mono text-[0.62rem] text-slate-400">
                  HYDRAX | Controlled Demonstration
                </span>
              </div>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                Demonstrates full tactical loop: DETECT → ASSESS → REPORT → LOCATE → RESPOND
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1 font-mono text-xs text-slate-300 hover:bg-slate-800"
          >
            <X className="size-3.5" />
            <span>Close Console</span>
          </button>
        </div>

        {/* Disclaimer Warning */}
        <div className="mt-3 flex items-center justify-between rounded border border-amber-500/30 bg-amber-950/20 px-3 py-1.5 font-mono text-[0.68rem] text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>
              DATA ISOLATION ACTIVE: All telemetry, alerts, and incidents are tagged as simulation data. Real-world records remain untouched.
            </span>
          </div>
          <span className="font-bold uppercase tracking-wider text-amber-400">DEMO ONLY</span>
        </div>

        {/* Tactical Control Bar: Timer, State, Play/Pause/Skip/Reset/Speed */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 rounded-lg border border-slate-800 bg-slate-900/90 p-3.5">
          {/* Big Scenario Clock */}
          <div className="flex items-center gap-3 sm:col-span-4 border-b sm:border-b-0 sm:border-r border-slate-800 pb-3 sm:pb-0 pr-3">
            <Clock className="size-8 text-cyan-400" />
            <div>
              <span className="block font-mono text-[0.62rem] uppercase tracking-wider text-slate-400">
                Scenario Elapsed Time
              </span>
              <div className="font-mono text-3xl font-extrabold text-cyan-300 tracking-tight">
                {formatTime(seconds)}
                <span className="text-xs text-slate-500 ml-1.5 font-normal">
                  / {formatTime(config.totalDurationSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Start, Pause, Next, Reset */}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-5">
            {status !== 'RUNNING' ? (
              <button
                type="button"
                id="scenario-start-btn"
                onClick={() => {
                  setStatus('RUNNING');
                  addLog('Scenario playback started', 'info');
                }}
                className="flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-emerald-500 shadow-md"
              >
                <Play className="size-3.5 fill-current" />
                <span>[ START SCENARIO ]</span>
              </button>
            ) : (
              <button
                type="button"
                id="scenario-pause-btn"
                onClick={() => {
                  setStatus('PAUSED');
                  addLog('Scenario paused by operator', 'info');
                }}
                className="flex items-center gap-1.5 rounded bg-amber-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-amber-500 shadow-md"
              >
                <Pause className="size-3.5 fill-current" />
                <span>[ PAUSE ]</span>
              </button>
            )}

            <button
              type="button"
              id="scenario-next-btn"
              onClick={handleNextEvent}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs font-semibold text-slate-200 hover:bg-slate-700"
              title="Jump immediately to next scheduled scenario milestone"
            >
              <SkipForward className="size-3.5" />
              <span>[ NEXT EVENT ]</span>
            </button>

            <button
              type="button"
              id="scenario-reset-btn"
              onClick={handleReset}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs font-semibold text-slate-300 hover:bg-slate-700"
              title="Reset scenario timeline and purge simulation records"
            >
              <RotateCcw className="size-3.5" />
              <span>[ RESET ]</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center justify-end gap-1.5 sm:col-span-3">
            <span className="font-mono text-[0.65rem] uppercase text-slate-400 mr-1">Speed:</span>
            {config.speedOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded px-2.5 py-1 font-mono text-xs font-bold transition-colors ${
                  speed === s
                    ? 'border border-cyan-400 bg-cyan-950 text-cyan-300'
                    : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Stage Progress Ribbon: DETECT → ASSESS → REPORT → LOCATE → RESPOND */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="label-caps text-slate-400">Emergency Protocol Execution Stages:</span>
            <span className="font-mono text-xs text-cyan-300 font-bold">
              Current Stage: {activeStage}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {stages.map((stg, idx) => {
              const currentIdx = stages.indexOf(activeStage);
              const isPast = stages.indexOf(stg) < currentIdx;
              const isCurrent = stg === activeStage;

              return (
                <div
                  key={stg}
                  className={`rounded border p-2 text-center transition-all ${
                    isCurrent
                      ? 'border-rose-500 bg-rose-950/40 text-rose-300 ring-2 ring-rose-500/30 font-bold'
                      : isPast
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
                      : 'border-slate-800 bg-slate-950 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 font-mono text-xs">
                    {isPast ? (
                      <CheckCircle2 className="size-3 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="size-2 rounded-full bg-rose-400 animate-ping" />
                    ) : (
                      <span className="text-[0.62rem] text-slate-600 font-mono">0{idx + 1}</span>
                    )}
                    <span>{stg}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Active Milestone Showcase Card */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-white">
                T+{formatTime(currentMilestone.timeSeconds)}
              </span>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
                {currentMilestone.label}
              </h4>
            </div>
            <span
              className={`rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                currentMilestone.systemStatus === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                  : currentMilestone.systemStatus === 'WARNING'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
              }`}
            >
              System Status: {currentMilestone.systemStatus}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-300 leading-relaxed font-mono">
            {currentMilestone.description}
          </p>

          {/* Environmental Simulated Metrics Strip */}
          {currentMilestone.simulatedMetrics && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 font-mono text-xs">
              <div className="rounded border border-slate-800 bg-slate-950 p-2">
                <span className="text-slate-400 block text-[0.62rem] uppercase">Rainfall</span>
                <strong className="text-cyan-300">
                  {currentMilestone.simulatedMetrics.rainfallMm} mm/hr
                </strong>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-2">
                <span className="text-slate-400 block text-[0.62rem] uppercase">Soil Moisture</span>
                <strong className="text-amber-300">
                  {currentMilestone.simulatedMetrics.soilMoisturePct}%
                </strong>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-2">
                <span className="text-slate-400 block text-[0.62rem] uppercase">River Level</span>
                <strong className="text-rose-300 truncate">
                  {currentMilestone.simulatedMetrics.riverLevelStr}
                </strong>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-2">
                <span className="text-slate-400 block text-[0.62rem] uppercase">Slope Risk</span>
                <strong className="text-orange-300">
                  {currentMilestone.simulatedMetrics.slopeRiskPct}%
                </strong>
              </div>
              <div className="rounded border border-rose-500/40 bg-rose-950/30 p-2">
                <span className="text-rose-400 block text-[0.62rem] uppercase">Risk Score</span>
                <strong className="text-rose-300 text-sm">
                  {currentMilestone.simulatedMetrics.overallRiskScore} / 100
                </strong>
              </div>
            </div>
          )}

          {/* Interactive Trigger Shortcuts */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onOpenVoiceModal}
              className="flex items-center gap-2 rounded border border-sky-500/50 bg-[#162334] px-3 py-1.5 font-mono text-xs text-sky-300 hover:bg-[#1e324b]"
            >
              <Volume2 className="size-3.5 text-sky-400" />
              <span>Open Voice Emergency Reporter</span>
            </button>

            {currentMilestone.triggerRoadBlock && (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToTab) onNavigateToTab('routing');
                }}
                className="flex items-center gap-1.5 rounded border border-cyan-500/50 bg-cyan-950/40 px-3 py-1.5 font-mono text-xs text-cyan-300 hover:bg-cyan-900/50"
              >
                <Route className="size-3.5 text-cyan-400" />
                <span>View A* Alternative Route</span>
              </button>
            )}

            {responderCountdown !== null && responderCountdown > 0 && (
              <div className="flex items-center gap-2 rounded border border-cyan-500/40 bg-cyan-950/40 px-3 py-1 font-mono text-xs text-cyan-300">
                <UserCheck className="size-3.5 text-cyan-400" />
                <span>
                  Automatic Dispatch in <strong className="text-white">{responderCountdown}s</strong> (5..4..3..2..1)
                </span>
              </div>
            )}

            {responderAssignedNotice && (
              <div className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 font-mono text-xs text-emerald-300">
                <span>✓ {responderAssignedNotice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Scenario Event Feed */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="label-caps text-slate-300">Emergency Scenario Event Feed:</span>
            <span className="font-mono text-[0.65rem] text-slate-400">
              {eventLogs.length} events recorded
            </span>
          </div>

          <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
            {eventLogs.length === 0 ? (
              <p className="py-4 text-center text-slate-500 italic">
                Press [ START SCENARIO ] to initiate simulation timeline...
              </p>
            ) : (
              eventLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 rounded border p-2 ${
                    log.type === 'critical'
                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                      : log.type === 'warning'
                      ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                      : log.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                      : log.type === 'action'
                      ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-200'
                      : 'border-slate-800 bg-slate-950 text-slate-300'
                  }`}
                >
                  <span className="rounded bg-black/40 px-1.5 py-0.5 text-[0.65rem] font-bold text-slate-400 shrink-0">
                    {log.timestampStr}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{log.title}</p>
                    {log.details && (
                      <p className="text-[0.68rem] text-slate-400 truncate mt-0.5">{log.details}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-mono">
          <span className="text-slate-500">
            PRAHARI Command OS v2.6 | Built by HYDRAX
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700"
          >
            [ EXIT SCENARIO CONSOLE ]
          </button>
        </div>
      </div>
    </div>
  );
};
