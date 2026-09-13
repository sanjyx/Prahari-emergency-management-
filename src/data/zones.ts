import { AlertItem, HistoryPoint, Incident, RiskLevel, RiskResult, RouteEdge, RouteNode, SensorNode, Zone } from '../types';

export const clamp = (val: number, min = 0, max = 100): number => Math.min(max, Math.max(min, val));

export const ZONES: Zone[] = [
  {
    id: 'chamoli',
    name: 'Chamoli Upper Valley',
    district: 'Chamoli',
    state: 'Uttarakhand',
    elevationM: 1420,
    slopePct: 78,
    baseRainfallMm: 62,
    baseSoilMoisture: 71,
    baseRiverLevel: 3.1,
    riverDangerLevel: 5.0,
    population: 18400,
    x: 26,
    y: 30,
    shelters: [
      {
        name: 'Govt. Inter College Ridge Block',
        capacity: 1200,
        distanceKm: 1.8,
        elevationM: 1560,
        route: 'Ridge Road → College Gate (uphill, metalled)'
      },
      {
        name: 'Community Hall, Upper Bazaar',
        capacity: 600,
        distanceKm: 3.2,
        elevationM: 1495,
        route: 'Bazaar Link Road → Hall Ground'
      }
    ]
  },
  {
    id: 'teesta',
    name: 'Teesta Gorge Belt',
    district: 'Mangan',
    state: 'Sikkim',
    elevationM: 980,
    slopePct: 84,
    baseRainfallMm: 88,
    baseSoilMoisture: 79,
    baseRiverLevel: 4.0,
    riverDangerLevel: 5.5,
    population: 9700,
    x: 63,
    y: 22,
    shelters: [
      {
        name: 'Monastery Relief Shelter',
        capacity: 450,
        distanceKm: 2.4,
        elevationM: 1120,
        route: 'Gorge Path → Monastery Steps (foot access)'
      },
      {
        name: 'District Sports Complex',
        capacity: 900,
        distanceKm: 5.1,
        elevationM: 1050,
        route: 'NH Bypass → Complex Gate 2'
      }
    ]
  },
  {
    id: 'kullu',
    name: 'Kullu Slope Sector',
    district: 'Kullu',
    state: 'Himachal Pradesh',
    elevationM: 1210,
    slopePct: 66,
    baseRainfallMm: 41,
    baseSoilMoisture: 58,
    baseRiverLevel: 2.4,
    riverDangerLevel: 4.6,
    population: 24300,
    x: 15,
    y: 58,
    shelters: [
      {
        name: 'Panchayat Bhawan Highground',
        capacity: 700,
        distanceKm: 1.2,
        elevationM: 1305,
        route: 'Village Road → Panchayat Yard'
      },
      {
        name: 'Higher Secondary School',
        capacity: 1500,
        distanceKm: 4.0,
        elevationM: 1270,
        route: 'Main Slope Road → School Field'
      }
    ]
  },
  {
    id: 'wayanad',
    name: 'Wayanad Ghat Ridge',
    district: 'Wayanad',
    state: 'Kerala',
    elevationM: 860,
    slopePct: 59,
    baseRainfallMm: 74,
    baseSoilMoisture: 83,
    baseRiverLevel: 2.9,
    riverDangerLevel: 4.2,
    population: 31200,
    x: 45,
    y: 74,
    shelters: [
      {
        name: "Estate Workers' Hall",
        capacity: 800,
        distanceKm: 2.0,
        elevationM: 940,
        route: 'Estate Track → Hall Compound'
      },
      {
        name: 'Taluk Relief Camp Ground',
        capacity: 2000,
        distanceKm: 6.3,
        elevationM: 905,
        route: 'Ghat Road → Camp Entry A'
      }
    ]
  },
  {
    id: 'tawang',
    name: 'Tawang Stream Basin',
    district: 'Tawang',
    state: 'Arunachal Pradesh',
    elevationM: 2210,
    slopePct: 71,
    baseRainfallMm: 33,
    baseSoilMoisture: 46,
    baseRiverLevel: 1.7,
    riverDangerLevel: 3.8,
    population: 6100,
    x: 80,
    y: 46,
    shelters: [
      {
        name: 'Circuit House Plateau',
        capacity: 300,
        distanceKm: 1.5,
        elevationM: 2290,
        route: 'Plateau Road → Circuit House'
      },
      {
        name: 'Zonal Health Centre',
        capacity: 250,
        distanceKm: 3.7,
        elevationM: 2255,
        route: 'Basin Link → Health Centre'
      }
    ]
  },
  {
    id: 'darjeeling',
    name: 'Darjeeling Tea Slopes',
    district: 'Darjeeling',
    state: 'West Bengal',
    elevationM: 1650,
    slopePct: 74,
    baseRainfallMm: 55,
    baseSoilMoisture: 68,
    baseRiverLevel: 2.2,
    riverDangerLevel: 4.0,
    population: 15800,
    x: 57,
    y: 54,
    shelters: [
      {
        name: 'Tea Board Godown Shelter',
        capacity: 500,
        distanceKm: 2.7,
        elevationM: 1720,
        route: 'Garden Cart Road → Godown Yard'
      },
      {
        name: 'Municipal Town Hall',
        capacity: 1100,
        distanceKm: 4.5,
        elevationM: 1690,
        route: 'Hill Cart Road → Town Hall'
      }
    ]
  }
];

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'Critical';
  if (score >= 55) return 'High';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

