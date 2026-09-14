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
  Check,
  Send,
  UserCheck,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { EmergencyVoiceReport, Incident, IncidentSeverity, IncidentType, UserProfile, Zone } from '../types';
import { ZONES } from '../data/zones';
import { parseVoiceEmergencyReport, VoiceParsedReport } from '../services/aiAssistant';
import { incidentService } from '../services/incidentService';

interface VoiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  selectedZone: Zone;
  onSubmitIncident: (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onSwitchToManual: () => void;
  isSimulationMode?: boolean;
  scenarioRunId?: string;
  onResponderAutoAssigned?: (responderName: string, unit: string) => void;
}

export const VoiceReportModal: React.FC<VoiceReportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedZone,
  onSubmitIncident,
  onSwitchToManual,
  isSimulationMode = false,
  scenarioRunId,
  onResponderAutoAssigned
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
  const [submittedReport, setSubmittedReport] = useState<EmergencyVoiceReport | null>(null);

  // Automatic Responder Assignment Demo State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [assignedResponder, setAssignedResponder] = useState<{ name: string; unit: string } | null>(null);

  // Editable Form fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>('flash_flood');
  const [severity, setSeverity] = useState<IncidentSeverity>('critical');
  const [zoneId, setZoneId] = useState(selectedZone.id);
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [peopleTrapped, setPeopleTrapped] = useState(false);
  const [peopleAtRisk, setPeopleAtRisk] = useState(true);
  const [roadBlocked, setRoadBlocked] = useState(false);
  const [peopleCount, setPeopleCount] = useState<number | ''>('');

  // GPS Fix
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Speech Recognition ref & transcript accumulator (prevents stale React state closures)
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const timerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Request GPS position when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmittedReport(null);
      setAssignedResponder(null);
      setCountdown(null);

      if (currentUser.lastKnownLocation) {
        setGpsLocation({
          lat: currentUser.lastKnownLocation.lat,
          lng: currentUser.lastKnownLocation.lng,
          accuracy: currentUser.lastKnownLocation.accuracy || 15
        });
        setGpsStatus(`Last Known Location: ${currentUser.lastKnownLocation.lat.toFixed(4)}°N, ${currentUser.lastKnownLocation.lng.toFixed(4)}°E`);
      } else if (navigator.geolocation) {
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
            setGpsStatus(
              `GPS Fix: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E (±${Math.round(pos.coords.accuracy)}m)`
            );
          },
          () => {
            setIsAcquiringGps(false);
            setGpsStatus('GPS signal unverified; using sector catchment coordinates.');
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }
    }
  }, [isOpen, currentUser]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  /**
   * Request microphone permission explicitly via getUserMedia,
   * then launch SpeechRecognition cleanly.
   */
  const startRecording = async () => {
    setMicPermissionError(null);
    setTranscript('');
    transcriptRef.current = '';
    setRecordingSeconds(0);
    setParsedReport(null);

    // 1. Explicit mic permission check
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release stream tracks so SpeechRecognition gets exclusive mic access
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        console.warn('Microphone permission request failed:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicPermissionError(
            'Microphone permission was denied. Please allow microphone access in your browser address bar, or use the manual report box below.'
          );
          return;
        }
      }
    }

    // 2. Web Speech API initialization
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setMicPermissionError(
        'Voice recognition is not supported in this browser. You can enter the emergency report manually below.'
      );
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
        const clean = currentTranscript.trim();
        transcriptRef.current = clean;
        setTranscript(clean);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermissionError(
            'Microphone access denied. You can edit the text directly or type your emergency report.'
          );
          setIsRecording(false);
        } else if (event.error === 'no-speech') {
          // Keep listening
        } else {
          setMicPermissionError(
            `Speech engine notice (${event.error}). You can continue speaking or edit the text manually.`
          );
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setMicPermissionError(
        'Unable to initialize audio capture. You can type your emergency report manually.'
      );
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);

    // Process using transcriptRef.current to avoid stale state closure
    const text = transcriptRef.current || transcript;
    if (text.trim()) {
      processTranscript(text);
    }
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
    setPeopleAtRisk(parsed.peopleAtRisk);
    setRoadBlocked(parsed.roadBlocked);
    setPeopleCount(parsed.peopleAffectedCount || '');
  };

  const applySampleTranscript = (sample: string) => {
    transcriptRef.current = sample;
    setTranscript(sample);
    processTranscript(sample);
  };

  const handleManualTranscriptChange = (newText: string) => {
    transcriptRef.current = newText;
    setTranscript(newText);
    processTranscript(newText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedZ = ZONES.find((z) => z.id === zoneId) || selectedZone;
      const finalLat = gpsLocation
        ? gpsLocation.lat
        : selectedZ.x
        ? 30.4 + selectedZ.x * 0.01
        : 30.415;
      const finalLng = gpsLocation
        ? gpsLocation.lng
        : selectedZ.y
        ? 79.3 + selectedZ.y * 0.01
        : 79.325;

      const reportId = `VREP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Store structured Emergency Report in Database
      const emergencyReport: EmergencyVoiceReport = {
        reportId,
        transcript: transcript || description,
        incidentType: type,
        severity,
        location: landmark.trim() || `${selectedZ.name} Corridor`,
        latitude: finalLat,
        longitude: finalLng,
        lastKnownLocation: currentUser.lastKnownLocation,
        roadBlocked,
        peopleAtRisk: peopleAtRisk || peopleTrapped,
        peopleCount: peopleCount !== '' ? Number(peopleCount) : undefined,
        createdAt: Date.now(),
        status: 'sos_created',
        source: 'voice',
        isSimulation: isSimulationMode,
        scenarioRunId
      };

      await incidentService.createEmergencyReport(emergencyReport);
      setSubmittedReport(emergencyReport);

      // 2. Create Incident / SOS in Database
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
          landmark:
            landmark.trim() ||
            (gpsLocation
              ? `GPS ${finalLat.toFixed(4)}°N, ${finalLng.toFixed(4)}°E`
              : `${selectedZ.name} corridor`),
          mapX: selectedZ.x + (Math.random() * 4 - 2),
          mapY: selectedZ.y + (Math.random() * 4 - 2)
        },
        reportedBy: {
          uid: currentUser.uid,
          name: currentUser.name,
          role: currentUser.role,
          contact: currentUser.phone || '+91 94112 00000'
        },
        aiTriageSummary: `Voice Emergency Verified: ${type.replace(/_/g, ' ').toUpperCase()}. ${
          peopleAtRisk ? 'People at risk detected. ' : ''
        }${roadBlocked ? 'Roadway blocked. ' : ''}SOS broadcast initiated.`,
        isSimulation: isSimulationMode,
        scenarioRunId,
        isSos: true,
        source: 'voice'
      });

      // 3. In DEMO MODE: Start 5-second automatic responder assignment countdown
      if (isSimulationMode) {
        setCountdown(5);
        let currentCount = 5;
        countdownIntervalRef.current = setInterval(() => {
          currentCount -= 1;
          if (currentCount > 0) {
            setCountdown(currentCount);
          } else {
            clearInterval(countdownIntervalRef.current);
            setCountdown(0);
            const assigned = {
              name: 'Responder 01 (Capt. Vikram Negi)',
              unit: 'SDRF Quick Response Unit 3 (Chamoli)'
            };
            setAssignedResponder(assigned);
            if (onResponderAutoAssigned) {
              onResponderAutoAssigned(assigned.name, assigned.unit);
            }
          }
        }, 1000);
      } else {
        // Normal mode: close modal after short delay
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
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
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsRecording(false);
    setTranscript('');
    transcriptRef.current = '';
    setParsedReport(null);
    setMicPermissionError(null);
    setSubmittedReport(null);
    setCountdown(null);
    setAssignedResponder(null);
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
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                  Voice Emergency Reporting
                </h3>
                {isSimulationMode && (
                  <span className="rounded border border-amber-500/40 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-amber-300">
                    Simulation Mode
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-slate-400">
                Natural speech processing, entity extraction &amp; SOS creation
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

        {/* GPS / Location Indicator Strip */}
        <div className="mt-3 flex items-center justify-between rounded border border-slate-800/80 bg-slate-950/60 px-3 py-1.5 font-mono text-[0.68rem] text-slate-400">
          <div className="flex items-center gap-1.5">
            <MapPin className={`size-3 ${gpsLocation ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>
              {gpsStatus || (gpsLocation ? `GPS: ${gpsLocation.lat.toFixed(4)}°N, ${gpsLocation.lng.toFixed(4)}°E` : 'Locating device...')}
            </span>
          </div>
          {gpsLocation && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 font-bold text-emerald-400 border border-emerald-500/40 uppercase">
              Location Verified
            </span>
          )}
        </div>

        {/* Permission / Unsupported Warnings */}
        {micPermissionError && (
          <div className="mt-3 rounded border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 font-mono">
            <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
              <AlertTriangle className="size-4" />
              <span>Microphone Status</span>
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
              Voice recognition is not supported in this browser. You can enter the emergency report manually below or click a scenario preset to test extraction.
            </p>
          </div>
        )}

        {/* POST-SUBMISSION / AUTOMATIC RESPONDER ASSIGNMENT VIEW (Demo Mode) */}
        {submittedReport && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4">
              <div className="flex items-center gap-2 font-display text-base font-bold uppercase text-emerald-300">
                <CheckCircle className="size-5 text-emerald-400" />
                <span>Emergency Report &amp; SOS Dispatched to Database</span>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-300">
                Report ID: <strong className="text-white">{submittedReport.reportId}</strong> | Type:{' '}
                <span className="uppercase text-emerald-300">{submittedReport.incidentType}</span> | Severity:{' '}
                <span className="uppercase text-rose-300">{submittedReport.severity}</span>
              </p>
            </div>

            {/* 5-second Automatic Responder Assignment Countdown */}
            {isSimulationMode && (
              <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-sm font-bold uppercase text-cyan-200">
                    <UserCheck className="size-4 text-cyan-400" />
                    <span>Automatic Responder Dispatch</span>
                  </div>
                  {countdown !== null && countdown > 0 && (
                    <span className="rounded border border-cyan-500/50 bg-cyan-900/60 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300 animate-pulse">
                      Assigning in {countdown}s...
                    </span>
                  )}
                </div>

                {countdown !== null && countdown > 0 ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between font-mono text-xs text-slate-300 mb-1.5">
                      <span>Matching nearest high-altitude mountain rescue unit...</span>
                      <strong className="text-cyan-400">{countdown}s</strong>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-1000"
                        style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : assignedResponder ? (
                  <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-950/40 p-3 font-mono text-xs">
                    <div className="flex items-center gap-2 font-bold text-emerald-300">
                      <Check className="size-4" />
                      <span>✓ Responder Assigned</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between text-slate-200">
                      <span>🚑 {assignedResponder.name}</span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-300">
                        STATUS: EN ROUTE
                      </span>
                    </div>
                    <p className="mt-1 text-[0.7rem] text-slate-400">
                      Destination: {submittedReport.location} | Units: {assignedResponder.unit}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded bg-slate-800 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-slate-700"
              >
                Close &amp; View on Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Recording / Speech Input / Manual Input View */}
        {!submittedReport && !parsedReport && (
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
                  id="voice-modal-mic-btn"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 flex size-16 items-center justify-center rounded-full transition-all shadow-xl ${
                    isRecording
                      ? 'bg-rose-600 text-white ring-4 ring-rose-500/50'
                      : 'bg-slate-800 text-slate-200 hover:bg-rose-600 hover:text-white border border-slate-700'
                  }`}
                  title={isRecording ? 'Click to stop listening' : 'Click to start speaking'}
                >
                  {isRecording ? (
                    <MicOff className="size-7 animate-bounce" />
                  ) : (
                    <Mic className="size-7" />
                  )}
                </button>
              </div>

              {/* Status Message */}
              <div className="mt-3">
                <span className="font-display font-bold uppercase tracking-wider text-sm text-white">
                  {isRecording ? 'Listening to Emergency Speech...' : 'Press Microphone to Speak'}
                </span>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {isRecording
                    ? `Recording: 00:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds} — Live speech transcription active`
                    : 'Speak naturally or use the manual report box below'}
                </p>
              </div>

              {/* Editable Live Transcript Display */}
              <div className="mt-4 rounded border border-slate-800 bg-slate-900 p-3 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="label-caps text-slate-400">
                    Live Speech Transcription (Editable):
                  </span>
                  <span className="font-mono text-[0.62rem] text-slate-500">
                    You can type or edit directly
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={transcript}
                  onChange={(e) => handleManualTranscriptChange(e.target.value)}
                  placeholder="Spoken words will appear here in real time... Or type your report directly."
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-cyan-200 outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Action Buttons while recording or text available */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {isRecording && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 rounded bg-emerald-600 px-5 py-2 font-mono text-xs font-bold text-white hover:bg-emerald-500 shadow-md"
                  >
                    <Check className="size-4" />
                    <span>Done Speaking &amp; Extract</span>
                  </button>
                )}

                {transcript.trim().length > 0 && !isRecording && (
                  <button
                    type="button"
                    onClick={() => processTranscript(transcript)}
                    className="flex items-center gap-1.5 rounded bg-cyan-600 px-5 py-2 font-mono text-xs font-bold text-white hover:bg-cyan-500 shadow-md"
                  >
                    <Sparkles className="size-4" />
                    <span>Extract Emergency Data →</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.stop();
                      } catch (e) {}
                    }
                    setIsRecording(false);
                    setTranscript('');
                    transcriptRef.current = '';
                  }}
                  className="rounded border border-slate-700 px-4 py-2 font-mono text-xs text-slate-400 hover:bg-slate-800"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Quick Testing Voice Samples (Includes User Required Scenario) */}
            <div className="rounded border border-slate-800/80 bg-slate-950/50 p-3 text-left">
              <span className="label-caps block text-cyan-400 mb-2">
                Simulate Spoken Emergency Scenarios (1-Click NLP Test)
              </span>
              <div className="space-y-2">
                {/* User Explicit Required Scenario */}
                <button
                  type="button"
                  id="sample-transcript-demo"
                  onClick={() =>
                    applySampleTranscript(
                      'Water is entering our village and the road near the bridge is blocked. We need help.'
                    )
                  }
                  className="w-full rounded border border-rose-500/40 bg-rose-950/30 p-2.5 text-left font-mono text-xs text-rose-200 hover:border-rose-400 hover:bg-rose-900/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <strong className="text-rose-300 font-bold">Demo Emergency Transcript (Required):</strong>
                    <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[0.62rem] text-rose-300 font-bold uppercase">
                      Recommended
                    </span>
                  </div>
                  "Water is entering our village and the road near the bridge is blocked. We need help."
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applySampleTranscript(
                      'There is a massive landslide near Badrinath highway km 14. Three people are trapped in a car and the main road is completely blocked.'
                    )
                  }
                  className="w-full rounded border border-slate-800 bg-slate-900 p-2 text-left font-mono text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                >
                  <strong className="text-cyan-300">Scenario B:</strong> "Massive landslide near Badrinath highway km 14. Three people are trapped in a car and the main road is completely blocked."
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
                  <strong className="text-amber-300">Scenario C:</strong> "Teesta river has burst its banks near Old Confluence Ghat. Water entering lower market, 5 families need urgent boat evacuation."
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
        )}

        {/* Step 2: Structured Review & Edit Form with "Confirm & Send SOS" */}
        {!submittedReport && parsedReport && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {/* Extraction AI Confidence Banner */}
            <div className="rounded border border-purple-500/40 bg-purple-950/20 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <Sparkles className="size-4" />
                  <span>AI Extracted Emergency Report</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedReport(null);
                    setTranscript('');
                    transcriptRef.current = '';
                  }}
                  className="flex items-center gap-1 font-mono text-[0.68rem] text-slate-400 hover:text-white"
                >
                  <RotateCcw className="size-3" />
                  <span>Re-record</span>
                </button>
              </div>
              <p className="mt-1 font-mono text-[0.68rem] text-slate-400">
                Extracted from spoken input. Review and edit any field before official broadcast.
              </p>
            </div>

            {/* Extracted Key Indicators Highlight Strip */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[0.7rem]">
              <div className="rounded border border-slate-800 bg-slate-950 p-2">
                <span className="text-slate-400 block text-[0.62rem] uppercase">Incident Type</span>
                <span className="font-bold text-white uppercase">{type.replace(/_/g, ' ')}</span>
              </div>
              <div className="rounded border border-rose-500/40 bg-rose-950/30 p-2">
                <span className="text-rose-400 block text-[0.62rem] uppercase">Severity</span>
                <span className="font-bold text-rose-300 uppercase">{severity}</span>
              </div>
              <div className="rounded border border-amber-500/40 bg-amber-950/30 p-2">
                <span className="text-amber-400 block text-[0.62rem] uppercase">Road Blocked</span>
                <span className="font-bold text-amber-300">{roadBlocked ? 'Yes ❌' : 'No ✓'}</span>
              </div>
              <div className="rounded border border-emerald-500/40 bg-emerald-950/30 p-2">
                <span className="text-emerald-400 block text-[0.62rem] uppercase">People at Risk</span>
                <span className="font-bold text-emerald-300">
                  {peopleAtRisk ? 'Detected ⚠️' : 'None Reported'}
                </span>
              </div>
            </div>

            {/* Editable Transcript Field */}
            <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="label-caps text-slate-400">Spoken Voice Transcript:</span>
                <span className="font-mono text-[0.62rem] text-cyan-400 flex items-center gap-1">
                  <Edit3 className="size-3" /> Editable
                </span>
              </div>
              <textarea
                rows={2}
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  transcriptRef.current = e.target.value;
                }}
                className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-200 block mb-1">
                  Incident Headline / Title *
                </label>
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
                    <option value="flash_flood">Flash Flood</option>
                    <option value="landslide">Landslide / Debris</option>
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
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="low">Low (Monitoring)</option>
                    <option value="moderate">Moderate (Advisory)</option>
                    <option value="high">High (Evacuation Ready)</option>
                    <option value="critical">Critical (Immediate Life Threat)</option>
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
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">
                    Landmark / Location Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Village Bridge Approach"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">
                    People Affected / Trapped
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={peopleCount}
                    onChange={(e) =>
                      setPeopleCount(e.target.value ? parseInt(e.target.value, 10) : '')
                    }
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Status Checkbox Toggles */}
              <div className="flex flex-wrap items-center gap-6 rounded border border-slate-800 bg-slate-950/60 p-3">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={peopleAtRisk}
                    onChange={(e) => setPeopleAtRisk(e.target.checked)}
                    className="size-4 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-0"
                  />
                  <span>People at Risk / Need Urgent Help</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={roadBlocked}
                    onChange={(e) => setRoadBlocked(e.target.checked)}
                    className="size-4 rounded border-slate-700 bg-slate-900 text-amber-600 focus:ring-0"
                  />
                  <span>Road / Bridge Blocked</span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-200 block mb-1">
                  Emergency Situation Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Reporter Meta Preview */}
            <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[0.68rem] text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div>
                Report Source: <strong className="text-white">Voice Extraction Engine</strong> | User:{' '}
                <span className="text-cyan-300">{currentUser.name}</span>
              </div>
              <div>
                Target Catchment: <span className="text-white">{selectedZone.name}</span>
              </div>
            </div>

            {/* Action Bar with CONFIRM & SEND SOS */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  setParsedReport(null);
                }}
                className="rounded border border-slate-700 px-3 py-2 font-mono text-xs text-slate-400 hover:bg-slate-800"
              >
                ← Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded border border-slate-700 px-4 py-2 font-mono text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-send-sos-btn"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded bg-rose-600 px-6 py-2.5 font-mono text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 shadow-xl"
                >
                  <ShieldAlert className="size-4 animate-pulse" />
                  <span>{isSubmitting ? 'Transmitting SOS...' : '[ CONFIRM & SEND SOS ]'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
