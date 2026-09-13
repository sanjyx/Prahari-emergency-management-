/**
 * PRAHARI Feature Toggle System
 * 
 * Central configuration to enable or disable platform capabilities.
 * Modifying any flag here safely enables or disables the feature throughout
 * the UI, services, and navigation without breaking unrelated modules.
 * 
 * Teammates can override flags locally via localStorage:
 * localStorage.setItem('PRAHARI_FEATURE_<NAME>', 'true' | 'false')
 */

export interface FeatureFlags {
  /** AI-powered tactical situation summary & briefing on dashboard */
  aiSituationSummary: boolean;
  /** Hands-free voice emergency reporting using Web Speech API */
  voiceReporting: boolean;
  /** Low-bandwidth & offline sync mode with queueing */
  lowConnectivity: boolean;
  /** A* multi-factor slope & hazard evacuation routing */
  aStarRouting: boolean;
  /** Last Known Location (LKL) responder GPS telemetry */
  lastKnownLocation: boolean;
  /** Rescue team tracking & dispatch coordination */
  rescueTracking: boolean;
  /** Interactive topographic disaster risk canvas layer */
  disasterRiskLayer: boolean;
  /** Citizen field reporting & incident creation */
  citizenReporting: boolean;
  /** Real-time watershed IoT sensor telemetry */
  sensorMonitoring: boolean;
  /** Broadcast emergency alerts & notification dispatch */
  publicAlerts: boolean;
}

/**
 * Default feature toggle settings.
 * All features are enabled by default for full hackathon demonstration.
 */
export const DEFAULT_FEATURES: FeatureFlags = {
  aiSituationSummary: true,
  voiceReporting: true,
  lowConnectivity: true,
  aStarRouting: true,
  lastKnownLocation: true,
  rescueTracking: true,
  disasterRiskLayer: true,
  citizenReporting: true,
  sensorMonitoring: true,
  publicAlerts: true,
};

/**
 * Checks if a feature is enabled.
 * Supports localStorage override for convenient local development and testing.
 */
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
  try {
    const override = localStorage.getItem(`PRAHARI_FEATURE_${featureName}`);
    if (override !== null) {
      return override === 'true';
    }
  } catch (e) {
    // LocalStorage unavailable (e.g. sandbox or incognito)
  }
  return DEFAULT_FEATURES[featureName] ?? false;
}

/**
 * Programmatically toggle a feature (persisted in localStorage).
 */
export function setFeatureOverride(featureName: keyof FeatureFlags, enabled: boolean): void {
  try {
    localStorage.setItem(`PRAHARI_FEATURE_${featureName}`, String(enabled));
  } catch (e) {
    console.warn('Could not persist feature flag override:', e);
  }
}

/**
 * Reset all feature overrides to default values.
 */
export function resetFeatureOverrides(): void {
  try {
    Object.keys(DEFAULT_FEATURES).forEach((key) => {
      localStorage.removeItem(`PRAHARI_FEATURE_${key}`);
    });
  } catch (e) {
    console.warn('Could not clear feature flag overrides:', e);
  }
}

export const FEATURES = DEFAULT_FEATURES;
