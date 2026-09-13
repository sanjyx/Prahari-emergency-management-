import { NetworkMode, OfflineAction } from '../types';

const QUEUE_STORAGE_KEY = 'prahari_offline_queue_v1';
const CACHED_DATA_KEY = 'prahari_cached_entities_v1';
const NETWORK_OVERRIDE_KEY = 'prahari_network_override';

export type SyncListener = (queue: OfflineAction[], mode: NetworkMode) => void;

class OfflineSyncManager {
  private queue: OfflineAction[] = [];
  private currentMode: NetworkMode = 'online';
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private syncLogs: { id: string; message: string; timestamp: number; success: boolean }[] = [];

  constructor() {
    this.loadQueue();
    this.initNetworkListeners();
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch {
      this.queue = [];
    }
  }

  private persistQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error('Failed to persist offline queue:', e);
    }
    this.notifyListeners();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.queue, this.currentMode);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.queue, this.currentMode);
    }
  }

  private initNetworkListeners() {
    if (typeof window === 'undefined') return;

    // Check manual override first (for demo testing)
    const override = localStorage.getItem(NETWORK_OVERRIDE_KEY);
    if (override === 'offline' || override === 'low_connectivity') {
      this.currentMode = override as NetworkMode;
    } else {
      this.currentMode = navigator.onLine ? 'online' : 'offline';
    }

    window.addEventListener('online', () => {
      const override = localStorage.getItem(NETWORK_OVERRIDE_KEY);
      if (!override || override === 'online') {
        this.setMode('online');
        this.triggerSync();
      }
    });

    window.addEventListener('offline', () => {
      this.setMode('offline');
    });

    // Check effective connection type if supported
    const nav = navigator as any;
    if (nav.connection) {
      const checkConn = () => {
        const override = localStorage.getItem(NETWORK_OVERRIDE_KEY);
        if (!override) {
          const effectiveType = nav.connection.effectiveType;
          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            this.setMode('low_connectivity');
          } else if (navigator.onLine) {
            this.setMode('online');
          }
        }
      };
      nav.connection.addEventListener('change', checkConn);
      checkConn();
    }
  }

  public setMode(mode: NetworkMode, persistOverride = false) {
    this.currentMode = mode;
    if (persistOverride) {
      localStorage.setItem(NETWORK_OVERRIDE_KEY, mode);
    } else if (mode === 'online') {
      localStorage.removeItem(NETWORK_OVERRIDE_KEY);
    }
    this.notifyListeners();

    if (mode === 'online') {
      this.triggerSync();
    }
  }

  public getMode(): NetworkMode {
    return this.currentMode;
  }

  public getQueue(): OfflineAction[] {
    return [...this.queue];
  }

  public getSyncLogs() {
    return [...this.syncLogs];
  }

  public enqueueAction(type: OfflineAction['type'], payload: any): OfflineAction {
    // Generate an idempotent action item
    const action: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Prevent duplicate actions with identical payload intent
    const existingIndex = this.queue.findIndex(
      (item) => item.type === type && JSON.stringify(item.payload?.id || item.payload) === JSON.stringify(payload?.id || payload)
    );

    if (existingIndex >= 0) {
      // Update existing rather than duplicate
      this.queue[existingIndex] = action;
    } else {
      this.queue.push(action);
    }

    this.persistQueue();

    // If online, immediately attempt sync
    if (this.currentMode === 'online') {
      this.triggerSync();
    }

    return action;
  }

  public async triggerSync(syncHandler?: (action: OfflineAction) => Promise<boolean>) {
    if (this.isSyncing || this.queue.length === 0 || this.currentMode === 'offline') {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    const pendingActions = this.queue.filter((a) => a.status === 'pending' || a.status === 'failed');

    for (const action of pendingActions) {
      action.status = 'syncing';
      this.persistQueue();

      try {
        let success = true;
        if (syncHandler) {
          success = await syncHandler(action);
        } else {
          // Simulated sync with slight delay to show progress
          await new Promise((resolve) => setTimeout(resolve, 350));
          success = true;
        }

        if (success) {
          action.status = 'synced';
          this.syncLogs.unshift({
            id: action.id,
            message: `Synced ${action.type.replace(/_/g, ' ')} successfully`,
            timestamp: Date.now(),
            success: true
          });
          // Remove synced action from queue
          this.queue = this.queue.filter((a) => a.id !== action.id);
        } else {
          action.status = 'failed';
          action.error = 'Sync rejected by remote server.';
        }
      } catch (err: any) {
        action.status = 'failed';
        action.error = err?.message || 'Network timeout';
        this.syncLogs.unshift({
          id: action.id,
          message: `Failed ${action.type}: ${action.error}`,
          timestamp: Date.now(),
          success: false
        });
      }
    }

    this.isSyncing = false;
    this.persistQueue();
  }

  // Cache local copy of important collections
  public cacheEntity<T>(key: string, data: T): void {
    try {
      const existingRaw = localStorage.getItem(CACHED_DATA_KEY);
      const store = existingRaw ? JSON.parse(existingRaw) : {};
      store[key] = {
        data,
        updatedAt: Date.now()
      };
      localStorage.setItem(CACHED_DATA_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('Could not cache entity locally:', e);
    }
  }

  public getCachedEntity<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(CACHED_DATA_KEY);
      if (!raw) return null;
      const store = JSON.parse(raw);
      return store[key]?.data || null;
    } catch {
      return null;
    }
  }

  public clearQueue() {
    this.queue = [];
    this.persistQueue();
  }
}

export const offlineSyncManager = new OfflineSyncManager();
