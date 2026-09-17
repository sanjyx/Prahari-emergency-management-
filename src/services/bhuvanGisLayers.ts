/**
 * ISRO / NRSC Bhuvan Geospatial Services & Layer Architecture
 * Team: HYDRAX
 * 
 * Official Documentation:
 * https://bhuvan.nrsc.gov.in/wiki/index.php/How_to_use_WMS_services
 * https://bhuvan-app1.nrsc.gov.in/api/
 * 
 * Complies strictly with ISRO/NRSC Bhuvan usage terms:
 * - Direct OGC WMS / WMTS endpoints & backend proxy (/api/bhuvan/wms)
 * - Official documented service URLs (flood.exe, hazard.exe, LULC250K.exe, bhuvan-vec2/wms)
 * - Mandatory attribution: "Map/data: ISRO/NRSC Bhuvan"
 * - Clear legal distinction: BHUVAN / ISRO-NRSC DATA LAYER vs. PRAHARI DEMO RISK DATA
 */

export interface MapLayerConfig {
  id: string;
  name: string;
  category: 'prahari_operational' | 'bhuvan_thematic' | 'base_map';
  description: string;
  source: 'PRAHARI DEMO RISK DATA' | 'BHUVAN / ISRO-NRSC DATA LAYER' | 'Open Source Cartography';
  attribution?: string;
  ogcServiceUrl?: string;
  wmsServiceType?: 'hazard' | 'flood' | 'lulc' | 'vec';
  wmsLayerName?: string;
  enabled: boolean;
  opacity: number; // 0.0 to 1.0
  scale?: string;
  datum?: string;
  legendInfo?: {
    label: string;
    color: string;
  }[];
}

export const BHUVAN_LEGAL_ATTRIBUTION = 'Map/data: ISRO/NRSC Bhuvan (https://bhuvan.nrsc.gov.in)';

