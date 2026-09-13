/**
 * User Service
 * 
 * Provides an isolated service layer for user authentication state,
 * role-based profile switching (Citizen, Responder, Authority, Admin).
 */

import { Unsubscribe, UserProfile, UserRole } from '../types';
import { persistentStore } from './firebaseService';

export const userService = {
  /**
   * Get the current active user profile
   */
  getCurrentUser(): UserProfile {
    try {
      return persistentStore.getCurrentUser();
    } catch (err) {
      console.error('userService.getCurrentUser failed:', err);
      return {
        uid: 'anonymous-guest',
        name: 'Guest Observer',
        email: 'guest@prahari.gov.in',
        role: 'citizen',
        isOnline: true
      };
    }
  },

  /**
   * Subscribe to active user profile changes
   */
  subscribeUser(callback: (user: UserProfile) => void): Unsubscribe {
    try {
      return persistentStore.subscribeUser(callback);
    } catch (err) {
      console.error('userService.subscribeUser failed:', err);
      callback(this.getCurrentUser());
      return () => {};
    }
  },

  /**
   * Switch the active role profile (Citizen / Responder / Authority / Admin)
   */
  setCurrentUserRole(role: UserRole): void {
    try {
      persistentStore.setCurrentUserRole(role);
    } catch (err) {
      console.error('userService.setCurrentUserRole failed:', err);
    }
  }
};
