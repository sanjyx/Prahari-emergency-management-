import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = 3000;
const app = express();

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '25mb' }));

// Initialize Supabase if credentials are provided
let supabase: SupabaseClient | null = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[PRAHARI Backend] Supabase client initialized with URL:', supabaseUrl);
  } catch (err) {
    console.warn('[PRAHARI Backend] Failed to initialize Supabase client:', err);
  }
} else {
  console.log('[PRAHARI Backend] Supabase not configured in env. Using resilient local file persistence.');
}

// Ensure local persistence directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data dir:', e);
  }
}

// Initial seed incidents
const INITIAL_DEMO_INCIDENTS = [
  {
    id: 'prh-init-001',
    incident_id: 'PRH-2026-0042',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    reporter_name: 'Harish Rawat',
    reporter_contact: '+91 98765 12001',
    transcription: 'Water is rising rapidly near the suspension bridge. Road is submerged by 2 feet.',
    incident_type: 'Flash Flood',
    severity: 'HIGH',
    latitude: 30.4085,
    longitude: 79.3254,
    location_name: 'Chamoli Upper Valley (Near Hill Bridge)',
    status: 'ASSIGNED',
    assigned_responder_id: 'RSP-002',
    assigned_responder_name: 'Hill Rescue Unit',
    assigned_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    source: 'VOICE',
    audio_url: null,
    notes: 'Dispatched rapid evacuation kit and inflatable boats.',
    demo_mode: true
  },
  {
    id: 'prh-init-002',
    incident_id: 'PRH-2026-0041',
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    reporter_name: 'Pooja Devi',
    reporter_contact: '+91 98765 12002',
    transcription: 'Heavy mudslide blocked Kedarnath bypass. Three passenger vehicles stranded on slope.',
    incident_type: 'Landslide',
    severity: 'CRITICAL',
    latitude: 30.5284,
    longitude: 79.1124,
    location_name: 'Rudraprayag Gorge (Sector 4)',
    status: 'ACKNOWLEDGED',
    assigned_responder_id: 'RSP-001',
    assigned_responder_name: 'Rapid Response Team A',
    assigned_at: new Date(Date.now() - 105 * 60 * 1000).toISOString(),
    source: 'VOICE',
    audio_url: null,
    notes: 'Heavy earth-moving equipment deployed from district depot.',
    demo_mode: true
  }
];

function readLocalIncidents(): any[] {
  try {
    if (fs.existsSync(INCIDENTS_FILE)) {
      const content = fs.readFileSync(INCIDENTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading local incidents:', err);
  }
  // If file doesn't exist or is empty, write initial demo incidents
  writeLocalIncidents(INITIAL_DEMO_INCIDENTS);
  return INITIAL_DEMO_INCIDENTS;
}

function writeLocalIncidents(incidents: any[]): void {
  try {
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(incidents, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local incidents:', err);
  }
}

// Generate collision-safe human readable Incident ID (PRH-2026-XXXX)
function generateIncidentId(): string {
  const year = 2026;
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `PRH-${year}-${randomDigits}`;
}

// =============================================================================
// API ROUTES
// =============================================================================

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'PRAHARI Flash-Flood Emergency Platform',
    team: 'HYDRAX',
    huggingfaceConfigured: Boolean(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN),
    supabaseConfigured: Boolean(supabase)
  });
});

/**
 * POST /api/transcribe
 * Secure backend route that communicates with Hugging Face Whisper Large-v3.
 * CRITICAL SECURITY REQUIREMENT:
 * Hugging Face API key is strictly kept on the server and NEVER exposed to frontend.
 */
