import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  PlusCircle,
  Filter,
  UserCheck,
  CheckCircle,
  Clock,
  Sparkles,
  MapPin,
  Send,
  ArrowRight,
  ShieldAlert,
  Mic,
  LayoutList,
  LayoutGrid,
  Check,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus, IncidentType, UserProfile, UserRole, Zone } from '../types';
import { ZONES } from '../data/zones';
import { triageIncidentReport } from '../services/aiAssistant';
import { VoiceReportModal } from './VoiceReportModal';
import { isFeatureEnabled } from '../config/features';
import { dbIncidentService } from '../services/dbIncidentService';

interface IncidentManagementViewProps {
  incidents: Incident[];
  currentUser: UserProfile;
  responders: UserProfile[];
  onCreateIncident: (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateStatus: (incidentId: string, status: IncidentStatus, notes?: string) => Promise<void>;
  onAssignResponder: (incidentId: string, responder: { uid: string; name: string; unit?: string; phone?: string }) => Promise<void>;
  onNavigateToAStar: (incident: Incident) => void;
  selectedZone?: Zone;
}

const STATUS_ORDER: IncidentStatus[] = ['NEW', 'PROCESSING', 'ASSIGNED', 'ACKNOWLEDGED', 'RESOLVED'];

export const IncidentManagementView: React.FC<IncidentManagementViewProps> = ({
  incidents,
  currentUser,
  responders,
  onCreateIncident,
  onUpdateStatus,
  onAssignResponder,
  onNavigateToAStar,
  selectedZone = ZONES[0]
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // New Incident Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>('flash_flood');
  const [severity, setSeverity] = useState<IncidentSeverity>('high');
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [isAiTriaging, setIsAiTriaging] = useState(false);
  const [aiTriageNote, setAiTriageNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalization helper for status progression
  const normalizeStatus = (rawStatus: string): IncidentStatus => {
    const s = (rawStatus || '').toUpperCase();
    if (s === 'REPORTED' || s === 'NEW') return 'NEW';
    if (s === 'INVESTIGATING' || s === 'PROCESSING') return 'PROCESSING';
    if (s === 'ASSIGNED') return 'ASSIGNED';
    if (s === 'IN_PROGRESS' || s === 'ACKNOWLEDGED') return 'ACKNOWLEDGED';
    if (s === 'RESOLVED' || s === 'CLOSED') return 'RESOLVED';
    return 'NEW';
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (filterStatus !== 'all') {
      const norm = normalizeStatus(inc.status);
      if (norm !== filterStatus && inc.status !== filterStatus) return false;
    }
    if (filterZone !== 'all' && inc.zoneId !== filterZone) return false;
    return true;
  });

  const handleAiTriage = async () => {
    if (!title && !description) return;
    setIsAiTriaging(true);
    try {
      const zName = ZONES.find((z) => z.id === zoneId)?.name || 'Hilly Zone';
      const result = await triageIncidentReport(title, description, zName);
      setType(result.classifiedType);
      setSeverity(result.recommendedSeverity);
      setAiTriageNote(result.summary);
    } finally {
      setIsAiTriaging(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setIsSubmitting(true);
    try {
      const selectedZ = ZONES.find((z) => z.id === zoneId) || ZONES[0];
      const humanId = `PRH-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      await onCreateIncident({
        title,
        type,
        severity,
        status: 'NEW',
        description,
        zoneId,
        zoneName: selectedZ.name,
        location: {
          lat: 30.4 + Math.random() * 0.1,
          lng: 79.3 + Math.random() * 0.1,
          landmark: landmark || `${selectedZ.name} corridor`,
          mapX: selectedZ.x + (Math.random() * 6 - 3),
          mapY: selectedZ.y + (Math.random() * 6 - 3)
        },
        reportedBy: {
          uid: currentUser.uid,
          name: currentUser.name,
          role: currentUser.role,
          contact: currentUser.phone || '+91 94112 00000'
        },
        aiTriageSummary: aiTriageNote || undefined,
        source: 'manual',
        isSimulation: true
      });

      // Also persist to DB service
      await dbIncidentService.createIncident({
        incident_id: humanId,
        created_at: new Date().toISOString(),
        reporter_name: currentUser.name,
        reporter_contact: currentUser.phone || '+91 94112 00000',
        transcription: description,
        incident_type: type.replace('_', ' ').toUpperCase(),
        severity: severity.toUpperCase() as any,
        latitude: 30.4 + Math.random() * 0.1,
        longitude: 79.3 + Math.random() * 0.1,
        location_name: landmark || `${selectedZ.name} sector`,
        status: 'NEW',
        source: 'MANUAL',
        demo_mode: true
      });

      // Reset form
      setTitle('');
      setDescription('');
      setLandmark('');
      setAiTriageNote(null);
      setShowCreateModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = async (incidentId: string, nextStatus: IncidentStatus) => {
    await onUpdateStatus(incidentId, nextStatus);
    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident({
        ...selectedIncident,
        status: nextStatus
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Control / Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/95 p-3 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-white">
              Emergency Incident Management
            </h2>
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[0.65rem] text-rose-300 border border-rose-500/30">
              Authority Triage Console
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400 mt-0.5">
            Real-time feed of voice &amp; field emergency reports across mountain sectors
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded border border-slate-800 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 rounded px-2 py-1 ${
                viewMode === 'cards' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              <LayoutGrid className="size-3" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 rounded px-2 py-1 ${
                viewMode === 'table' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              <LayoutList className="size-3" />
              <span>Table</span>
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          {/* Sector Filter */}
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 outline-none"
          >
            <option value="all">All Sectors</option>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          {/* Voice Report Trigger */}
          {isFeatureEnabled('voiceReporting') && (
            <button
              type="button"
              id="voice-report-action-btn"
              onClick={() => setShowVoiceModal(true)}
              className="flex items-center gap-1.5 rounded bg-rose-600 px-3 py-1 font-bold text-white hover:bg-rose-500 shadow-sm"
            >
              <Mic className="size-3.5" />
              <span>Voice Report</span>
            </button>
          )}

          {/* Manual Incident Report Trigger */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700"
          >
            <PlusCircle className="size-3.5 text-cyan-400" />
            <span>Manual Form</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Incident List Feed (7 columns) */}
        <div className="space-y-3 lg:col-span-7">
          {filteredIncidents.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 font-mono text-xs">
              No emergency incidents found matching current filters.
            </div>
          ) : viewMode === 'cards' ? (
            <div className="space-y-2.5">
              {filteredIncidents.map((incident) => {
                const isSelected = selectedIncident?.id === incident.id;
                const normStatus = normalizeStatus(incident.status);
                const isCrit = incident.severity === 'critical';
                const isHigh = incident.severity === 'high';

                return (
                  <div
                    key={incident.id}
                    id={`incident-card-${incident.id}`}
                    onClick={() => setSelectedIncident(incident)}
                    className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-slate-900 shadow-lg ring-1 ring-cyan-500/50'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white tracking-wider">
                            {incident.id}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 font-mono text-[0.62rem] font-bold uppercase ${
                              isCrit
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                                : isHigh
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                            }`}
                          >
                            {incident.severity}
                          </span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[0.62rem] text-slate-300 uppercase">
                            {incident.type.replace(/_/g, ' ')}
                          </span>
                          {incident.source === 'voice' && (
                            <span className="rounded bg-[#162334] px-1.5 py-0.5 font-mono text-xs text-sky-300 border border-sky-500/40">
                              VOICE
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 font-bold text-sm text-white">{incident.title}</h3>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[0.68rem] font-bold uppercase tracking-wider ${
                          normStatus === 'RESOLVED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : normStatus === 'ASSIGNED' || normStatus === 'ACKNOWLEDGED'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            : normStatus === 'PROCESSING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {normStatus}
                      </span>
                    </div>

                    {/* Transcription / Situation Text */}
                    <p className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/80 font-mono">
                      "{incident.description}"
                    </p>

                    {/* Metadata Footer */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 font-mono text-[0.68rem] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3 text-cyan-400" />
                        <span>{incident.zoneName || 'Catchment Sector'} &bull; {incident.location?.landmark || 'Alpine Corridor'}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {incident.assignedTo ? (
                          <span className="text-cyan-300 font-medium">
                            Assigned: {incident.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-amber-400 italic">Unassigned</span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="size-3" />
                          {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/90">
              <table className="w-full text-left font-mono text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950 text-[0.68rem] uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Incident ID</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Responder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredIncidents.map((incident) => {
                    const normStatus = normalizeStatus(incident.status);
                    const isSelected = selectedIncident?.id === incident.id;

                    return (
                      <tr
                        key={`tbl-${incident.id}`}
                        onClick={() => setSelectedIncident(incident)}
                        className={`cursor-pointer hover:bg-slate-800/50 transition-colors ${
                          isSelected ? 'bg-cyan-950/40 text-cyan-200' : ''
                        }`}
                      >
                        <td className="p-3 font-bold text-white whitespace-nowrap">{incident.id}</td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 whitespace-nowrap">{incident.location?.landmark || incident.zoneName}</td>
                        <td className="p-3 uppercase text-[0.68rem]">{incident.type.replace(/_/g, ' ')}</td>
                        <td className="p-3 font-bold uppercase">{incident.severity}</td>
                        <td className="p-3">
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase text-cyan-300">
                            {normStatus}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">
                          {incident.assignedTo ? incident.assignedTo.name : <span className="text-amber-400 italic">None</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Incident Detail Console & Status Progression (5 columns) */}
        <div className="space-y-4 lg:col-span-5">
          {selectedIncident ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="label-caps text-cyan-400">Incident Dispatch Console</span>
                  <h3 className="font-display text-base font-bold uppercase text-white mt-0.5 tracking-wider">
                    {selectedIncident.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToAStar(selectedIncident)}
                  className="flex items-center gap-1 rounded border border-sky-500/50 bg-sky-950/40 px-2.5 py-1 font-mono text-xs font-semibold text-sky-300 hover:bg-sky-900/60"
                  title="Compute A* flood-avoidance path to this incident"
                >
                  <Send className="size-3 text-sky-400" />
                  <span>A* Evac Route</span>
                </button>
              </div>

              {/* Status Progression Interactive Stepper */}
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="label-caps text-slate-400">Status Progression:</span>
                  <span className="font-mono text-[0.68rem] font-bold text-cyan-300 uppercase">
                    Current: {normalizeStatus(selectedIncident.status)}
                  </span>
                </div>

                {/* 5-Step Progression Bar */}
                <div className="grid grid-cols-5 gap-1 text-center font-mono text-[0.62rem]">
                  {STATUS_ORDER.map((stage, idx) => {
                    const currentNorm = normalizeStatus(selectedIncident.status);
                    const currentIdx = STATUS_ORDER.indexOf(currentNorm);
                    const isPassed = idx < currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => handleStatusTransition(selectedIncident.id, stage)}
                        className={`rounded py-1.5 px-0.5 transition-all font-bold ${
                          isCurrent
                            ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 shadow-md'
                            : isPassed
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
                        }`}
                      >
                        {isPassed ? '✓ ' : ''}
                        {stage}
                      </button>
                    );
                  })}
                </div>

                {/* Next Status Quick Button */}
                {STATUS_ORDER.indexOf(normalizeStatus(selectedIncident.status)) < STATUS_ORDER.length - 1 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const curIdx = STATUS_ORDER.indexOf(normalizeStatus(selectedIncident.status));
                        const next = STATUS_ORDER[curIdx + 1];
                        handleStatusTransition(selectedIncident.id, next);
                      }}
                      className="flex items-center gap-1 rounded bg-slate-800 px-3 py-1 font-mono text-xs text-cyan-300 hover:bg-slate-700"
                    >
                      <span>Advance to next status &rarr;</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Details Body */}
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">Incident Title:</span>
                  <p className="text-slate-300 font-medium mt-0.5">{selectedIncident.title}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-200 block">Spoken Transcription / Details:</span>
                  <div className="text-slate-200 mt-0.5 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-xs">
                    "{selectedIncident.description}"
                  </div>
                </div>

                {selectedIncident.aiTriageSummary && (
                  <div className="rounded-lg border border-sky-500/30 bg-[#162334] p-3 font-mono text-xs text-sky-200">
                    <div className="flex items-center gap-1.5 font-bold text-sky-300 mb-1">
                      <Sparkles className="size-3.5 text-sky-400" /> AI Triage Summary:
                    </div>
                    {selectedIncident.aiTriageSummary}
                  </div>
                )}

                {/* Reporter Information */}
                <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[0.68rem] text-slate-400 space-y-0.5">
                  <div className="text-slate-300 font-semibold mb-1">Reporter Details:</div>
                  <div>Name: {selectedIncident.reportedBy.name} ({selectedIncident.reportedBy.role})</div>
                  <div>Contact: {selectedIncident.reportedBy.contact || '+91 94112 00000'}</div>
                  <div>Reported At: {new Date(selectedIncident.createdAt).toLocaleString()}</div>
                </div>

                {/* Tactical Responder Assignment Box */}
                <div className="rounded border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-caps text-amber-400">Tactical Responder Unit</span>
                    {selectedIncident.assignedTo && (
                      <span className="font-mono text-[0.65rem] text-emerald-400 font-bold">DISPATCHED</span>
                    )}
                  </div>

                  {selectedIncident.assignedTo ? (
                    <div className="font-mono text-[0.68rem] space-y-1 text-slate-300">
                      <div>Unit: <strong className="text-white">{selectedIncident.assignedTo.name}</strong></div>
                      <div>Details: {selectedIncident.assignedTo.unit || 'High-Altitude Emergency Unit'}</div>
                      <div>Contact: {selectedIncident.assignedTo.phone || 'District Police HQ'}</div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[0.68rem]">
                      No responder assigned. Select from active units below.
                    </p>
                  )}

                  {/* Assign Responder Selector */}
                  <div className="mt-3 pt-2 border-t border-slate-800">
                    <label className="label-caps block mb-1">Assign Emergency Responder:</label>
                    <select
                      onChange={(e) => {
                        const resp = responders.find((r) => r.uid === e.target.value);
                        if (resp) {
                          onAssignResponder(selectedIncident.id, {
                            uid: resp.uid,
                            name: resp.name,
                            unit: resp.unit,
                            phone: resp.phone
                          });
                          // Also progress status to ASSIGNED if NEW
                          if (normalizeStatus(selectedIncident.status) === 'NEW') {
                            handleStatusTransition(selectedIncident.id, 'ASSIGNED');
                          }
                        }
                      }}
                      className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 font-mono text-xs text-slate-200 outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>Select Quick Reaction Team (QRT)...</option>
                      {responders.map((r) => (
                        <option key={r.uid} value={r.uid}>
                          {r.name} &mdash; {r.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 font-mono text-xs">
              Select an incident from the feed to view its transcription, assign tactical units, or advance its status progression.
            </div>
          )}
        </div>
      </div>

      {/* Manual Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold uppercase text-white">
                  Report Emergency Incident
                </h3>
                <p className="font-mono text-xs text-slate-400">
                  Citizen field dispatch &amp; flash flood observation log
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isFeatureEnabled('voiceReporting') && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowVoiceModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded border border-sky-500/40 bg-[#162334] px-2.5 py-1 font-mono text-xs text-sky-300 hover:bg-[#1e324b]"
                  >
                    <Mic className="size-3.5 text-sky-400" />
                    <span>Use Voice</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="font-mono text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Incident Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavy Debris Blocking Bridge Approach"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Incident Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as IncidentType)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="flash_flood">Flash Flood</option>
                    <option value="landslide">Landslide</option>
                    <option value="river_burst">River Burst</option>
                    <option value="road_block">Road Blockage</option>
                    <option value="bridge_damage">Bridge Damage</option>
                    <option value="trapped_civilians">Trapped Civilians</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Severity *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="low">LOW</option>
                    <option value="moderate">MODERATE</option>
                    <option value="high">HIGH</option>
                    <option value="critical">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Catchment Sector *</label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Landmark / Location Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Village Upper Bend, Km 14"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Situation Description *</label>
                  <button
                    type="button"
                    onClick={handleAiTriage}
                    disabled={isAiTriaging || (!title && !description)}
                    className="flex items-center gap-1 font-mono text-xs text-sky-300 hover:text-sky-200 disabled:opacity-50"
                  >
                    <Sparkles className="size-3 text-sky-400" />
                    <span>{isAiTriaging ? 'Triaging...' : 'AI Auto-Triage'}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe emergency conditions, casualties, blocked roads..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded border border-slate-700 px-4 py-2 font-mono text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-rose-600 px-5 py-2 font-mono text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 shadow-md"
                >
                  {isSubmitting ? 'Submitting...' : 'Dispatch Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Incident Reporting Modal */}
      {showVoiceModal && (
        <VoiceReportModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          currentUser={currentUser}
          selectedZone={selectedZone}
          onSubmitIncident={onCreateIncident}
          onSwitchToManual={() => {
            setShowVoiceModal(false);
            setShowCreateModal(true);
          }}
          isSimulationMode={true}
        />
      )}
    </div>
  );
};
