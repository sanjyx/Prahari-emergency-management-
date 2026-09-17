import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Clock,
  RotateCcw,
  Radio,
  Check,
  UserCheck,
  ShieldAlert,
  Edit3,
  Loader2,
  Volume2
} from 'lucide-react';
import { EmergencyVoiceReport, Incident, IncidentSeverity, IncidentType, UserProfile, Zone } from '../types';
import { ZONES } from '../data/zones';
import { dbIncidentService, classifyIncidentTranscript, selectDemoResponder, DemoResponder } from '../services/dbIncidentService';
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
  isSimulationMode = true,
  scenarioRunId,
  onResponderAutoAssigned
}) => {
  // Voice Recording & Transcribing State
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'transcribing'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [transcriptionNotice, setTranscriptionNotice] = useState<string | null>(null);
  const [transcriptionEngine, setTranscriptionEngine] = useState<string>('Hugging Face Whisper Large-v3');

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const countdownIntervalRef = useRef<any>(null);

  // Editable Form fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>('flash_flood');
  const [displayType, setDisplayType] = useState('Flash Flood');
  const [severity, setSeverity] = useState<IncidentSeverity>('high');
  const [zoneId, setZoneId] = useState(selectedZone.id);
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [peopleTrapped, setPeopleTrapped] = useState(false);
  const [peopleAtRisk, setPeopleAtRisk] = useState(true);
  const [roadBlocked, setRoadBlocked] = useState(false);
  const [peopleCount, setPeopleCount] = useState<number | ''>('');

  // Classification Meta
  const [classificationExplanation, setClassificationExplanation] = useState('');
  const [classificationConfidence, setClassificationConfidence] = useState<'High' | 'Needs verification'>('High');

  // GPS Location State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocationManual, setIsLocationManual] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Review & Submit State
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);
  const [submittedDbId, setSubmittedDbId] = useState<string | null>(null);

  // 5-Second DEMO MODE Responder Assignment State
  const [assignmentStage, setAssignmentStage] = useState<'none' | 'finding' | 'assigned'>('none');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [assignedResponder, setAssignedResponder] = useState<DemoResponder | null>(null);

  // Reset and acquire location when modal opens
  useEffect(() => {
    if (isOpen) {
      setRecordingState('idle');
      setRecordingSeconds(0);
      setTranscript('');
      transcriptRef.current = '';
      setTranscriptionNotice(null);
      setIsReviewing(false);
      setCreatedIncidentId(null);
      setSubmittedDbId(null);
      setAssignmentStage('none');
      setCountdown(null);
      setAssignedResponder(null);

      // Capture GPS
      if (currentUser.lastKnownLocation) {
        setGpsLocation({
          lat: currentUser.lastKnownLocation.lat,
          lng: currentUser.lastKnownLocation.lng,
          accuracy: currentUser.lastKnownLocation.accuracy || 15
        });
        setIsLocationManual(false);
        setGpsStatus(`GPS Verified: ${currentUser.lastKnownLocation.lat.toFixed(4)}°N, ${currentUser.lastKnownLocation.lng.toFixed(4)}°E`);
      } else if (navigator.geolocation) {
        setGpsStatus('Requesting high-accuracy device GPS fix...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy)
            });
            setIsLocationManual(false);
            setGpsStatus(`GPS Fix: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E (±${Math.round(pos.coords.accuracy)}m)`);
          },
          () => {
            setIsLocationManual(true);
            setGpsStatus('Location manually provided (GPS permission denied)');
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else {
        setIsLocationManual(true);
        setGpsStatus('Location manually provided (GPS unavailable)');
      }
    }
  }, [isOpen, currentUser]);

  // Recording Timer
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  /**
   * Start Voice Recording with MediaRecorder (and Web Speech live feedback)
   */
  const startRecording = async () => {
    setTranscriptionNotice(null);
    setTranscript('');
    transcriptRef.current = '';
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording API is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        handleAudioRecorded(mimeType);
      };

      mediaRecorder.start(250);
      setRecordingState('recording');

      // Also start browser Web Speech recognition for real-time visual feedback while recording
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let cur = '';
            for (let i = 0; i < event.results.length; i++) {
              cur += event.results[i][0].transcript + ' ';
            }
            const clean = cur.trim();
            if (clean) {
              transcriptRef.current = clean;
              setTranscript(clean);
            }
          };

          recognition.onerror = () => {};
          recognitionRef.current = recognition;
          recognition.start();
        } catch (e) {
          // Web speech is just a live preview helper
        }
      }
    } catch (err: any) {
      console.warn('Microphone start error:', err);
      setRecordingState('idle');
      setTranscriptionNotice(
        `Microphone access error: ${err.message || 'Permission denied'}. You can type or select a sample transcription below.`
      );
    }
  };

  /**
   * Stop Recording
   */
  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setRecordingState('processing');
      mediaRecorderRef.current.stop();
    } else {
      setRecordingState('idle');
      const text = transcriptRef.current || transcript;
      if (text.trim()) {
        applyTranscriptAndClassify(text.trim());
      }
    }
  };

  /**
   * Process the recorded audio chunk and invoke Hugging Face Whisper on backend
   */
  const handleAudioRecorded = async (mimeType: string) => {
    setRecordingState('transcribing');
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

    // Fallback transcript from live WebSpeech if available
    const liveTranscript = transcriptRef.current.trim();

    try {
      // Convert audio blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Post to backend server route
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType
        })
      });

      const data = await response.json();

      if (data.success && data.text) {
        setTranscriptionEngine('Hugging Face Whisper (openai/whisper-large-v3)');
        setTranscript(data.text);
        transcriptRef.current = data.text;
        setTranscriptionNotice(null);
        applyTranscriptAndClassify(data.text);
      } else {
        // Graceful non-crashing fallback
        const errMsg = data.error || 'Whisper Large-v3 could not process audio.';
        setTranscriptionEngine('Demo Speech-to-Text Fallback');
        setTranscriptionNotice(
          `Whisper Large-v3 notice: ${errMsg} You can verify or edit the transcription below before submitting.`
        );
        const fallbackText = liveTranscript || 'Water is rising rapidly near the bridge and road is blocked.';
        setTranscript(fallbackText);
        transcriptRef.current = fallbackText;
        applyTranscriptAndClassify(fallbackText);
      }
    } catch (err: any) {
      console.warn('Whisper API invocation exception:', err);
      setTranscriptionEngine('Local Speech Fallback');
      setTranscriptionNotice(
        `Whisper service offline or timed out: ${err.message}. You can edit the text manually.`
      );
      const fallbackText = liveTranscript || 'Water is rising rapidly near the bridge and road is blocked.';
      setTranscript(fallbackText);
      transcriptRef.current = fallbackText;
      applyTranscriptAndClassify(fallbackText);
    } finally {
      setRecordingState('idle');
    }
  };

  /**
   * Transparent Keyword & Rule-Based Incident Classification
   */
  const applyTranscriptAndClassify = (text: string) => {
    const classification = classifyIncidentTranscript(text);

    // Map to system IncidentType & Severity
    let mappedType: IncidentType = 'flash_flood';
    if (classification.incidentType === 'Landslide') mappedType = 'landslide';
    else if (classification.incidentType === 'Road Blockage') mappedType = 'road_block';
    else if (classification.incidentType === 'Rising Water') mappedType = 'river_burst';
    else if (classification.incidentType === 'Infrastructure Damage') mappedType = 'bridge_damage';
    else if (classification.incidentType === 'Other Emergency') mappedType = 'trapped_civilians';

    let mappedSev: IncidentSeverity = 'high';
    if (classification.severity === 'CRITICAL') mappedSev = 'critical';
    else if (classification.severity === 'HIGH') mappedSev = 'high';
    else if (classification.severity === 'MODERATE') mappedSev = 'moderate';
    else if (classification.severity === 'LOW') mappedSev = 'low';

    setDisplayType(classification.incidentType);
    setType(mappedType);
    setSeverity(mappedSev);
    setClassificationExplanation(classification.explanation);
    setClassificationConfidence(classification.confidence);

    // Title generation
    setTitle(`${classification.incidentType} Emergency: ${selectedZone.name}`);
    setDescription(text);

    // Booleans
    const lower = text.toLowerCase();
    setPeopleTrapped(lower.includes('trapped') || lower.includes('stranded'));
    setPeopleAtRisk(lower.includes('trapped') || lower.includes('people') || lower.includes('family') || lower.includes('help'));
    setRoadBlocked(lower.includes('road') || lower.includes('bridge') || lower.includes('blocked'));

    setIsReviewing(true);
  };

  const applySampleTranscript = (sample: string) => {
    setTranscript(sample);
    transcriptRef.current = sample;
    applyTranscriptAndClassify(sample);
  };

  /**
   * Submit Incident to Persistent Database & Trigger 5-Second Demo Responder Assignment
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedZ = ZONES.find((z) => z.id === zoneId) || selectedZone;
      const finalLat = gpsLocation ? gpsLocation.lat : 30.4085 + (selectedZ.x || 30) * 0.005;
      const finalLng = gpsLocation ? gpsLocation.lng : 79.3254 + (selectedZ.y || 40) * 0.005;

      const humanReadableId = `PRH-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create in backend DB (/api/incidents & Supabase)
      const dbRecord = await dbIncidentService.createIncident({
        incident_id: humanReadableId,
        created_at: new Date().toISOString(),
        reporter_name: currentUser.name || 'Anonymous Citizen',
        reporter_contact: currentUser.phone || '+91 94112 00000',
        transcription: transcript || description,
        incident_type: displayType,
        severity: severity.toUpperCase() as any,
        latitude: finalLat,
        longitude: finalLng,
        location_name: landmark.trim() || `${selectedZ.name} Catchment`,
        status: 'NEW',
        source: 'VOICE',
        demo_mode: isSimulationMode,
        notes: `AI-assisted classification: ${displayType} (${severity.toUpperCase()}). ${classificationExplanation}`
      });

      setCreatedIncidentId(dbRecord.incident_id);
      setSubmittedDbId(dbRecord.id);

      // 2. Also register in client incident service
      await onSubmitIncident({
        title: title || `${displayType} Reported via Voice`,
        type,
        severity,
        status: 'reported',
        description: transcript || description,
        zoneId: selectedZ.id,
        zoneName: selectedZ.name,
        location: {
          lat: finalLat,
          lng: finalLng,
          landmark: landmark.trim() || `${selectedZ.name} sector corridor`,
          mapX: selectedZ.x + (Math.random() * 4 - 2),
          mapY: selectedZ.y + (Math.random() * 4 - 2)
        },
        reportedBy: {
          uid: currentUser.uid,
          name: currentUser.name,
          role: currentUser.role,
          contact: currentUser.phone || '+91 94112 00000'
        },
        aiTriageSummary: `Hugging Face Whisper Voice Dispatch [${humanReadableId}]: ${displayType} (${severity.toUpperCase()}). ${classificationExplanation}`,
        isSimulation: isSimulationMode,
        scenarioRunId,
        isSos: true,
        source: 'voice'
      });

      // 3. Register structured Emergency Voice Report
      const emergencyReport: EmergencyVoiceReport = {
        reportId: humanReadableId,
        transcript: transcript || description,
        incidentType: type,
        severity,
        location: landmark.trim() || `${selectedZ.name} Catchment`,
        latitude: finalLat,
        longitude: finalLng,
        roadBlocked,
        peopleAtRisk,
        peopleCount: peopleCount !== '' ? Number(peopleCount) : undefined,
        createdAt: Date.now(),
        status: 'sos_created',
        source: 'voice',
        isSimulation: isSimulationMode,
        scenarioRunId
      };
      await incidentService.createEmergencyReport(emergencyReport);

      // 4. 5-Second DEMO MODE Responder Assignment
      if (isSimulationMode) {
        setAssignmentStage('finding');
        setCountdown(5);
        let secondsLeft = 5;

        countdownIntervalRef.current = setInterval(async () => {
          secondsLeft -= 1;
          if (secondsLeft > 0) {
            setCountdown(secondsLeft);
          } else {
            clearInterval(countdownIntervalRef.current);
            setCountdown(0);

            // Select predefined demo responder
            const responder = selectDemoResponder(displayType, severity.toUpperCase());
            setAssignedResponder(responder);
            setAssignmentStage('assigned');

            // Update database with responder assignment
            await dbIncidentService.assignResponder(dbRecord.id, {
              id: responder.id,
              name: responder.name
            });

            if (onResponderAutoAssigned) {
              onResponderAutoAssigned(responder.name, responder.unit);
            }
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error('Failed to submit voice incident:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
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
                  Voice Incident Reporting
                </h3>
                {isSimulationMode && (
                  <span className="rounded border border-amber-500/40 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-amber-300">
                    DEMO MODE
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-slate-400">
                Hugging Face Whisper Large-v3 Speech-to-Text &bull; Instant Dispatch
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

        {/* Geolocation Status Bar */}
        <div className="mt-3 flex items-center justify-between rounded border border-slate-800/80 bg-slate-950/60 px-3 py-1.5 font-mono text-[0.68rem] text-slate-400">
          <div className="flex items-center gap-1.5">
            <MapPin className={`size-3 ${gpsLocation && !isLocationManual ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{gpsStatus || 'Acquiring GPS coordinates...'}</span>
          </div>
          {isLocationManual ? (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.2 font-bold text-amber-300 border border-amber-500/40 uppercase">
              Location manually provided
            </span>
          ) : gpsLocation ? (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 font-bold text-emerald-400 border border-emerald-500/40 uppercase">
              GPS Verified
            </span>
          ) : null}
        </div>

        {/* Informational or Fallback Notice */}
        {transcriptionNotice && (
          <div className="mt-3 rounded border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 font-mono">
            <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
              <AlertTriangle className="size-4" />
              <span>Speech-to-Text Status</span>
            </div>
            <p>{transcriptionNotice}</p>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* POST-SUBMISSION / 5-SECOND DEMO ASSIGNMENT SCREEN             */}
        {/* ------------------------------------------------------------- */}
        {createdIncidentId && (
          <div className="mt-4 space-y-4">
            {/* Report Received Card */}
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display text-base font-bold uppercase text-emerald-300">
                  <CheckCircle className="size-5 text-emerald-400" />
                  <span>Report Submitted &bull; Report Received</span>
                </div>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300 border border-emerald-500/30">
                  Status: {assignmentStage === 'assigned' ? 'ASSIGNED' : 'NEW'}
                </span>
              </div>
              <p className="mt-2 font-mono text-sm text-slate-200">
                Incident ID: <strong className="text-white text-base tracking-wider">{createdIncidentId}</strong>
              </p>
              <p className="mt-1 font-mono text-xs text-slate-400">
                Type: <strong className="text-cyan-300 uppercase">{displayType}</strong> &bull; Severity:{' '}
                <strong className="text-rose-400 uppercase">{severity}</strong> &bull; Location:{' '}
                <span className="text-slate-300">{landmark || selectedZone.name}</span>
              </p>
            </div>

            {/* 5-Second Automatic Responder Assignment Flow */}
            {isSimulationMode && (
              <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-sm font-bold uppercase text-cyan-200">
                    <UserCheck className="size-4 text-cyan-400" />
                    <span>
                      {assignmentStage === 'assigned'
                        ? 'Responder Assigned'
                        : 'Finding nearest available responder...'}
                    </span>
                  </div>
                  <span className="rounded border border-cyan-500/30 bg-cyan-950/80 px-2 py-0.5 font-mono text-[0.65rem] uppercase text-cyan-300">
                    DEMO MODE &mdash; Simulated responder assignment
                  </span>
                </div>

                {assignmentStage === 'finding' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between font-mono text-xs text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin text-cyan-400" />
                        Querying alpine quick-reaction units...
                      </span>
                      <strong className="text-cyan-400 font-bold">{countdown}s</strong>
                    </div>
                    {/* Animated Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${((5 - (countdown || 0)) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {assignmentStage === 'assigned' && assignedResponder && (
                  <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-950/40 p-3 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <Check className="size-4 text-emerald-400" />
                        <span>✓ Responder Assigned</span>
                      </div>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-300">
                        STATUS: ASSIGNED
                      </span>
                    </div>

                    <div className="rounded bg-slate-900/90 p-2.5 border border-slate-800 space-y-1">
                      <div className="text-white font-bold flex items-center justify-between">
                        <span>🚑 {assignedResponder.name} ({assignedResponder.id})</span>
                        <span className="text-cyan-400 font-normal">{assignedResponder.phone}</span>
                      </div>
                      <div className="text-slate-400 text-[0.72rem]">
                        Unit: {assignedResponder.unit}
                      </div>
                      <div className="text-slate-400 text-[0.72rem]">
                        Dispatch Timestamp: {new Date().toLocaleTimeString()} &bull; ETA: ~8 mins
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="font-mono text-[0.7rem] text-slate-500">
                Persistent database record saved. Live authority dashboard updated.
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="rounded bg-cyan-600 px-5 py-2 font-mono text-xs font-bold text-white hover:bg-cyan-500 shadow-md"
              >
                Close &amp; View on Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: VOICE RECORDING & TRANSCRIPTION INTERACTION           */}
        {/* ------------------------------------------------------------- */}
        {!createdIncidentId && !isReviewing && (
          <div className="mt-4 space-y-4 text-center">
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-6">
              {/* Pulsing Mic Button */}
              <div className="relative mx-auto flex size-24 items-center justify-center">
                {recordingState === 'recording' && (
                  <>
                    <span className="absolute size-24 rounded-full bg-rose-500/20 animate-ping" />
                    <span className="absolute size-20 rounded-full bg-rose-500/30 animate-pulse" />
                  </>
                )}
                <button
                  type="button"
                  id="start-voice-recording-btn"
                  onClick={recordingState === 'recording' ? stopRecording : startRecording}
                  disabled={recordingState === 'processing' || recordingState === 'transcribing'}
                  className={`relative z-10 flex size-16 items-center justify-center rounded-full transition-all shadow-xl disabled:opacity-50 ${
                    recordingState === 'recording'
                      ? 'bg-rose-600 text-white ring-4 ring-rose-500/50'
                      : 'bg-slate-800 text-slate-200 hover:bg-rose-600 hover:text-white border border-slate-700'
                  }`}
                  title={recordingState === 'recording' ? 'Click to Stop Recording' : 'Click to Start Recording'}
                >
                  {recordingState === 'recording' ? (
                    <MicOff className="size-7" />
                  ) : recordingState === 'processing' || recordingState === 'transcribing' ? (
                    <Loader2 className="size-7 animate-spin text-cyan-400" />
                  ) : (
                    <Mic className="size-7" />
                  )}
                </button>
              </div>

              {/* Recording State Text */}
              <div className="mt-3">
                <span className="font-display font-bold uppercase tracking-wider text-sm text-white">
                  {recordingState === 'recording'
                    ? 'Recording...'
                    : recordingState === 'processing'
                    ? 'Processing Audio...'
                    : recordingState === 'transcribing'
                    ? 'Transcribing with Hugging Face Whisper...'
                    : 'Click to Start Recording'}
                </span>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {recordingState === 'recording' ? (
                    <span className="text-rose-400 font-bold flex items-center justify-center gap-1">
                      <span className="size-2 rounded-full bg-rose-500 animate-ping inline-block" />
                      Recording: 00:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
                    </span>
                  ) : recordingState === 'transcribing' ? (
                    'Running openai/whisper-large-v3 model via secure server endpoint...'
                  ) : (
                    'Press to record emergency speech or pick a demo scenario below'
                  )}
                </p>
              </div>

              {/* Stop Recording button if recording */}
              {recordingState === 'recording' && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-1.5 rounded bg-rose-600 px-6 py-2 font-mono text-xs font-bold text-white hover:bg-rose-500 shadow-lg"
                  >
                    <MicOff className="size-4" />
                    <span>Stop Recording &amp; Transcribe</span>
                  </button>
                </div>
              )}

              {/* Editable Live Transcript Area */}
              <div className="mt-4 rounded border border-slate-800 bg-slate-900 p-3 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="label-caps text-slate-400">
                    Spoken Voice Transcription:
                  </span>
                  <span className="font-mono text-[0.62rem] text-cyan-400 flex items-center gap-1">
                    <Edit3 className="size-3" /> Editable
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    transcriptRef.current = e.target.value;
                  }}
                  placeholder="Spoken words will appear here... You can also type directly or select a test scenario."
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-cyan-200 outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Process / Extract Button */}
              {transcript.trim().length > 0 && recordingState === 'idle' && (
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => applyTranscriptAndClassify(transcript)}
                    className="flex items-center gap-1.5 rounded bg-cyan-600 px-6 py-2 font-mono text-xs font-bold text-white hover:bg-cyan-500 shadow-md"
                  >
                    <Sparkles className="size-4" />
                    <span>Process &amp; Review Report &rarr;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript('');
                      transcriptRef.current = '';
                    }}
                    className="rounded border border-slate-700 px-3 py-2 font-mono text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Quick Demo Test Scenarios */}
            <div className="rounded border border-slate-800/80 bg-slate-950/50 p-3 text-left">
              <span className="label-caps block text-cyan-400 mb-2">
                Quick Demo Test Phrases (1-Click Whisper Speech Test)
              </span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    applySampleTranscript(
                      'Water is rising rapidly near the bridge and people need help.'
                    )
                  }
                  className="w-full rounded border border-rose-500/40 bg-rose-950/30 p-2.5 text-left font-mono text-xs text-rose-200 hover:border-rose-400 hover:bg-rose-900/40 transition-colors"
                >
                  <strong className="text-rose-300 block mb-0.5">Rising Water / Rapid Inundation:</strong>
                  "Water is rising rapidly near the bridge and people need help."
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applySampleTranscript(
                      'Major landslide blocking the main highway at Chamoli, vehicles trapped.'
                    )
                  }
                  className="w-full rounded border border-slate-800 bg-slate-900 p-2 text-left font-mono text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                >
                  <strong className="text-cyan-300 block mb-0.5">Landslide &amp; Road Blockage:</strong>
                  "Major landslide blocking the main highway at Chamoli, vehicles trapped."
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applySampleTranscript(
                      'Minor waterlogging on the road, traffic moving slowly.'
                    )
                  }
                  className="w-full rounded border border-slate-800 bg-slate-900 p-2 text-left font-mono text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                >
                  <strong className="text-amber-300 block mb-0.5">Minor Waterlogging:</strong>
                  "Minor waterlogging on the road, traffic moving slowly."
                </button>
              </div>
            </div>

            {/* Switch to Manual Form */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onSwitchToManual();
                }}
                className="text-slate-400 hover:text-cyan-300 underline"
              >
                Prefer typing? Switch to Manual Form &rarr;
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

        {/* ------------------------------------------------------------- */}
        {/* STEP 2: REVIEW, EDIT & SUBMIT REPORT                          */}
        {/* ------------------------------------------------------------- */}
        {!createdIncidentId && isReviewing && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {/* AI-Assisted Incident Classification Banner */}
            <div className="rounded-lg border border-sky-500/40 bg-[#162334] p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sky-300">
                  <Sparkles className="size-4 text-sky-400" />
                  <span>AI-assisted incident classification</span>
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-xs text-sky-300 border border-sky-500/30">
                    {classificationConfidence}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewing(false)}
                  className="flex items-center gap-1 font-mono text-[0.68rem] text-slate-400 hover:text-white"
                >
                  <RotateCcw className="size-3" />
                  <span>Re-record</span>
                </button>
              </div>
              <p className="mt-1 font-mono text-[0.68rem] text-slate-300">
                {classificationExplanation}
              </p>
            </div>

            {/* Extracted Key Indicators */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[0.7rem]">
              <div className="rounded border border-slate-800 bg-slate-950 p-2">
                <span className="text-slate-400 block text-[0.62rem] uppercase">Incident Type</span>
                <span className="font-bold text-white uppercase">{displayType}</span>
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
                <span className="label-caps text-slate-400">Transcription (User can edit/correct):</span>
                <span className="font-mono text-[0.62rem] text-cyan-400 flex items-center gap-1">
                  <Edit3 className="size-3" /> Editable
                </span>
              </div>
              <textarea
                rows={2}
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setDescription(e.target.value);
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
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Incident Type *</label>
                  <select
                    value={displayType}
                    onChange={(e) => {
                      const dt = e.target.value;
                      setDisplayType(dt);
                      if (dt === 'Landslide') setType('landslide');
                      else if (dt === 'Road Blockage') setType('road_block');
                      else if (dt === 'Rising Water') setType('river_burst');
                      else if (dt === 'Infrastructure Damage') setType('bridge_damage');
                      else if (dt === 'Other Emergency') setType('trapped_civilians');
                      else setType('flash_flood');
                    }}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-mono text-xs"
                  >
                    <option value="Flash Flood">Flash Flood</option>
                    <option value="Rising Water">Rising Water</option>
                    <option value="Landslide">Landslide</option>
                    <option value="Road Blockage">Road Blockage</option>
                    <option value="Infrastructure Damage">Infrastructure Damage</option>
                    <option value="Other Emergency">Other Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Severity *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-mono text-xs font-bold"
                  >
                    <option value="low">LOW</option>
                    <option value="moderate">MODERATE</option>
                    <option value="high">HIGH</option>
                    <option value="critical">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Catchment Sector *</label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-mono text-xs"
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
                    Landmark / Location Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near Chamoli Suspension Bridge"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">
                    People Affected / Trapped (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 4"
                    value={peopleCount}
                    onChange={(e) =>
                      setPeopleCount(e.target.value ? parseInt(e.target.value, 10) : '')
                    }
                    className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 font-mono text-xs"
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
                  <span>People at Risk / Urgently Needed Evacuation</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={roadBlocked}
                    onChange={(e) => setRoadBlocked(e.target.checked)}
                    className="size-4 rounded border-slate-700 bg-slate-900 text-amber-600 focus:ring-0"
                  />
                  <span>Road or Bridge Submerged / Inaccessible</span>
                </label>
              </div>
            </div>

            {/* Reporter Meta & Demo Mode Notice */}
            <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[0.68rem] text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div>
                Source: <strong className="text-white">VOICE (Whisper)</strong> &bull; Reporter:{' '}
                <span className="text-cyan-300">{currentUser.name}</span>
              </div>
              <div className="text-amber-400">
                DEMO MODE: Automated 5-second simulated responder assignment active
              </div>
            </div>

            {/* Submission Action Bar */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setIsReviewing(false)}
                className="rounded border border-slate-700 px-3 py-2 font-mono text-xs text-slate-400 hover:bg-slate-800"
              >
                &larr; Back
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
                  id="submit-voice-report-btn"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded bg-rose-600 px-6 py-2.5 font-mono text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 shadow-xl"
                >
                  <ShieldAlert className="size-4 animate-pulse" />
                  <span>{isSubmitting ? 'Submitting Report...' : 'Submit Report'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
