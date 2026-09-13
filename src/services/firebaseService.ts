import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import { getAuth, Auth, onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { AlertItem, Incident, IncidentStatus, LastKnownLocation, UserProfile, UserRole } from '../types';
import { INITIAL_ALERTS, INITIAL_INCIDENTS, INITIAL_RESPONDERS } from '../data/zones';
import { offlineSyncManager } from './offlineSync';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let isRealFirebase = false;

// Attempt to load Firebase config if provided
try {
  // Check if firebase-applet-config.json exists or config is in env
  const config = (window as any).__FIREBASE_CONFIG__;
  if (config && config.projectId) {
    firebaseApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
    firestoreDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);
    isRealFirebase = true;
    console.log('Firebase initialized with project:', config.projectId);
  }
} catch (e) {
  console.warn('Real Firebase not active, using resilient local/offline store with Firestore interface.', e);
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth?.currentUser?.uid || null,
      email: firebaseAuth?.currentUser?.email || null,
      emailVerified: firebaseAuth?.currentUser?.emailVerified || null,
      isAnonymous: firebaseAuth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// In-memory / cached repository for seamless offline/local operations
class PersistentStore {
  private incidents: Incident[] = [];
  private alerts: AlertItem[] = [];
  private responders: UserProfile[] = [];
  private currentUser: UserProfile = {
    uid: 'resp-001',
    name: 'Capt. Vikram Negi',
    email: 'vikram.negi@sdrf.gov.in',
    role: 'responder',
    unit: 'SDRF Quick Response Unit 3 (Chamoli)',
    phone: '+91 98765 43210',
    lastKnownLocation: {
      lat: 30.408,
      lng: 79.325,
      timestamp: Date.now() - 300000,
      accuracy: 12,
      source: 'gps',
      zoneId: 'chamoli',
      zoneName: 'Chamoli Upper Valley'
    },
    isOnline: true
  };

  private incidentListeners = new Set<(incidents: Incident[]) => void>();
  private alertListeners = new Set<(alerts: AlertItem[]) => void>();
  private responderListeners = new Set<(responders: UserProfile[]) => void>();
  private userListeners = new Set<(user: UserProfile) => void>();

  constructor() {
    this.initData();
  }

  private initData() {
    // Load from local storage cache if available
    const cachedIncidents = offlineSyncManager.getCachedEntity<Incident[]>('incidents');
    this.incidents = cachedIncidents || [...INITIAL_INCIDENTS];

    const cachedAlerts = offlineSyncManager.getCachedEntity<AlertItem[]>('alerts');
    this.alerts = cachedAlerts || [...INITIAL_ALERTS];

    const cachedResponders = offlineSyncManager.getCachedEntity<UserProfile[]>('responders');
    this.responders = (cachedResponders as any) || [...INITIAL_RESPONDERS];
  }

  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public setCurrentUserRole(role: UserRole) {
    if (role === 'citizen') {
      this.currentUser = {
        uid: 'cit-001',
        name: 'Rameshwar Rawat',
        email: 'rameshwar.rawat@citizen.in',
        role: 'citizen',
        phone: '+91 94112 01822',
        lastKnownLocation: {
          lat: 30.415,
          lng: 79.332,
          timestamp: Date.now() - 120000,
          accuracy: 20,
          source: 'gps',
          zoneId: 'chamoli',
          zoneName: 'Chamoli Upper Valley'
        },
        isOnline: true
      };
    } else if (role === 'responder') {
      this.currentUser = {
        uid: 'resp-001',
        name: 'Capt. Vikram Negi',
        email: 'vikram.negi@sdrf.gov.in',
        role: 'responder',
        unit: 'SDRF Quick Response Unit 3 (Chamoli)',
        phone: '+91 98765 43210',
        lastKnownLocation: {
          lat: 30.408,
          lng: 79.325,
          timestamp: Date.now() - 300000,
          accuracy: 12,
          source: 'gps',
          zoneId: 'chamoli',
          zoneName: 'Chamoli Upper Valley'
        },
        isOnline: true
      };
    } else if (role === 'authority') {
      this.currentUser = {
        uid: 'auth-001',
        name: 'Dr. Meenakshi Sundaram, IAS',
        email: 'dm.chamoli@gov.in',
        role: 'authority',
        unit: 'District Disaster Management Authority (DDMA)',
        phone: '+91 1372 252101',
        isOnline: true
      };
    } else {
      this.currentUser = {
        uid: 'admin-001',
        name: 'State Command Admin',
        email: 'rasmitanayak7803@gmail.com',
        role: 'admin',
        unit: 'SDMA IT & Emergency Systems Control',
        phone: '+91 135 2710334',
        isOnline: true
      };
    }
    this.notifyUser();
  }

  public subscribeIncidents(callback: (incidents: Incident[]) => void): Unsubscribe {
    this.incidentListeners.add(callback);
    callback(this.incidents);

    if (isRealFirebase && firestoreDb) {
      try {
        const unsub = onSnapshot(
          collection(firestoreDb, 'incidents'),
          (snapshot) => {
            const list: Incident[] = [];
            snapshot.forEach((doc) => list.push(doc.data() as Incident));
            if (list.length > 0) {
              this.incidents = list;
              this.notifyIncidents();
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'incidents')
        );
        return () => {
          this.incidentListeners.delete(callback);
          unsub();
        };
      } catch (e) {
        console.warn('Using local incidents stream', e);
      }
    }

    return () => this.incidentListeners.delete(callback);
  }

  public subscribeAlerts(callback: (alerts: AlertItem[]) => void): Unsubscribe {
    this.alertListeners.add(callback);
    callback(this.alerts);
    return () => this.alertListeners.delete(callback);
  }

  public subscribeResponders(callback: (responders: UserProfile[]) => void): Unsubscribe {
    this.responderListeners.add(callback);
    callback(this.responders);
    return () => this.responderListeners.delete(callback);
  }

  public subscribeUser(callback: (user: UserProfile) => void): Unsubscribe {
    this.userListeners.add(callback);
    callback(this.currentUser);
    return () => this.userListeners.delete(callback);
  }

  private notifyIncidents() {
    offlineSyncManager.cacheEntity('incidents', this.incidents);
    for (const cb of this.incidentListeners) cb([...this.incidents]);
  }

  private notifyAlerts() {
    offlineSyncManager.cacheEntity('alerts', this.alerts);
    for (const cb of this.alertListeners) cb([...this.alerts]);
  }

  private notifyResponders() {
    offlineSyncManager.cacheEntity('responders', this.responders);
    for (const cb of this.responderListeners) cb([...this.responders]);
  }

  private notifyUser() {
    for (const cb of this.userListeners) cb({ ...this.currentUser });
  }

  public async createIncident(incidentData: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<Incident> {
    const newIncident: Incident = {
      ...incidentData,
      id: `INC-2026-${Math.floor(800 + Math.random() * 9000)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add locally first for optimistic responsive UI
    this.incidents = [newIncident, ...this.incidents];
    this.notifyIncidents();

    // Check connectivity mode
    if (offlineSyncManager.getMode() !== 'online') {
      newIncident.offlineQueued = true;
      offlineSyncManager.enqueueAction('CREATE_INCIDENT', newIncident);
      return newIncident;
    }

    if (isRealFirebase && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'incidents', newIncident.id), newIncident);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `incidents/${newIncident.id}`);
      }
    }

    return newIncident;
  }

  public async updateIncidentStatus(incidentId: string, status: IncidentStatus, notes?: string): Promise<void> {
    const idx = this.incidents.findIndex((i) => i.id === incidentId);
    if (idx >= 0) {
      const updatedNotes = notes ? [...(this.incidents[idx].notes || []), notes] : this.incidents[idx].notes;
      this.incidents[idx] = {
        ...this.incidents[idx],
        status,
        updatedAt: Date.now(),
        notes: updatedNotes
      };
      this.notifyIncidents();
    }

    if (offlineSyncManager.getMode() !== 'online') {
      offlineSyncManager.enqueueAction('UPDATE_INCIDENT_STATUS', { incidentId, status, notes });
      return;
    }

    if (isRealFirebase && firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'incidents', incidentId), {
          status,
          updatedAt: Date.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `incidents/${incidentId}`);
      }
    }
  }

  public async assignResponder(incidentId: string, responder: { uid: string; name: string; unit?: string; phone?: string }): Promise<void> {
    const idx = this.incidents.findIndex((i) => i.id === incidentId);
    if (idx >= 0) {
      this.incidents[idx] = {
        ...this.incidents[idx],
        status: 'assigned',
        assignedTo: {
          ...responder,
          assignedAt: Date.now()
        },
        updatedAt: Date.now()
      };
      this.notifyIncidents();
    }

    if (offlineSyncManager.getMode() !== 'online') {
      offlineSyncManager.enqueueAction('ASSIGN_RESPONDER', { incidentId, responder });
      return;
    }

    if (isRealFirebase && firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'incidents', incidentId), {
          status: 'assigned',
          assignedTo: { ...responder, assignedAt: Date.now() },
          updatedAt: Date.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `incidents/${incidentId}`);
      }
    }
  }

  public async updateLastKnownLocation(location: LastKnownLocation): Promise<void> {
    this.currentUser = {
      ...this.currentUser,
      lastKnownLocation: location
    };
    this.notifyUser();

    // If user is responder, update responders list
    const respIdx = this.responders.findIndex((r) => r.uid === this.currentUser.uid);
    if (respIdx >= 0) {
      this.responders[respIdx] = {
        ...this.responders[respIdx],
        lastKnownLocation: location
      };
      this.notifyResponders();
    }

    if (offlineSyncManager.getMode() !== 'online') {
      offlineSyncManager.enqueueAction('SHARE_LOCATION', {
        uid: this.currentUser.uid,
        location
      });
      return;
    }

    if (isRealFirebase && firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'users', this.currentUser.uid), {
          lastKnownLocation: location,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${this.currentUser.uid}`);
      }
    }
  }

  public async createAlert(alertData: Omit<AlertItem, 'id' | 'issued'>): Promise<AlertItem> {
    const newAlert: AlertItem = {
      ...alertData,
      id: `ALT-2026-${Math.floor(130 + Math.random() * 800)}`,
      issued: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    this.alerts = [newAlert, ...this.alerts];
    this.notifyAlerts();

    if (isRealFirebase && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'alerts', newAlert.id), newAlert);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `alerts/${newAlert.id}`);
      }
    }

    return newAlert;
  }
}

export const persistentStore = new PersistentStore();