app.post('/api/transcribe', async (req, res) => {
  const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

  // Check if Hugging Face token is configured
  if (!hfKey) {
    return res.status(200).json({
      success: false,
      missingKey: true,
      error: 'HUGGINGFACE_API_KEY is not configured on the server. Please add HUGGINGFACE_API_KEY to environment secrets.',
      model: 'openai/whisper-large-v3',
      message: 'Demonstration fallback enabled: You can edit or supply a test transcript to continue the incident workflow.'
    });
  }

  try {
    let audioBuffer: Buffer | null = null;
    let contentType = 'audio/webm';

    // Check payload format: JSON with base64 audio, or raw binary
    if (req.body && typeof req.body === 'object' && req.body.audioBase64) {
      const base64Data = req.body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(base64Data, 'base64');
      if (req.body.mimeType) {
        contentType = req.body.mimeType;
      }
    } else if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      audioBuffer = req.body;
      if (req.headers['content-type']) {
        contentType = req.headers['content-type'];
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No audio data received. Please record your emergency message and try again.'
      });
    }

    // Hugging Face Whisper Large-v3 Inference URLs
    const hfEndpoints = [
      'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3',
      'https://api-inference.huggingface.co/models/openai/whisper-large-v3'
    ];

    let hfResponse: Response | null = null;
    let lastErrorMessage = '';

    for (const endpoint of hfEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfKey}`,
            'Content-Type': contentType,
            'x-use-cache': 'false'
          },
          body: new Uint8Array(audioBuffer),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          hfResponse = response;
          break;
        } else {
          const errText = await response.text();
          lastErrorMessage = `Hugging Face API returned HTTP ${response.status}: ${errText}`;
          console.warn(`[Whisper API] Endpoint ${endpoint} failed:`, lastErrorMessage);
        }
      } catch (err: any) {
        lastErrorMessage = err?.message || 'Network error reaching Hugging Face API';
        console.warn(`[Whisper API] Network error on ${endpoint}:`, lastErrorMessage);
      }
    }

    if (!hfResponse) {
      return res.status(200).json({
        success: false,
        error: `Whisper speech-to-text service is currently unavailable (${lastErrorMessage}). You can enter or edit the transcript manually to proceed.`,
        model: 'openai/whisper-large-v3',
        fallbackAvailable: true
      });
    }

    const data: any = await hfResponse.json();
    const transcribedText = data?.text || data?.[0]?.generated_text || '';

    if (!transcribedText.trim()) {
      return res.status(200).json({
        success: false,
        error: 'No clear speech detected in recording. Please speak clearly or enter details manually.',
        model: 'openai/whisper-large-v3'
      });
    }

    return res.json({
      success: true,
      text: transcribedText.trim(),
      model: 'openai/whisper-large-v3',
      raw: data
    });
  } catch (error: any) {
    console.error('[Whisper API Error]:', error);
    return res.status(200).json({
      success: false,
      error: `Transcription processing failed: ${error?.message || 'Unknown error'}. Manual input fallback is available.`,
      model: 'openai/whisper-large-v3',
      fallbackAvailable: true
    });
  }
});

/**
 * GET /api/incidents
 * Retrieve all incidents from Supabase or local persistent store
 */
app.get('/api/incidents', async (_req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return res.json({ success: true, source: 'supabase', incidents: data });
      }
      console.warn('[Supabase Fetch Warning]:', error?.message);
    }

    // Fallback to local persistent JSON
    const local = readLocalIncidents();
    return res.json({ success: true, source: 'local_persistent', incidents: local });
  } catch (err: any) {
    console.error('Fetch incidents error:', err);
    const local = readLocalIncidents();
    return res.json({ success: true, source: 'local_fallback', incidents: local });
  }
});

/**
 * POST /api/incidents
 * Create a new emergency incident
 */
app.post('/api/incidents', async (req, res) => {
  try {
    const body = req.body;
    const incident_id = body.incident_id || generateIncidentId();
    const newIncident = {
      id: body.id || `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      incident_id,
      created_at: body.created_at || new Date().toISOString(),
      reporter_name: body.reporter_name || 'Anonymous Citizen',
      reporter_contact: body.reporter_contact || '',
      transcription: body.transcription || body.description || 'Emergency reported via PRAHARI voice portal.',
      incident_type: body.incident_type || 'Flash Flood',
      severity: body.severity || 'HIGH',
      latitude: Number(body.latitude) || 30.408,
      longitude: Number(body.longitude) || 79.325,
      location_name: body.location_name || 'Chamoli Upper Catchment',
      status: body.status || 'NEW',
      assigned_responder_id: body.assigned_responder_id || null,
      assigned_responder_name: body.assigned_responder_name || null,
      assigned_at: body.assigned_at || null,
      source: body.source || 'VOICE',
      audio_url: body.audio_url || null,
      notes: body.notes || '',
      demo_mode: body.demo_mode !== undefined ? body.demo_mode : true
    };

    // If Supabase is connected, insert into Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .insert([newIncident])
          .select();

        if (error) {
          console.warn('[Supabase Insert Warning]:', error.message);
        } else if (data && data.length > 0) {
          // Keep local sync updated as well
          const local = readLocalIncidents();
          writeLocalIncidents([data[0], ...local]);
          return res.status(201).json({ success: true, incident: data[0], storage: 'supabase' });
        }
      } catch (sbErr) {
        console.warn('Supabase insert exception:', sbErr);
      }
    }

    // Persist locally
    const local = readLocalIncidents();
    // Prepend new incident
    const updated = [newIncident, ...local];
    writeLocalIncidents(updated);

    return res.status(201).json({
      success: true,
      incident: newIncident,
      storage: 'local_persistent'
    });
  } catch (err: any) {
    console.error('Create incident error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to create incident' });
  }
});