export function calculateRisk(zone: Zone, multiplier: number): RiskResult {
  const rainfall = Math.round(zone.baseRainfallMm * multiplier);
  const soilMoisture = clamp(Math.round(zone.baseSoilMoisture + (multiplier - 1) * 22), 5, 100);
  const riverLevel = Math.round((zone.baseRiverLevel + (multiplier - 1) * 1.9) * 10) / 10;

  const rainIndex = clamp((rainfall / 180) * 100);
  const soilIndex = clamp(soilMoisture);
  const riverIndex = clamp((riverLevel / zone.riverDangerLevel) * 100);
  const slopeIndex = clamp(zone.slopePct);

  const factors = [
    {
      key: 'rain',
      label: 'Rainfall intensity (24h)',
      weight: 0.4,
      raw: `${rainfall} mm`,
      index: Math.round(rainIndex),
      contribution: 0.4 * rainIndex,
      note:
        rainIndex > 70
          ? 'Very heavy simulated rain over a short window — the main driver of flash flooding.'
          : rainIndex > 40
          ? 'Moderate to heavy simulated rain; streams respond quickly in steep terrain.'
          : 'Light simulated rain; limited runoff expected.'
    },
    {
      key: 'soil',
      label: 'Soil moisture saturation',
      weight: 0.25,
      raw: `${soilMoisture}%`,
      index: Math.round(soilIndex),
      contribution: 0.25 * soilIndex,
      note:
        soilIndex > 75
          ? 'Ground is close to saturated, so almost all new rain becomes surface runoff.'
          : soilIndex > 50
          ? 'Ground can still absorb some rain, but the buffer is shrinking.'
          : 'Dry ground is absorbing most of the rainfall.'
    },
    {
      key: 'river',
      label: 'River / stream level',
      weight: 0.25,
      raw: `${riverLevel.toFixed(1)} m of ${zone.riverDangerLevel.toFixed(1)} m danger mark`,
      index: Math.round(riverIndex),
      contribution: 0.25 * riverIndex,
      note:
        riverIndex > 85
          ? 'Channel is near or above the danger mark — low capacity left for a surge.'
          : riverIndex > 55
          ? 'Level is rising toward the danger mark.'
          : 'Channel has comfortable spare capacity.'
    },
    {
      key: 'slope',
      label: 'Terrain slope factor',
      weight: 0.1,
      raw: `${zone.slopePct}% steepness`,
      index: Math.round(slopeIndex),
      contribution: 0.1 * slopeIndex,
      note:
        slopeIndex > 70
          ? 'Very steep catchment — water concentrates downstream within minutes.'
          : 'Moderate slope; runoff reaches the valley more gradually.'
    }
  ];

  const score = Math.round(factors.reduce((acc, f) => acc + f.contribution, 0));
  const leadTimeMin = Math.max(12, Math.round(150 - score * 1.2 - zone.slopePct * 0.4));

  return {
    score,
    level: getRiskLevel(score),
    factors,
    rainfall,
    soilMoisture,
    riverLevel,
    leadTimeMin
  };
}

