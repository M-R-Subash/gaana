/**
 * Mobile-specific utility helpers for Screen WakeLock and Tactile Haptics.
 */

let wakeLockSentinel: WakeLockSentinel | null = null;

/**
 * Requests a screen wake lock so the mobile display doesn't dim or turn off while singing.
 */
export async function requestScreenWakeLock(): Promise<void> {
  if ('wakeLock' in navigator && navigator.wakeLock?.request) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
    } catch {
      // Ignored if denied or not allowed by system
    }
  }
}

/**
 * Releases the active screen wake lock.
 */
export async function releaseScreenWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {
      // Ignored
    } finally {
      wakeLockSentinel = null;
    }
  }
}

/**
 * Triggers subtle tactile haptic vibration patterns on supported mobile devices.
 */
export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'countdown' = 'light'
): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'heavy':
          navigator.vibrate(60);
          break;
        case 'countdown':
          navigator.vibrate([25, 40, 25]);
          break;
        case 'success':
          navigator.vibrate([20, 50, 40]);
          break;
      }
    } catch {
      // Vibration not supported or allowed
    }
  }
}

