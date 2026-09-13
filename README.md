# PRAHARI (प्रहरी) — Hilly Emergency & Disaster Management Platform

> **Autonomous Real-Time Flash Flood, Landslide & Evacuation Intelligence for Mountainous Terrains**  
> Designed for Smart India Hackathon (SIH) & High-Altitude Disaster Response Authorities (SDMA / NDRF / DDMA).

[![Platform Status](https://img.shields.io/badge/System-Operational-emerald?style=flat-square)](https://github.com/sanjyx/prahari-emergency-management)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan?style=flat-square)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.1-sky?style=flat-square)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

---

## 🏔️ Overview

**PRAHARI** (The Guardian) is a disaster management command operating system engineered specifically for the extreme conditions of high-altitude Himalayan watersheds (e.g., Alaknanda, Bhagirathi, Mandakini, and Teesta river basins). Mountainous terrains face compounded disaster hazards: sudden cloudburst flash floods, glacial lake outburst floods (GLOF), catastrophic landslides severing single-artery mountain transit corridors, and complete loss of cellular connectivity.

PRAHARI connects field citizens, tactical first responders (NDRF, SDRF, ITBP), and district disaster management authorities (DDMA) with real-time sensor telemetry, risk modeling, hands-free voice incident reporting, and multi-factor evacuation pathfinding.

---

## ⚡ Core Features & Capabilities

### 1. 🤖 AI Disaster Situation Summary (Executive Briefing)
- **Autonomous Telemetry Synthesis**: Aggregates live incident reports, IoT sensor water levels, rainfall anomalies, and road corridor closures into an actionable command briefing.
- **Strict Data Verification**: Clear distinction between ground-verified telemetry and AI-synthesized tactical insights.
- **Urgent Action Spotlight**: Pinpoints the single highest-priority incident with direct one-click routing to the dispatch console and A* evacuation calculator.
- **Safe High-Ground Shelter Status**: Guides evacuation coordinators to open high-altitude shelters with available bed capacity in the most critical catchment sector.
- **Tactical Directives**: Categorized by `URGENT`, `HIGH`, and `ADVISORY` priorities.

### 2. 🎙️ Voice Emergency Reporting (Web Speech NLP)
- **Browser-Native Web Speech API**: Hands-free voice reporting for citizens in distress or responders operating in rain, mist, and gloves.
- **Deterministic Natural Language Extraction**:
  - Automatically classifies hazard type (`flash_flood`, `landslide`, `bridge_damage`, `road_block`, `trapped_civilians`).
  - Infers severity level (`critical`, `high`, `moderate`, `low`).
  - Identifies catchment sectors, road kilometer markers, and landmark references.
  - Detects trapped victims and impassable road blockages.
- **Device GPS Geolocation**: Captures real-time device coordinates to pin incident locations.
- **Human-in-the-Loop Review**: Allows reviewing and modifying the extracted fields before dispatching.

### 3. 🗺️ High-Altitude Topographic & Risk Map
- **Interactive Multi-Layer Map**: Real-time canvas rendering mountain topography with contour elevations, watershed boundaries, and river flows.
- **Dynamic Risk Overlays**: Heatmap highlighting low, moderate, high, and critical hazard zones.
- **Live Corridor Status**: Visualizes clear, compromised, and impassable mountain transit routes.
- **Responder Telemetry & Incident Markers**: Visualizes active responder units and emergency markers with interactive detail popovers.

### 4. 🧮 Multi-Factor A* Emergency Evacuation Routing
- **Mountain Terrain Cost Function**: Incorporates distance, slope gradient penalties, water surge velocity, and road blockage avoidance into pathfinding.
- **Alternative Safe Route Generation**: Computes the optimal evacuation route from high-risk valleys to designated high-ground emergency shelters.

### 5. 📡 Low-Connectivity & Offline Sync Engine
- **Local-First Architecture**: When cloud or cellular networks drop in mountain valleys, incidents and status updates are queued in persistent offline storage.
- **Intelligent FIFO Resync**: Automatically drains the offline queue in FIFO sequence with conflict resolution once connectivity is restored.
- **Bandwidth Modes**:
  - `Normal`: Real-time cloud sync and polling.
  - `Low Connectivity`: Compressed payload transmission and deferred heavy asset downloads.
  - `Offline Mesh Simulation`: Fully local persistence with zero network dependencies.

### 6. 👥 Multi-Role Workflow (RBAC)
- **Citizen**: Quick emergency reporting (voice or text), evacuation route viewing, and urgent public alerts.
- **Field Responder**: Incident status updates, GPS field check-ins, tactical A* route calculation, and victim rescue logging.
- **Authority / Dispatcher**: Incident triage, responder dispatching, broadcast alert dissemination, and AI situation review.

---

## 🏗️ Modular Architecture & Team Workflow

PRAHARI is structured so multiple teammates can develop, add, remove, enable, or disable features independently without breaking the rest of the application.

```
src/
├── components/          # Shared atomic and layout UI components
│   ├── ErrorBoundary.tsx
│   ├── FeatureSettingsModal.tsx
│   └── Header.tsx
├── features/            # Self-contained feature modules
│   ├── ai-situation-summary/
│   ├── alerts/
│   ├── incidents/
│   ├── locations/
│   ├── offline-mode/
│   ├── risk-analysis/
│   ├── routing/
│   ├── sensors/
│   └── voice-reporting/
├── services/            # Isolated data access & external services
│   ├── alertService.ts
│   ├── incidentService.ts
│   ├── locationService.ts
│   ├── userService.ts
│   ├── aiAssistant.ts
│   ├── aStarRouting.ts
│   └── offlineSync.ts
├── config/              # Central configuration & feature toggles
│   └── features.ts
├── data/                # Geographic models, catchment nodes & edges
│   └── zones.ts
└── types.ts             # Strongly-typed domain models & interfaces
```

### Feature Toggle System
Every capability is centrally registered in `src/config/features.ts`. Teammates can toggle features on or off in real-time via the in-app **Features** button in the header or programmatically via `isFeatureEnabled('featureName')`.

Disabling any feature triggers its documented safe fallback without crashing:
- **AI Summary Disabled** ➔ Dashboard displays deterministic incident tallies.
- **Voice Reporting Disabled** ➔ Standard manual incident reporting remains operational.
- **A* Routing Disabled** ➔ Topographic map functions without route overlay.
- **Offline Sync Disabled** ➔ System functions in standard direct-online mode.

---

## 🛠️ Technology Stack

- **Frontend Framework**: React 19, TypeScript 5.8, Vite 6
- **Styling & Theme**: Tailwind CSS v4, Lucide React Icons
- **Hardware & Web APIs**: Web Speech API (`SpeechRecognition`), Geolocation API, Web Storage API
- **Pathfinding & Modeling**: Custom Multi-Factor A* Graph Routing, Catchment Vulnerability Scoring
- **Data Persistence**: Firebase Firestore / Persistent Local Store with Offline FIFO Queue
- **Deployment**: Google Cloud Run / Static SPA Hosting (Vercel, Netlify, Firebase Hosting)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/sanjyx/prahari-emergency-management.git
cd prahari-emergency-management

# 2. Install dependencies
npm install

# 3. Start local development server (runs on port 3000)
npm run dev

# 4. Open in browser
# http://localhost:3000
```

### Production Build & Linting
```bash
# Validate TypeScript syntax and types
npm run lint

# Build production bundle in dist/
npm run build

# Preview production build locally
npm run preview
```

---

## 🔒 Security & Credentials Policy

- **No Secrets in Source**: No API keys, passwords, or Firebase service-account private keys are hardcoded in the codebase.
- **Environment Template**: All required configuration keys are documented in `.env.example`.
- **Git Ignore**: Secrets, environment files (`.env`, `.env.*`), build artifacts (`dist/`), and credential files are strictly excluded via `.gitignore`.

---

## 👥 Team Collaboration

Refer to [CONTRIBUTING.md](CONTRIBUTING.md) for the branching strategy, pull request guidelines, and instructions on how to create a new isolated feature.  
Refer to [FEATURES.md](FEATURES.md) for technical documentation on all modular features.