export const RISK_LEVELS: Record<
  RiskLevel,
  {
    color: string;
    text: string;
    chip: string;
    ring: string;
    action: string;
    banner: string;
  }
> = {
  Low: {
    color: '#10b981',
    text: 'text-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    ring: 'border-emerald-500/50',
    action: 'Normal activity. Keep monitoring the simulated feed and confirm that community alert contacts are up to date.',
    banner: 'No flash-flood signal in this simulated scenario.'
  },
  Moderate: {
    color: '#f59e0b',
    text: 'text-amber-400',
    chip: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    ring: 'border-amber-500/50',
    action: 'Advisory posture. Brief local volunteers, check shelter readiness and avoid overnight camping near stream beds.',
    banner: 'Watch conditions — simulated indicators are trending upward.'
  },
  High: {
    color: '#f97316',
    text: 'text-orange-400',
    chip: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
    ring: 'border-orange-500/50',
    action: 'Prepare to move. Alert vulnerable households, clear stream banks and pre-position transport toward the nearest safe zone.',
    banner: 'Warning — simulated flash-flood conditions are developing.'
  },
  Critical: {
    color: '#ef4444',
    text: 'text-rose-400',
    chip: 'bg-rose-500/15 text-rose-400 border-rose-500/60',
    ring: 'border-rose-500/60',
    action: 'Immediate evacuation posture in this scenario. Move people from low-lying banks to the nearest higher-ground shelter and stop all stream crossings.',
    banner: 'Critical — simulated flash-flood impact expected in this scenario.'
  }
};

export function generateSensors(zone: Zone, result: RiskResult): SensorNode[] {
  const seed = zone.id.charCodeAt(0);
  const genSpark = (base: number, variance: number) =>
    Array.from({ length: 12 }, (_, i) =>
      Math.max(0, Math.round(base * (0.6 + i / 18) + Math.sin((i + seed) * 1.3) * variance))
    );

  return [
    {
      id: `RG-${zone.id.slice(0, 3).toUpperCase()}-01`,
      label: `${zone.name} — upper catchment`,
      type: 'Rain gauge',
      value: `${result.rainfall} mm / 24h`,
      status: 'Online',
      battery: 88,
      lastPing: '12 s ago',
      spark: genSpark(result.rainfall, 6)
    },
    {
      id: `SP-${zone.id.slice(0, 3).toUpperCase()}-04`,
      label: 'Hillside soil probe, 30 cm depth',
      type: 'Soil probe',
      value: `${result.soilMoisture}% saturation`,
      status: result.soilMoisture > 90 ? 'Degraded' : 'Online',
      battery: 64,
      lastPing: '38 s ago',
      spark: genSpark(result.soilMoisture, 4)
    },
    {
      id: `WL-${zone.id.slice(0, 3).toUpperCase()}-02`,
      label: 'Gorge stream level radar gauge',
      type: 'Radar gauge',
      value: `${result.riverLevel.toFixed(1)} m`,
      status: 'Online',
      battery: 92,
      lastPing: '5 s ago',
      spark: genSpark(Math.round(result.riverLevel * 10), 3)
    },
    {
      id: `EX-${zone.id.slice(0, 3).toUpperCase()}-09`,
      label: 'Slope tilt & crack displacement sensor',
      type: 'Extensometer',
      value: `${(zone.slopePct * 0.08 + (result.score > 60 ? 1.4 : 0.2)).toFixed(2)} mm/h`,
      status: result.score > 70 ? 'Degraded' : 'Online',
      battery: 79,
      lastPing: '24 s ago',
      spark: genSpark(15, 5)
    },
    {
      id: `AQ-${zone.id.slice(0, 3).toUpperCase()}-11`,
      label: 'Ridge weather & barometric station',
      type: 'Barometer / Anemometer',
      value: `${Math.round(1013 - (result.score / 100) * 18)} hPa · ${Math.round(14 + (result.score / 100) * 28)} km/h`,
      status: 'Online',
      battery: 95,
      lastPing: '8 s ago',
      spark: genSpark(25, 4)
    },
    {
      id: `GW-${zone.id.slice(0, 3).toUpperCase()}-17`,
      label: 'Basin pore-pressure piezo sensor',
      type: 'Piezometer',
      value: `${(result.soilMoisture * 0.35 + 12).toFixed(1)} kPa`,
      status: result.score > 80 ? 'Offline' : 'Online',
      battery: 41,
      lastPing: result.score > 80 ? '14 min ago' : '52 s ago',
      spark: genSpark(30, 7)
    }
  ];
}

