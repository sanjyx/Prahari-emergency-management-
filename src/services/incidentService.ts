/**
 * Incident Service
 * 
 * Provides an isolated data access layer for creating, querying, updating,
 * and dispatching emergency incidents. UI components interact with this service
 * rather than talking directly to Firestore or offline storage.
 */

import { Incident, IncidentStatus, Unsubscribe } from '../types';
import { persistentStore } from './firebaseService';

export const incidentService = {
  /**
   * Subscribe to live incident feed (Firestore snapshot or persistent local store)
   */
  subscribeIncidents(callback: (incidents: Incident[]) => void): Unsubscribe {
    try {
      return persistentStore.subscribeIncidents(callback);
    } catch (err) {
      console.error('incidentService.subscribeIncidents failed:', err);
      // Fallback empty callback
      callback([]);
      return () => {};
    }
  },

  /**
   * Create a new emergency incident report
   */
  async createIncident(
    incidentData: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Incident> {
    try {
      return await persistentStore.createIncident(incidentData);
    } catch (err) {
      console.error('incidentService.createIncident failed:', err);
      throw err;
    }
  },

  /**
   * Update the status and optional field log notes of an incident
   */
  async updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    notes?: string
  ): Promise<void> {
    try {
      await persistentStore.updateIncidentStatus(incidentId, status, notes);
    } catch (err) {
      console.error('incidentService.updateIncidentStatus failed:', err);
      throw err;
    }
  },

  /**
   * Assign a first responder or unit to an incident
   */
  async assignResponder(
    incidentId: string,
    responder: { uid: string; name: string; unit?: string; phone?: string }
  ): Promise<void> {
    try {
      await persistentStore.assignResponder(incidentId, responder);
    } catch (err) {
      console.error('incidentService.assignResponder failed:', err);
      throw err;
    }
  }
};
