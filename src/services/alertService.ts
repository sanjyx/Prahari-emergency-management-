/**
 * Alert Service
 * 
 * Provides an isolated service layer for subscribing to and broadcasting
 * emergency catchment warnings and public disaster advisories.
 */

import { AlertItem, Unsubscribe } from '../types';
import { persistentStore } from './firebaseService';

export const alertService = {
  /**
   * Subscribe to live public alerts
   */
  subscribeAlerts(callback: (alerts: AlertItem[]) => void): Unsubscribe {
    try {
      return persistentStore.subscribeAlerts(callback);
    } catch (err) {
      console.error('alertService.subscribeAlerts failed:', err);
      callback([]);
      return () => {};
    }
  },

  /**
   * Create and broadcast a new emergency alert
   */
  async createAlert(
    alertData: Omit<AlertItem, 'id' | 'issuedAt'>
  ): Promise<AlertItem> {
    try {
      return await persistentStore.createAlert(alertData);
    } catch (err) {
      console.error('alertService.createAlert failed:', err);
      throw err;
    }
  }
};