export function generateHistoricalReplay(zone: Zone, result: RiskResult): HistoryPoint[] {
  const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  const seed = zone.id.charCodeAt(0) % 5;
  return hours.map((hour, idx) => {
    const progress = idx / (hours.length - 1);
    const rainCurve = Math.sin((progress + seed * 0.1) * Math.PI);
    const rain = Math.max(5, Math.round(result.rainfall * (0.3 + rainCurve * 0.7)));
    const s = clamp(Math.round(result.score * (0.4 + rainCurve * 0.65)));
    return {
      hour,
      rainfall: rain,
      score: s
    };
  });
}

export const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'ALT-2026-0122',
    zoneId: 'chamoli',
    zone: 'Chamoli Upper Valley',
    level: 'High',
    issued: '12 Sep 2026, 14:30',
    channel: 'SMS Broadcast + Siren Array',
    message: 'Pre-evacuation advisory: avoid stream crossings during the morning rain window.',
    status: 'Active'
  },
  {
    id: 'ALT-2026-0121',
    zoneId: 'teesta',
    zone: 'Teesta Gorge Belt',
    level: 'Critical',
    issued: '12 Sep 2026, 11:15',
    channel: 'All Emergency Channels',
    message: 'Cloudburst detected upstream of Mangan gorge. Flash flood surge expected within 25 minutes.',
    status: 'Active'
  },
  {
    id: 'ALT-2026-0120',
    zoneId: 'wayanad',
    zone: 'Wayanad Ghat Ridge',
    level: 'Moderate',
    issued: '11 Sep 2026, 17:40',
    channel: 'Civil Defense Radio + App',
    message: 'Soil saturation warning for tea estate slopes. Restrict heavy vehicle movement on ghat routes.',
    status: 'Acknowledged'
  },
  {
    id: 'ALT-2026-0119',
    zoneId: 'chamoli',
    zone: 'Chamoli Upper Valley',
    level: 'Low',
    issued: '05 Sep 2026, 09:12',
    channel: 'Dashboard only',
    message: 'Simulated all-clear logged after rainfall eased in the upper catchment.',
    status: 'Acknowledged'
  }
];

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-801',
    title: 'Severe Mudslide Blocking Ridge Access Road',
    type: 'landslide',
    severity: 'high',
    status: 'assigned',
    description: 'Approx 300m stretch of ridge access road blocked by boulder-mud mixture near km 14 marker. Two utility vehicles stranded uphill.',
    zoneId: 'chamoli',
    zoneName: 'Chamoli Upper Valley',
    location: {
      lat: 30.421,
      lng: 79.338,
      landmark: 'KM 14 Ridge Road Post',
      mapX: 29,
      mapY: 34
    },
    reportedBy: {
      uid: 'cit-001',
      name: 'Rameshwar Rawat',
      role: 'citizen',
      contact: '+91 94112 01822'
    },
    assignedTo: {
      uid: 'resp-001',
      name: 'Capt. Vikram Negi',
      unit: 'SDRF Quick Response Unit 3',
      phone: '+91 98765 43210',
      assignedAt: Date.now() - 3600000
    },
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 3600000,
    aiTriageSummary: 'High priority landslide obstructing vital evacuation corridor. Heavy excavator and earthmover dispatch required.'
  },
  {
    id: 'INC-2026-802',
    title: 'Teesta Gorge Footbridge Railing Washed Out',
    type: 'bridge_damage',
    severity: 'critical',
    status: 'in_progress',
    description: 'Rapid surge in Teesta river has submerged the pedestrian suspension bridge lower anchors. Immediate barricading in progress.',
    zoneId: 'teesta',
    zoneName: 'Teesta Gorge Belt',
    location: {
      lat: 27.502,
      lng: 88.528,
      landmark: 'Old Footbridge South Tower',
      mapX: 62,
      mapY: 26
    },
    reportedBy: {
      uid: 'cit-002',
      name: 'Tashi Lepcha',
      role: 'citizen',
      contact: '+91 97330 89110'
    },
    assignedTo: {
      uid: 'resp-002',
      name: 'Sub-Inspector Anita Sharma',
      unit: 'Mangan Civil Defense Squad',
      phone: '+91 98111 22334',
      assignedAt: Date.now() - 1800000
    },
    createdAt: Date.now() - 5400000,
    updatedAt: Date.now() - 1800000,
    aiTriageSummary: 'Critical structural compromise. Bridge must be completely isolated from civilian transit; redirect traffic to NH Bypass.'
  },
  {
    id: 'INC-2026-803',
    title: 'Elderly Household Isolated by Overflowing Stream',
    type: 'trapped_civilians',
    severity: 'high',
    status: 'reported',
    description: 'Local seasonal culvert overflowed by 1.2m of fast water. 4 elderly residents unable to cross to higher ground shelter.',
    zoneId: 'kullu',
    zoneName: 'Kullu Slope Sector',
    location: {
      lat: 31.957,
      lng: 77.109,
      landmark: 'Near Lower Orchard Bend',
      mapX: 18,
      mapY: 62
    },
    reportedBy: {
      uid: 'cit-003',
      name: 'Sunil Thakur',
      role: 'citizen',
      contact: '+91 98052 77144'
    },
    createdAt: Date.now() - 2400000,
    updatedAt: Date.now() - 2400000,
    aiTriageSummary: 'Evacuation assistance required. Rope-rigged river rescue kit and 4x4 ambulance needed.'
  }
];

