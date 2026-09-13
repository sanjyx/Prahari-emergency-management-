/**
 * Location Service
 * 
 * Provides an isolated service layer for responder tracking, GPS check-ins,
 * and Last Known Location (LKL) telemetry in mountainous terrain.
 */

import { LastKnownLocation, Unsubscribe, UserProfile } from '../types';
import { persistentStore } from './firebaseService';

export const locationService = {
  /**
   * Subscribe to live first responder locations
   */
  subscribeResponders(callback: (responders: UserProfile[]) => void): Unsubscribe {
    try {
      return persistentStore.subscribeResponders(callback);
    } catch (err) {
      console.error('locationService.subscribeResponders failed:', err);
      callback([]);
      return () => {};
    }
  },

  /**
   * Broadcast current user's Last Known Location (LKL) to command center
   */
  async updateLastKnownLocation(location: LastKnownLocation): Promise<void> {
    try {
      await persistentStore.updateLastKnownLocation(location);
    } catch (err) {
      console.error('locationService.updateLastKnownLocation failed:', err);
      throw err;
    }
  },

  /**
   * Request device GPS coordinates via native browser Geolocation API
   */
  async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        ...options
      });
    });
  }
};
