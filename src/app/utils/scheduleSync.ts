const SCHEDULE_SYNC_STORAGE_KEY = 'frontpin_schedule_sync';
const SCHEDULE_SYNC_CHANNEL = 'frontpin_schedule_sync';

export interface ScheduleSyncDetail {
  scheduleId?: number | string | null;
  employeeId?: number | string | null;
}

/**
 * Broadcasts schedule/employee updates across both the current window and other open browser tabs.
 */
export function notifyScheduleChanged(detail?: ScheduleSyncDetail) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('schedule-updated', { detail }));
  window.dispatchEvent(new CustomEvent('employee-updated', { detail }));

  try {
    localStorage.setItem(
      SCHEDULE_SYNC_STORAGE_KEY,
      JSON.stringify({ ts: Date.now(), detail: detail || null })
    );
  } catch {
    // ignore storage errors
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(SCHEDULE_SYNC_CHANNEL);
      ch.postMessage({ type: 'schedule-updated', detail: detail || null });
      ch.close();
    }
  } catch {
    // ignore BroadcastChannel errors
  }
}

/**
 * Subscribes to schedule updates (custom events, window focus, localStorage cross-tab sync, BroadcastChannel).
 * Returns an unsubscribe cleanup function.
 */
export function subscribeScheduleChanged(onSync: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === SCHEDULE_SYNC_STORAGE_KEY) {
      onSync();
    }
  };

  let channel: BroadcastChannel | null = null;
  const handleChannelMessage = () => {
    onSync();
  };

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(SCHEDULE_SYNC_CHANNEL);
      channel.addEventListener('message', handleChannelMessage);
    }
  } catch {
    channel = null;
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      onSync();
    }
  };

  window.addEventListener('schedule-updated', onSync);
  window.addEventListener('employee-updated', onSync);
  window.addEventListener('focus', onSync);
  window.addEventListener('storage', handleStorage);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    window.removeEventListener('schedule-updated', onSync);
    window.removeEventListener('employee-updated', onSync);
    window.removeEventListener('focus', onSync);
    window.removeEventListener('storage', handleStorage);
    document.removeEventListener('visibilitychange', handleVisibility);
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
      channel.close();
    }
  };
}