export const INITIAL_RESPONDERS = [
  {
    uid: 'resp-001',
    name: 'Capt. Vikram Negi',
    email: 'vikram.negi@sdrf.gov.in',
    role: 'responder' as const,
    unit: 'SDRF Quick Response Unit 3 (Chamoli)',
    phone: '+91 98765 43210',
    lastKnownLocation: {
      lat: 30.408,
      lng: 79.325,
      timestamp: Date.now() - 300000,
      accuracy: 12,
      source: 'gps' as const,
      zoneId: 'chamoli',
      zoneName: 'Chamoli Upper Valley'
    },
    isOnline: true
  },
  {
    uid: 'resp-002',
    name: 'Sub-Inspector Anita Sharma',
    email: 'anita.sharma@police.sk.gov.in',
    role: 'responder' as const,
    unit: 'Mangan Civil Defense Squad',
    phone: '+91 98111 22334',
    lastKnownLocation: {
      lat: 27.515,
      lng: 88.541,
      timestamp: Date.now() - 600000,
      accuracy: 18,
      source: 'gps' as const,
      zoneId: 'teesta',
      zoneName: 'Teesta Gorge Belt'
    },
    isOnline: true
  },
  {
    uid: 'resp-003',
    name: 'Havildar Rajesh Kumar',
    email: 'rajesh.kumar@ndrf.gov.in',
    role: 'responder' as const,
    unit: 'NDRF 14th Battalion Hilly Team',
    phone: '+91 94191 55678',
    lastKnownLocation: {
      lat: 31.965,
      lng: 77.118,
      timestamp: Date.now() - 900000,
      accuracy: 25,
      source: 'cached' as const,
      zoneId: 'kullu',
      zoneName: 'Kullu Slope Sector'
    },
    isOnline: false
  }
];

