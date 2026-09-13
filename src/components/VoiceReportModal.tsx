import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Flame,
  Clock,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  Radio,
  Check
} from 'lucide-react';
import { Incident, IncidentSeverity, IncidentType, UserProfile, Zone } from '../types';
import { ZONES } from '../data/zones';
import { parseVoiceEmergencyReport, VoiceParsedReport } from '../services/aiAssistant';

interface VoiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  selectedZone: Zone;
  onSubmitIncident: (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onSwitchToManual: () => void;
}

export const VoiceReportModal: React.FC<VoiceReportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedZone,
  onSubmitIncident,
  onSwitchToManual
}) => {
  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Review & Edit state
  const [parsedReport, setParsedReport] = useState<VoiceParsedReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editable Form fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>('flash_flood');
  const [severity, setSeverity] = useState<IncidentSeverity>('moderate');
  const [zoneId, setZoneId] = useState(selectedZone.id);
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [peopleTrapped, setPeopleTrapped] = useState(false);
  const [roadBlocked, setRoadBlocked] = useState(false);
  const [peopleCount, setPeopleCount] = useState<number | ''>('');

  // GPS Fix
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Speech Recognition ref
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Request GPS position when modal opens
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      setIsAcquiringGps(true);
      setGpsStatus('Requesting browser GPS fix...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          });
          setIsAcquiringGps(false);
          setGpsStatus(`GPS Fix: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E (±${Math.round(pos.coords.accuracy)}m)`);
        },
        (err) => {
          setIsAcquiringGps(false);
          setGpsStatus('GPS permission not granted; using sector landmark coordinates.');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [isOpen]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = () => {
    setMicPermissionError(null);
    setTranscript('');
    setRecordingSeconds(0);
    setParsedReport(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermissionError('Microphone permission was denied. Please allow microphone access in your browser bar.');
        } else if (event.error === 'no-speech') {
          // Keep recording
        } else {
          setMicPermissionError(`Speech recognition message: ${event.error}. You can also type or use sample transcripts.`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setMicPermissionError('Unable to start audio recording. Check browser permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);

    // Process the transcript
    processTranscript(transcript);
  };

  const processTranscript = (textToProcess: string) => {
    if (!textToProcess.trim()) return;

    const parsed = parseVoiceEmergencyReport(
      textToProcess,
      gpsLocation || undefined,
      ZONES
    );

    setParsedReport(parsed);
    setTitle(parsed.title);
    setType(parsed.type);
    setSeverity(parsed.severity);
    setZoneId(parsed.zoneId);
    setLandmark(parsed.landmark === 'Unknown (Please verify)' ? '' : parsed.landmark);
    setDescription(parsed.description);
    setPeopleTrapped(parsed.peopleTrapped);
    setRoadBlocked(parsed.roadBlocked);
    setPeopleCount(parsed.peopleAffectedCount || '');
  };

  const applySampleTranscript = (sample: string) => {
    setTranscript(sample);
    processTranscript(sample);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedZ = ZONES.find((z) => z.id === zoneId) || selectedZone;
      const finalLat = gpsLocation ? gpsLocation.lat : (selectedZ.x ? 30.4 + selectedZ.x * 0.01 : 30.415);
      const finalLng = gpsLocation ? gpsLocation.lng : (selectedZ.y ? 79.3 + selectedZ.y * 0.01 : 79.325);

      await onSubmitIncident({
        title,
        type,
        severity,
        status: 'reported',
        description,
        zoneId: selectedZ.id,
        zoneName: selectedZ.name,
        location: {
          lat: finalLat,
          lng: finalLng,
          landmark: landmark.trim() || (gpsLocation ? `GPS ${finalLat.toFixed(3)}°N, ${finalLng.toFixed(3)}°E` : `${selectedZ.name} corridor`),
          mapX: selectedZ.x + (Math.random() * 4 - 2),
          mapY: selectedZ.y + (Math.random() * 4 - 2)
        },
        reportedBy: {
          uid: currentUser.uid,
          name: currentUser.name,
          role: currentUser.role,
          contact: currentUser.phone || '+91 94112 00000'
        },
        aiTriageSummary: `Voice Report verified: Categorized as ${type.replace(/_/g, ' ')}. ${
          peopleTrapped ? 'Individuals reported trapped. ' : ''
        }${roadBlocked ? 'Roadway blockage logged. ' : ''}Auto-dispatched via PRAHARI Voice Engine.`
      });

      // Reset and close
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    setTranscript('');
    setParsedReport(null);
    setMicPermissionError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Mic className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                Voice Emergency Reporting
              </h3>
              <p className="font-mono text-xs text-slate-400">
                Natural speech processing &amp; tactical data extraction
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 font-mono text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* GPS Indicator Strip */}
        <div className="mt-3 flex items-center justify-between rounded border border-slate-800/80 bg-slate-950/60 px-3 py-1.5 font-mono text-[0.68rem] text-slate-400">
          <div className="flex items-center gap-1.5">
            <MapPin className={`size-3 ${gpsLocation ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>
              {gpsLocation
                ? `GPS Active: ${gpsLocation.lat.toFixed(4)}°N, ${gpsLocation.lng.toFixed(4)}°E (±${gpsLocation.accuracy}m)`
                : isAcquiringGps
                ? 'Acquiring GPS fix from device...'
                : 'GPS unverified (will use sector reference)'}
            </span>
          </div>
          {gpsLocation && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 font-bold text-emerald-400 border border-emerald-500/40 uppercase">
              Fix Confirmed
            </span>
          )}
        </div>

        {/* Permission / Unsupported Warnings */}
        {micPermissionError && (
          <div className="mt-3 rounded border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 font-mono">
            <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
              <AlertTriangle className="size-4" />
              <span>Microphone Access Notice</span>
            </div>
            <p>{micPermissionError}</p>
          </div>
        )}

        {!speechSupported && (
          <div className="mt-3 rounded border border-cyan-500/40 bg-cyan-950/30 p-3 text-xs text-cyan-200 font-mono">
            <div className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
              <Radio className="size-4" />
              <span>Web Speech API Standby</span>
            </div>
            <p>
              Your current browser does not expose the native Web Speech API. You can test instant extraction using the quick spoken scenario buttons below, or switch to manual reporting.
            </p>
          </div>
        )}

        {/* Step 1: Recording / Speech Input View */}
        {!parsedReport ? (
          <div className="mt-4 space-y-4 text-center">
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-6">
              {/* Mic Icon & Pulsing Waves */}
              <div className="relative mx-auto flex size-24 items-center justify-center">
                {isRecording && (
                  <>
                    <span className="absolute size-24 rounded-full bg-rose-500/20 animate-ping" />
                    <span className="absolute size-20 rounded-full bg-rose-500/30 animate-pulse" />
                  </>
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 flex size-16 items-center justify-center rounded-full transition-all shadow-xl ${
                    isRecording
                      ? 'bg-rose-600 text-white ring-4 ring-rose-500/50'
                      : 'bg-slate-800 text-slate-200 hover:bg-rose-600 hover:text-white border border-slate-700'
                  }`}
                >
                  {isRecording ? <MicOff className="size-7 animate-bounce" /> : <Mic className="size-7" />}
                </button>
              </div>

              {/* Status Message */}
              <div className="mt-3">
                <span className="font-display font-bold uppercase tracking-wider text-sm text-white">
                  {isRecording ? 'Listening to Emergency Report...' : 'Press Microphone to Speak'}
                </span>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {isRecording
                    ? `Recording: 00:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds} — Speak clearly`
                    : 'Describe hazard type, location, trapped people, and blocked roads'}
                </p>
              </div>

              {/* Live Transcript Display */}
              <div className="mt-4 min-h-[72px] rounded border border-slate-800 bg-slate-900 p-3 text-left">
                <span className="label-caps block text-slate-400 mb-1">Live Speech Transcription:</span>
                {transcript ? (
                  <p className="font-mono text-xs text-cyan-200 leading-relaxed italic">
                    "{transcript}"
                  </p>
                ) : (
                  <p className="font-mono text-xs text-slate-500 italic">
                    Spoken words will appear here in real time...
                  </p>
                )}
              </div>

              {/* Action Buttons while recording */}
              {isRecording && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 rounded bg-emerald-600 px-5 py-2 font-mono text-xs font-bold text-white hover:bg-emerald-500 shadow-md"
                  >
                    <Check className="size-4" />
                    <span>Done Speaking &amp; Extract</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (recognitionRef.current) recognitionRef.current.stop();
                      setIsRecording(false);
                      setTranscript('');
                    }}
                    className="rounded border border-slate-700 px-4 py-2 font-mono text-xs text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Quick Testing Voice Samples */}
            <div className="rounded border border-slate-800/80 bg-slate-950/50 p-3 text-left">
              <span className="label-caps block text-cyan-400 mb-2">
                Simulate Spoken Emergency Scenarios (1-Click NLP Test)
              </span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    applySampleTranscript(
                      'There is a massive landslide near Badrinath highway km 14. Three people are trapped in a car and the main road is completely blocked.'
                    )
                  }
                  className="w-full rounded border border-slate-800 bg-slate-900 p-2 text-left font-mono text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                >
                  <strong className="text-cyan-300">Scenario A:</strong> "Massive landslide near Badrinath highway km 14. Three people are trapped in a car and the main road is completely blocked."
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applySampleTranscript(
                      'Teesta river has burst its banks near Old Confluence Ghat. Water entering lower market, 5 families need urgent boat evacuation.'
                    )
                  }
                  className="w-full rounded border border-slate-800 bg-slate-900 p-2 text-left font-mono text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                >
                  <strong className="text-amber-300">Scenario B:</strong> "Teesta river has burst its banks near Old Confluence Ghat. Water entering lower market, 5 families need urgent boat evacuation."
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applySampleTranscript(
                      'Bridge railing washed out near Chamoli village road. Two elderly persons stranded on high ground needing medical assistance.'
                    )
                  }
                  className="w-full rounded border border-slate-800 bg-slate-900 p-2 text-left font-mono text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                >
                  <strong className="text-rose-300">Scenario C:</strong> "Bridge railing washed out near Chamoli village road. Two elderly persons stranded on high ground needing medical assistance."
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onSwitchToManual();
                }}
                className="text-slate-400 hover:text-cyan-300 underline"
              >
                Prefer typing? Switch to Manual Form →
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded border border-slate-700 px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Structured Review & Edit Form */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {/* Extraction AI Confidence Banner */}
            <div className="rounded border border-purple-500/40 bg-purple-950/20 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <Sparkles className="size-4" />
                  <span>AI Extracted Incident Details</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedReport(null);
                    setTranscript('');
                  }}
                  className="flex items-center gap-1 font-mono text-[0.68rem] text-slate-400 hover:text-white"
                >
                  <RotateCcw className="size-3" />
                  <span>Record Again</span>
                </button>
              </div>
              <p className="mt-1 font-mono text-[0.68rem] text-slate-400">
                Review and modify all extracted fields before official submission to the emergency dispatch desk.
              </p>
            </div>

            {/* Original Spoken Transcript Review */}
            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <span className="label-caps block text-slate-400 mb-1">Spoken Voice Transcript:</span>
              <p className="font-mono text-xs text-slate-300 italic">"{transcript}"</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-200 block mb-1">Incident Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Hazard Category *</label>
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
                  <label className="font-semibold text-slate-200 block mb-1">Severity Level *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="low">Low (Monitoring)</option>
                    <option value="moderate">Moderate (Advisory)</option>
                    <option value="high">High (Evacuation Ready)</option>
                    <option value="critical">Critical (Life Threat)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Catchment Sector *</label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Landmark / Kilometer Post</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Old Confluence Ghat"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">People Affected / Trapped</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(e.target.value ? parseInt(e.target.value, 10) : '')}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Status Checkbox Toggles */}
              <div className="flex flex-wrap items-center gap-6 rounded border border-slate-800 bg-slate-950/60 p-3">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={peopleTrapped}
                    onChange={(e) => setPeopleTrapped(e.target.checked)}
                    className="size-4 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-0"
                  />
                  <span>People Trapped / Stranded</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={roadBlocked}
                    onChange={(e) => setRoadBlocked(e.target.checked)}
                    className="size-4 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-0"
                  />
                  <span>Highway / Corridor Blocked</span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-200 block mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Reporter Meta Preview */}
            <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[0.68rem] text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div>
                Reporting Officer: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})
              </div>
              <div>
                Contact: <span className="text-cyan-300">{currentUser.phone || '+91 94112 00000'}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded border border-slate-700 px-4 py-2 font-mono text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded bg-rose-600 px-5 py-2 font-mono text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 shadow-lg"
              >
                <Flame className="size-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Verified Incident'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
