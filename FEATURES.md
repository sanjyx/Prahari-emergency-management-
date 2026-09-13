# PRAHARI — Modular Features Directory

This document provides a technical overview of each modular feature in PRAHARI, including its toggle key in `src/config/features.ts`, component files, service dependencies, and safe fallback behavior.

---

## 📋 Feature Summary Matrix

| # | Feature Name | Toggle Key | Default | Primary Files | Fallback Behavior When Disabled |
|---|--------------|------------|---------|---------------|----------------------------------|
| 1 | AI Situation Summary | `aiSituationSummary` | `true` | `src/features/ai-situation-summary/`, `SituationSummaryPanel.tsx`, `aiAssistant.ts` | Replaced by deterministic incident counts & stats snapshot card |
| 2 | Voice Emergency Reporting | `voiceReporting` | `true` | `src/features/voice-reporting/`, `VoiceReportModal.tsx` | Voice buttons hidden; manual report modal remains 100% operational |
| 3 | Low-Connectivity & Offline Sync | `lowConnectivity` | `true` | `src/features/offline-mode/`, `ConnectivityModal.tsx`, `offlineSync.ts` | Operates directly in standard online mode without local queuing |
| 4 | A* Evacuation Routing | `aStarRouting` | `true` | `src/features/routing/`, `AStarRoutingView.tsx`, `aStarRouting.ts` | Routing tab hidden; topographic map displays standard terrain |
| 5 | Last Known Location (LKL) | `lastKnownLocation` | `true` | `src/features/locations/`, `locationService.ts` | GPS share button hidden; default sector centroid coordinates used |
| 6 | Rescue Team Telemetry | `rescueTracking` | `true` | `src/features/locations/`, `ResponderLocationView.tsx` | Responders tab hidden from public navigation |
| 7 | Disaster Risk Map Layer | `disasterRiskLayer` | `true` | `src/features/risk-analysis/`, `RiskMapView.tsx` | Visual canvas map hidden; tabular catchment risk scores available |
| 8 | Citizen Incident Reporting | `citizenReporting` | `true` | `src/features/incidents/`, `IncidentManagementView.tsx`, `incidentService.ts` | Incident tab hidden from public navigation |
| 9 | Live Watershed Sensors | `sensorMonitoring` | `true` | `src/features/sensors/`, `LiveSensorsView.tsx` | Sensors tab hidden from navigation |
| 10 | Public Warnings & Alerts | `publicAlerts` | `true` | `src/features/alerts/`, `AlertsView.tsx`, `alertService.ts` | Alerts tab hidden from navigation |

---

## 🔍 Detailed Feature Specifications

### 1. AI Disaster Situation Summary
- **Purpose**: Generates an autonomous, data-grounded tactical situation report and actionable commander briefing from live watershed telemetry and emergency reports.
- **Key Files**:
  - `src/features/ai-situation-summary/index.ts`
  - `src/components/SituationSummaryPanel.tsx`
  - `src/services/aiAssistant.ts` (`generateSituationSummary`)
- **Inputs**: Active incidents, active public alerts, monitored catchment zones, first responder units.
- **Outputs**: Executive summary, urgent action highlight, high-ground shelter readiness, tactical recommendations list (`URGENT`, `HIGH`, `ADVISORY`).
- **Safe Fallback**: When `isFeatureEnabled('aiSituationSummary')` is `false`, the dashboard renders a clean deterministic statistical snapshot displaying verified incident tallies and severity metrics.

### 2. Voice Emergency Reporting
- **Purpose**: Enables hands-free incident reporting using the browser-native Web Speech API (`SpeechRecognition`), extracting hazard type, severity, location landmark, road blockages, and trapped individuals via deterministic NLP rules.
- **Key Files**:
  - `src/features/voice-reporting/index.ts`
  - `src/components/VoiceReportModal.tsx`
  - `src/services/aiAssistant.ts` (`parseVoiceEmergencyReport`)
- **Inputs**: Microphone audio stream or simulated speech transcript, user device GPS position.
- **Outputs**: Pre-populated incident report with review interface before final submission.
- **Safe Fallback**: When disabled, all voice buttons are cleanly hidden. The manual "Report New Incident" form operates independently with zero voice dependencies.

