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
  Mic
} from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus, IncidentType, UserProfile, UserRole, Zone } from '../types';
import { ZONES } from '../data/zones';
import { triageIncidentReport } from '../services/aiAssistant';
import { VoiceReportModal } from './VoiceReportModal';
import { isFeatureEnabled } from '../config/features';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);


  // New Incident Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>('flash_flood');
  const [severity, setSeverity] = useState<IncidentSeverity>('moderate');
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [isAiTriaging, setIsAiTriaging] = useState(false);
  const [aiTriageNote, setAiTriageNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
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
      await onCreateIncident({
        title,
        type,
        severity,
        status: 'reported',
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
        aiTriageSummary: aiTriageNote || undefined
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

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              Emergency Incident Management &amp; Dispatch
            </h2>
            <span className="rounded border border-rose-500/40 bg-rose-950/60 px-2 py-0.5 font-mono text-[0.65rem] uppercase text-rose-400">
              {incidents.filter((i) => i.status !== 'closed' && i.status !== 'resolved').length} Active
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            Citizen field reporting, authority triage &amp; dispatch, responder action lifecycle
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isFeatureEnabled('voiceReporting') && (
            <button
              id="voice-report-incident-btn"
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="flex items-center gap-1.5 rounded border border-purple-500/50 bg-purple-600/20 px-3.5 py-2 font-mono text-xs font-semibold text-purple-300 shadow-md transition-colors hover:bg-purple-600/30"
              title="Report emergency using browser Web Speech recognition"
            >
              <Mic className="size-4 text-purple-400" />
              <span>Report by Voice</span>
            </button>
          )}
          <button
            id="report-incident-btn"
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded bg-rose-600 px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-lg transition-colors hover:bg-rose-500"
          >
            <PlusCircle className="size-4" />
            <span>Report New Incident</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 flex items-center gap-1">
            <Filter className="size-3.5" /> Filter Status:
          </span>
          {['all', 'reported', 'investigating', 'assigned', 'in_progress', 'resolved'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`rounded px-2 py-1 uppercase text-[0.65rem] transition-colors ${
                filterStatus === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Zone:</span>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-slate-200 outline-none"
          >
            <option value="all">All Catchments</option>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Incidents Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Incident Cards List (7 cols) */}
        <div className="space-y-3 lg:col-span-7">
          {filteredIncidents.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 font-mono text-xs">
              No incident records matching the selected criteria.
            </div>
          ) : (
            filteredIncidents.map((incident) => {
              const isSelected = selectedIncident?.id === incident.id;
              const isCrit = incident.severity === 'critical';
              const isHigh = incident.severity === 'high';

              return (
                <div
                  key={incident.id}
                  id={`incident-${incident.id}`}
                  onClick={() => setSelectedIncident(incident)}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-slate-900 shadow-md'
                      : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[0.68rem] text-slate-500">
                          {incident.id}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-bold uppercase ${
                            isCrit
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                              : isHigh
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                          }`}
                        >
                          {incident.severity}
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.65rem] text-slate-300 uppercase">
                          {incident.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h3 className="mt-1 font-bold text-sm text-white">{incident.title}</h3>
                    </div>

                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase ${
                        incident.status === 'resolved' || incident.status === 'closed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : incident.status === 'in_progress'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {incident.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {incident.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 font-mono text-[0.68rem] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3 text-cyan-400" />
                      <span>{incident.zoneName} · {incident.location.landmark}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {incident.assignedTo ? (
                        <span className="text-cyan-300 font-medium">
                          Assigned: {incident.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-amber-400 italic">Unassigned</span>
                      )}
                      <span>
                        {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Incident Detail & Dispatch Console (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {selectedIncident ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="label-caps text-cyan-400">Incident Dispatch Console</span>
                  <h3 className="font-display text-base font-bold uppercase text-white mt-0.5">
                    {selectedIncident.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToAStar(selectedIncident)}
                  className="flex items-center gap-1 rounded border border-sky-500/50 bg-sky-950/40 px-2.5 py-1 font-mono text-xs font-semibold text-sky-300 hover:bg-sky-900/60"
                  title="Compute A* emergency path avoiding high flood risks to this incident"
                >
                  <Send className="size-3 text-sky-400" />
                  <span>A* Route</span>
                </button>
              </div>

              <div className="mt-3 space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">Incident Title:</span>
                  <p className="text-slate-300 font-medium mt-0.5">{selectedIncident.title}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-200 block">Description:</span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                    {selectedIncident.description}
                  </p>
                </div>

                {selectedIncident.aiTriageSummary && (
                  <div className="rounded border border-purple-500/30 bg-purple-950/20 p-2.5 font-mono text-[0.68rem] text-purple-200">
                    <div className="flex items-center gap-1 font-bold text-purple-300 mb-1">
                      <Sparkles className="size-3" /> AI Triage Summary:
                    </div>
                    {selectedIncident.aiTriageSummary}
                  </div>
                )}

                {/* Reporter Info */}
                <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[0.68rem] text-slate-400">
                  <div className="text-slate-300 font-semibold mb-1">Reported By:</div>
                  <div>Name: {selectedIncident.reportedBy.name} ({selectedIncident.reportedBy.role})</div>
                  <div>Contact: {selectedIncident.reportedBy.contact || 'N/A'}</div>
                  <div>Reported: {new Date(selectedIncident.createdAt).toLocaleString()}</div>
                </div>

                {/* Authority Responder Assignment */}
                <div className="rounded border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-caps text-amber-400">Assigned Tactical Unit</span>
                    {selectedIncident.assignedTo && (
                      <span className="font-mono text-[0.65rem] text-emerald-400 font-bold">DISPATCHED</span>
                    )}
                  </div>

                  {selectedIncident.assignedTo ? (
                    <div className="font-mono text-[0.68rem] space-y-1 text-slate-300">
                      <div>Unit: <strong className="text-white">{selectedIncident.assignedTo.name}</strong></div>
                      <div>Details: {selectedIncident.assignedTo.unit}</div>
                      <div>Contact: {selectedIncident.assignedTo.phone}</div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[0.68rem]">
                      No responder currently assigned to this incident.
                    </p>
                  )}

                  {/* Authority / Admin Assignment Controls */}
                  {(currentUser.role === 'authority' || currentUser.role === 'admin') && (
                    <div className="mt-3 pt-2 border-t border-slate-800">
                      <label className="label-caps block mb-1">Assign Field Responder:</label>
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
                          }
                        }}
                        className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 font-mono text-xs text-slate-200 outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>Select QRT / Field Unit...</option>
                        {responders.map((r) => (
                          <option key={r.uid} value={r.uid}>
                            {r.name} — {r.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Workflow Status Transition Action Buttons */}
                <div className="space-y-1.5 pt-2">
                  <span className="label-caps">Update Operational Status</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(selectedIncident.id, 'investigating')}
                      className={`rounded border p-2 text-center font-mono text-xs transition-colors ${
                        selectedIncident.status === 'investigating'
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Investigating
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(selectedIncident.id, 'in_progress')}
                      className={`rounded border p-2 text-center font-mono text-xs transition-colors ${
                        selectedIncident.status === 'in_progress'
                          ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(selectedIncident.id, 'resolved')}
                      className={`rounded border p-2 text-center font-mono text-xs transition-colors ${
                        selectedIncident.status === 'resolved'
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(selectedIncident.id, 'closed')}
                      className={`rounded border p-2 text-center font-mono text-xs transition-colors ${
                        selectedIncident.status === 'closed'
                          ? 'border-slate-600 bg-slate-800 text-slate-200 font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Closed
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 font-mono text-xs">
              Select an incident from the list to view details, assign field units, or update operational status.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Report New Incident */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
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
                    className="flex items-center gap-1 rounded border border-purple-500/40 bg-purple-950/40 px-2 py-1 font-mono text-[0.68rem] text-purple-300 hover:bg-purple-900/50"
                    title="Switch to Voice Emergency Reporting"
                  >
                    <Mic className="size-3 text-purple-400" />
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
                <label className="font-semibold text-slate-300 block mb-1">Incident Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flash surge overtopping local bridge railing"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Hazard Category *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as IncidentType)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="flash_flood">Flash Flood Surge</option>
                    <option value="landslide">Landslide / Debris Flow</option>
                    <option value="river_burst">River Bank Breach</option>
                    <option value="bridge_damage">Bridge / Culvert Damage</option>
                    <option value="road_block">Road Blockage</option>
                    <option value="trapped_civilians">Trapped Civilians</option>
                    <option value="medical_emergency">Medical Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Severity Level *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="low">Low (Monitoring)</option>
                    <option value="moderate">Moderate (Advisory)</option>
                    <option value="high">High (Evacuation Ready)</option>
                    <option value="critical">Critical (Immediate Danger)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Catchment Zone *</label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{z.name} ({z.district})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Landmark / Kilometer Post</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Old Confluence Ghat"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Detailed Description *</label>
                  <button
                    type="button"
                    onClick={handleAiTriage}
                    disabled={isAiTriaging || (!title && !description)}
                    className="flex items-center gap-1 text-[0.68rem] font-mono text-purple-400 hover:text-purple-300 disabled:opacity-50"
                  >
                    <Sparkles className="size-3" />
                    {isAiTriaging ? 'Triaging...' : 'AI Auto-Triage'}
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe observed water surge speed, trapped persons, damaged infrastructure, or accessible detour routes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              {aiTriageNote && (
                <div className="rounded border border-purple-500/30 bg-purple-950/30 p-2.5 font-mono text-[0.68rem] text-purple-200">
                  <span className="font-bold text-purple-300 block mb-0.5">AI Triage Classification:</span>
                  {aiTriageNote}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
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
                  className="rounded bg-rose-600 px-5 py-2 font-mono text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Dispatch Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Emergency Reporting Modal */}
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
      />
    </div>
  );
};