// Topological Graph for A* Emergency Routing
export const ROUTE_NODES: RouteNode[] = [
  { id: 'node_chamoli_base', name: 'Chamoli Valley Base (HQ)', x: 26, y: 30, elevationM: 1420, type: 'zone', zoneId: 'chamoli' },
  { id: 'node_chamoli_junc_a', name: 'Alaknanda Confluence Post', x: 23, y: 25, elevationM: 1380, type: 'junction', zoneId: 'chamoli' },
  { id: 'node_chamoli_bridge', name: 'Birehi Suspension Bridge', x: 29, y: 26, elevationM: 1410, type: 'bridge', zoneId: 'chamoli' },
  { id: 'node_chamoli_shelter1', name: 'Govt. Inter College Ridge Block', x: 28, y: 20, elevationM: 1560, type: 'shelter', zoneId: 'chamoli' },
  { id: 'node_chamoli_shelter2', name: 'Community Hall, Upper Bazaar', x: 33, y: 32, elevationM: 1495, type: 'shelter', zoneId: 'chamoli' },
  { id: 'node_chamoli_checkpoint', name: 'Ridge Checkpoint Alpha', x: 21, y: 35, elevationM: 1460, type: 'checkpoint', zoneId: 'chamoli' },

  { id: 'node_teesta_base', name: 'Teesta Gorge Central (HQ)', x: 63, y: 22, elevationM: 980, type: 'zone', zoneId: 'teesta' },
  { id: 'node_teesta_bridge', name: 'Mangan Cable Crossing', x: 67, y: 18, elevationM: 1010, type: 'bridge', zoneId: 'teesta' },
  { id: 'node_teesta_shelter1', name: 'Monastery Relief Shelter', x: 59, y: 16, elevationM: 1120, type: 'shelter', zoneId: 'teesta' },
  { id: 'node_teesta_shelter2', name: 'District Sports Complex', x: 68, y: 28, elevationM: 1050, type: 'shelter', zoneId: 'teesta' },

  { id: 'node_kullu_base', name: 'Kullu Slope Sector (HQ)', x: 15, y: 58, elevationM: 1210, type: 'zone', zoneId: 'kullu' },
  { id: 'node_kullu_shelter1', name: 'Panchayat Bhawan Highground', x: 12, y: 52, elevationM: 1305, type: 'shelter', zoneId: 'kullu' },
  { id: 'node_kullu_shelter2', name: 'Higher Secondary School', x: 22, y: 55, elevationM: 1270, type: 'shelter', zoneId: 'kullu' },

  { id: 'node_wayanad_base', name: 'Wayanad Ghat Ridge (HQ)', x: 45, y: 74, elevationM: 860, type: 'zone', zoneId: 'wayanad' },
  { id: 'node_wayanad_shelter1', name: "Estate Workers' Hall", x: 41, y: 68, elevationM: 940, type: 'shelter', zoneId: 'wayanad' },
  { id: 'node_wayanad_shelter2', name: 'Taluk Relief Camp Ground', x: 51, y: 76, elevationM: 905, type: 'shelter', zoneId: 'wayanad' },

  { id: 'node_tawang_base', name: 'Tawang Stream Basin (HQ)', x: 80, y: 46, elevationM: 2210, type: 'zone', zoneId: 'tawang' },
  { id: 'node_tawang_shelter1', name: 'Circuit House Plateau', x: 83, y: 40, elevationM: 2290, type: 'shelter', zoneId: 'tawang' },

  { id: 'node_darjeeling_base', name: 'Darjeeling Tea Slopes (HQ)', x: 57, y: 54, elevationM: 1650, type: 'zone', zoneId: 'darjeeling' },
  { id: 'node_darjeeling_shelter1', name: 'Tea Board Godown Shelter', x: 53, y: 49, elevationM: 1720, type: 'shelter', zoneId: 'darjeeling' },
  { id: 'node_darjeeling_shelter2', name: 'Municipal Town Hall', x: 62, y: 57, elevationM: 1690, type: 'shelter', zoneId: 'darjeeling' }
];