### 3. Low-Connectivity & Offline Sync Engine
- **Purpose**: Ensures uninterrupted disaster management in mountainous valleys where cell networks fail. Queues user operations locally in browser storage and drains the queue in FIFO order upon network recovery.
- **Key Files**:
  - `src/features/offline-mode/index.ts`
  - `src/components/ConnectivityModal.tsx`
  - `src/services/offlineSync.ts`
- **Network Modes**: `online` (standard real-time), `low_connectivity` (compressed payloads), `offline` (local storage only).
- **Safe Fallback**: When disabled, mutations write directly to the persistent store or backend without local queueing.

### 4. Multi-Factor A* Emergency Evacuation Routing
- **Purpose**: Graph-based pathfinding engine tailored for steep mountain terrain. Applies penalizing weights for slope steepness, river discharge velocity, and verified road closures to compute safe routes to high-ground shelters.
- **Key Files**:
  - `src/features/routing/index.ts`
  - `src/components/AStarRoutingView.tsx`
  - `src/services/aStarRouting.ts` (`findAStarEmergencyRoute`)
- **Inputs**: Origin node ID, destination node ID, terrain node graph, edge connectivity, catchment risk levels, road blockage set.
- **Outputs**: Step-by-step path coordinates, total distance (km), estimated trek time (min), risk score, and terrain difficulty assessment.
- **Safe Fallback**: When disabled, navigation to the routing view is disabled, and the standard map renders without path overlays.

### 5. Last Known Location (LKL) Telemetry
- **Purpose**: Tracks field responder and citizen device coordinates using the W3C Geolocation API. Formats coordinates with altitude and accuracy metadata, calculating staleness intervals (e.g. "3m ago").
- **Key Files**:
  - `src/features/locations/index.ts`
  - `src/services/locationService.ts`
- **Safe Fallback**: When disabled or denied permission, PRAHARI falls back to estimated sector centroid coordinates without failing.

### 6. Rescue Team Telemetry & Field Coordination
- **Purpose**: Visualizes active rescue teams (SDRF, NDRF, ITBP) across mountain sectors, displaying unit radio callsigns, assignment status, and GPS telemetry.
- **Key Files**:
  - `src/features/locations/index.ts`
  - `src/components/ResponderLocationView.tsx`
- **Safe Fallback**: When disabled, the Responders tab is hidden from navigation.

### 7. Interactive Topographic Risk Map
- **Purpose**: Canvas-based interactive visualization of mountain topography, catchment polygons, dynamic risk heatmaps, active incidents, and road corridors.
- **Key Files**:
  - `src/features/risk-analysis/index.ts`
  - `src/components/RiskMapView.tsx`
- **Safe Fallback**: When disabled, the Risk Map tab is hidden from navigation; risk assessments remain accessible via the Risk Analysis table.

### 8. Citizen Incident Management & Dispatch
- **Purpose**: End-to-end incident lifecycle: citizen reporting, authority triage, severity classification, and first-responder dispatching.
- **Key Files**:
  - `src/features/incidents/index.ts`
  - `src/components/IncidentManagementView.tsx`
  - `src/services/incidentService.ts`
- **Safe Fallback**: When disabled, incident reporting tabs and buttons are hidden.

### 9. Live Watershed Sensors
- **Purpose**: Real-time IoT monitoring of ultrasonic water level sensors, tipping-bucket rain gauges, and soil saturation instruments across 6 mountain catchments.
- **Key Files**:
  - `src/features/sensors/index.ts`
  - `src/components/LiveSensorsView.tsx`
- **Safe Fallback**: When disabled, the Live Sensors tab is hidden from navigation.

### 10. Public Warnings & Broadcast Alerts
- **Purpose**: Dissemination of emergency advisories, evacuation orders, and siren triggers to citizens and field teams via simulated broadcast channels.
- **Key Files**:
  - `src/features/alerts/index.ts`
  - `src/components/AlertsView.tsx`
  - `src/services/alertService.ts`
- **Safe Fallback**: When disabled, the Alerts tab is hidden from navigation.