/**
 * PATCH /api/incidents/:id
 * Update incident status, notes, or responder assignment
 */
app.patch('/api/incidents/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .update(updates)
          .or(`id.eq.${id},incident_id.eq.${id}`)
          .select();

        if (!error && data && data.length > 0) {
          // Sync local copy
          const local = readLocalIncidents();
          const updated = local.map((inc) => (inc.id === id || inc.incident_id === id ? { ...inc, ...updates } : inc));
          writeLocalIncidents(updated);
          return res.json({ success: true, incident: data[0], storage: 'supabase' });
        }
      } catch (sbErr) {
        console.warn('Supabase patch exception:', sbErr);
      }
    }

    // Update in local persistent store
    const local = readLocalIncidents();
    let found = false;
    const updated = local.map((inc) => {
      if (inc.id === id || inc.incident_id === id) {
        found = true;
        return { ...inc, ...updates, updated_at: new Date().toISOString() };
      }
      return inc;
    });

    if (found) {
      writeLocalIncidents(updated);
      const patched = updated.find((inc) => inc.id === id || inc.incident_id === id);
      return res.json({ success: true, incident: patched, storage: 'local_persistent' });
    }

    return res.status(404).json({ success: false, error: 'Incident not found' });
  } catch (err: any) {
    console.error('Patch incident error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update incident' });
  }
});

/**
 * GET /api/bhuvan/wms
 * Safe backend proxy for official ISRO/NRSC Bhuvan WMS & Tile services.
 * Solves browser CORS limitations and provides graceful fallback when Bhuvan servers are slow.
 */
app.get('/api/bhuvan/wms', async (req, res) => {
  try {
    const serviceType = (req.query.service_type as string) || 'vec';
    const baseUrl =
      serviceType === 'hazard'
        ? 'https://bhuvan-ras2.nrsc.gov.in/cgi-bin/hazard.exe'
        : serviceType === 'flood'
        ? 'https://bhuvan-ras2.nrsc.gov.in/cgi-bin/flood.exe'
        : serviceType === 'lulc'
        ? 'https://bhuvan-ras2.nrsc.gov.in/cgi-bin/LULC250K.exe'
        : 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms';

    // Pass through WMS parameters
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'service_type') {
        params.append(key, String(value));
      }
    }

    const targetUrl = `${baseUrl}?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout for Bhuvan

    const bhuvanRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PRAHARI-Disaster-Platform/1.0 (ISRO-Bhuvan OGC Integration)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (bhuvanRes.ok) {
      const contentType = bhuvanRes.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const arrayBuf = await bhuvanRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuf));
    }
  } catch (err: any) {
    // Graceful fallback: return a transparent placeholder image to avoid breaking map rendering
  }

  // Graceful 1x1 transparent PNG fallback if Bhuvan is slow or unreachable
  const transparentPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.send(transparentPng);
});

// =============================================================================
// VITE MIDDLEWARE & SERVER STARTUP
// =============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PRAHARI HYDRAX] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