export const ROUTE_EDGES: RouteEdge[] = [
  // Chamoli cluster
  { from: 'node_chamoli_base', to: 'node_chamoli_junc_a', distanceKm: 2.1, slopePct: 18 },
  { from: 'node_chamoli_base', to: 'node_chamoli_bridge', distanceKm: 1.6, slopePct: 12, isBridge: true, isRiverAdjacent: true },
  { from: 'node_chamoli_base', to: 'node_chamoli_checkpoint', distanceKm: 2.4, slopePct: 22 },
  { from: 'node_chamoli_junc_a', to: 'node_chamoli_shelter1', distanceKm: 2.8, slopePct: 25 },
  { from: 'node_chamoli_bridge', to: 'node_chamoli_shelter1', distanceKm: 1.8, slopePct: 35 },
  { from: 'node_chamoli_bridge', to: 'node_chamoli_shelter2', distanceKm: 2.2, slopePct: 15 },
  { from: 'node_chamoli_checkpoint', to: 'node_chamoli_shelter2', distanceKm: 3.5, slopePct: 14 },
  
  // Cross corridor (inter-zone emergency transit)
  { from: 'node_chamoli_checkpoint', to: 'node_kullu_shelter2', distanceKm: 8.2, slopePct: 16 },
  { from: 'node_kullu_base', to: 'node_kullu_shelter1', distanceKm: 1.2, slopePct: 28 },
  { from: 'node_kullu_base', to: 'node_kullu_shelter2', distanceKm: 4.0, slopePct: 15 },
  { from: 'node_kullu_shelter1', to: 'node_kullu_shelter2', distanceKm: 3.1, slopePct: 19 },

  // Teesta cluster
  { from: 'node_teesta_base', to: 'node_teesta_bridge', distanceKm: 1.9, slopePct: 14, isBridge: true, isRiverAdjacent: true },
  { from: 'node_teesta_base', to: 'node_teesta_shelter1', distanceKm: 2.4, slopePct: 32 },
  { from: 'node_teesta_bridge', to: 'node_teesta_shelter2', distanceKm: 3.8, slopePct: 18 },
  { from: 'node_teesta_shelter1', to: 'node_teesta_bridge', distanceKm: 2.6, slopePct: 20 },

  // Wayanad cluster
  { from: 'node_wayanad_base', to: 'node_wayanad_shelter1', distanceKm: 2.0, slopePct: 22 },
  { from: 'node_wayanad_base', to: 'node_wayanad_shelter2', distanceKm: 6.3, slopePct: 12, isRiverAdjacent: true },
  { from: 'node_wayanad_shelter1', to: 'node_wayanad_shelter2', distanceKm: 4.5, slopePct: 18 },

  // Tawang cluster
  { from: 'node_tawang_base', to: 'node_tawang_shelter1', distanceKm: 1.5, slopePct: 24 },

  // Darjeeling cluster
  { from: 'node_darjeeling_base', to: 'node_darjeeling_shelter1', distanceKm: 2.7, slopePct: 22 },
  { from: 'node_darjeeling_base', to: 'node_darjeeling_shelter2', distanceKm: 4.5, slopePct: 14 },
  { from: 'node_darjeeling_shelter1', to: 'node_teesta_shelter1', distanceKm: 9.4, slopePct: 26 }
];