export const INITIAL_MAP_LAYERS: MapLayerConfig[] = [
  // 1. PRAHARI Operational Layers
  {
    id: 'prahari_risk',
    name: 'PRAHARI Risk Layer (Catchment Contours)',
    category: 'prahari_operational',
    description: 'Dynamic flash-flood hazard score polygons (0.40×Rain + 0.25×Soil + 0.25×River + 0.10×Slope)',
    source: 'PRAHARI DEMO RISK DATA',
    enabled: true,
    opacity: 0.85,
    legendInfo: [
      { label: 'Low (0–34)', color: '#10b981' },
      { label: 'Moderate (35–54)', color: '#f59e0b' },
      { label: 'High (55–74)', color: '#f97316' },
      { label: 'Critical (75–100)', color: '#ef4444' }
    ]
  },
  {
    id: 'prahari_incidents',
    name: 'PRAHARI Incident Reports',
    category: 'prahari_operational',
    description: 'Real-time verified citizen and Hugging Face Whisper voice emergency incident markers',
    source: 'PRAHARI DEMO RISK DATA',
    enabled: true,
    opacity: 1.0,
    legendInfo: [
      { label: 'Critical / Stranded', color: '#ef4444' },
      { label: 'Flash Flood / Road Block', color: '#f97316' },
      { label: 'Monitoring / Moderate', color: '#eab308' }
    ]
  },
  {
    id: 'prahari_shelters',
    name: 'PRAHARI Safe Locations & Shelters',
    category: 'prahari_operational',
    description: 'Designated high-ground relief centers, medical outposts, and emergency staging shelters',
    source: 'PRAHARI DEMO RISK DATA',
    enabled: true,
    opacity: 1.0,
    legendInfo: [
      { label: 'Designated High Ground', color: '#10b981' }
    ]
  },
  {
    id: 'prahari_responders',
    name: 'PRAHARI Active Responders (Telemetry)',
    category: 'prahari_operational',
    description: 'Live field positioning of Quick Reaction Teams (SDRF, NDRF, ITBP Alpine Units)',
    source: 'PRAHARI DEMO RISK DATA',
    enabled: true,
    opacity: 1.0
  },

  // 2. ISRO / NRSC Bhuvan Thematic Layers
  {
    id: 'bhuvan_flood_hazard',
    name: 'Bhuvan Flood Hazard Zonation (1:250k)',
    category: 'bhuvan_thematic',
    description: 'Official NRSC flood hazard zonation derived from satellite observations during historic flood events (1998–2007)',
    source: 'BHUVAN / ISRO-NRSC DATA LAYER',
    attribution: BHUVAN_LEGAL_ATTRIBUTION,
    ogcServiceUrl: 'https://bhuvan-ras2.nrsc.gov.in/cgi-bin/hazard.exe',
    wmsServiceType: 'hazard',
    wmsLayerName: 'flood_hazard',
    scale: '1:250,000',
    datum: 'WGS84 / EPSG:4326',
    enabled: true,
    opacity: 0.65,
    legendInfo: [
      { label: 'Very High Hazard Zone', color: '#7f1d1d' },
      { label: 'High Hazard Zone', color: '#b91c1c' },
      { label: 'Moderate Hazard Zone', color: '#c2410c' },
      { label: 'Low Inundation Risk', color: '#0369a1' }
    ]
  },
  {
    id: 'bhuvan_flood_annual',
    name: 'Bhuvan Annual Flood Inundation Layer',
    category: 'bhuvan_thematic',
    description: 'Official NRSC annual flood inundation frequency layer covering 1999–2010 observations',
    source: 'BHUVAN / ISRO-NRSC DATA LAYER',
    attribution: BHUVAN_LEGAL_ATTRIBUTION,
    ogcServiceUrl: 'https://bhuvan-ras2.nrsc.gov.in/cgi-bin/flood.exe',
    wmsServiceType: 'flood',
    wmsLayerName: 'annual_flood',
    scale: '1:250,000',
    datum: 'WGS84 / EPSG:4326',
    enabled: false,
    opacity: 0.6,
    legendInfo: [
      { label: 'Recurrent Inundation (>6 yrs)', color: '#312e81' },
      { label: 'Frequent (3–5 yrs)', color: '#1d4ed8' },
      { label: 'Occasional (1–2 yrs)', color: '#38bdf8' }
    ]
  },
  {
    id: 'bhuvan_lulc',
    name: 'Bhuvan Land Use / Land Cover (LULC 250K)',
    category: 'bhuvan_thematic',
    description: 'NRSC 1:250k National Land Use & Land Cover classification (Forest, Built-up, Barren slope)',
    source: 'BHUVAN / ISRO-NRSC DATA LAYER',
    attribution: BHUVAN_LEGAL_ATTRIBUTION,
    ogcServiceUrl: 'https://bhuvan-ras2.nrsc.gov.in/cgi-bin/LULC250K.exe',
    wmsServiceType: 'lulc',
    wmsLayerName: 'lulc_250k',
    scale: '1:250,000',
    datum: 'WGS84 / EPSG:4326',
    enabled: false,
    opacity: 0.5,
    legendInfo: [
      { label: 'Himalayan Ridge / Alpine Meadow', color: '#065f46' },
      { label: 'Steep Escarpment / Scree', color: '#78716c' },
      { label: 'Settlement & Valley Terraces', color: '#a16207' }
    ]
  },
  {
    id: 'bhuvan_water_bodies',
    name: 'Bhuvan Water Bodies & Himalayan Drainage',
    category: 'bhuvan_thematic',
    description: 'ISRO-NRSC vector drainage network covering Alaknanda, Bhagirathi, Mandakini & Teesta river basins',
    source: 'BHUVAN / ISRO-NRSC DATA LAYER',
    attribution: BHUVAN_LEGAL_ATTRIBUTION,
    ogcServiceUrl: 'https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms',
    wmsServiceType: 'vec',
    wmsLayerName: 'water_bodies',
    datum: 'WGS84 / EPSG:4326',
    enabled: true,
    opacity: 0.75,
    legendInfo: [
      { label: 'Primary Gorge Trunk River', color: '#0284c7' },
      { label: 'Tributary Streams & Nullahs', color: '#38bdf8' },
      { label: 'Glacial Lakes & Catchment Basins', color: '#67e8f9' }
    ]
  },

  // 3. Base Map Layers
  {
    id: 'bhuvan_satellite',
    name: 'Bhuvan Satellite / Terrain Imagery Base',
    category: 'base_map',
    description: 'ISRO Bhuvan multispectral satellite base map providing true terrain context',
    source: 'BHUVAN / ISRO-NRSC DATA LAYER',
    attribution: BHUVAN_LEGAL_ATTRIBUTION,
    ogcServiceUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    wmsServiceType: 'vec',
    wmsLayerName: 'india3',
    enabled: true,
    opacity: 0.8
  },
  {
    id: 'standard_topo',
    name: 'Standard Topographic Map (Vector)',
    category: 'base_map',
    description: 'Standard elevation contour lines, ridgelines, and tactical emergency grid',
    source: 'Open Source Cartography',
    enabled: true,
    opacity: 0.95
  }
];

/**
 * Builds safe Bhuvan WMS GetMap proxy URL with OGC-compliant parameters
 */
export function buildBhuvanProxyUrl(layer: MapLayerConfig, bbox: [number, number, number, number], width = 800, height = 500): string {
  const [minX, minY, maxX, maxY] = bbox;
  const params = new URLSearchParams({
    service_type: layer.wmsServiceType || 'vec',
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: layer.wmsLayerName || 'india3',
    STYLES: '',
    SRS: 'EPSG:4326',
    BBOX: `${minX},${minY},${maxX},${maxY}`,
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: 'image/png',
    TRANSPARENT: 'TRUE'
  });

  return `/api/bhuvan/wms?${params.toString()}`;
}
