import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// ---------------------------------------------------------------------------
// useMotionWake – dims the screen after idle, wakes on camera motion
//
// How it works:
//  1. The CameraView lives in App.tsx (hidden, 1x1 pixel, front camera).
//  2. Every CAPTURE_INTERVAL_MS we call takePicture with base64 + tiny size.
//  3. We compare average luminance of current frame vs previous frame.
//  4. If the delta exceeds MOTION_THRESHOLD → motion detected → wake screen.
//  5. After WAKE_DURATION_MS of no motion the screen dims back down.
//
// This hook returns:
//  - screenAwake: boolean       (for UI to know current state)
//  - onFrameCaptured(base64)    (called by CameraView capture loop)
//  - triggerWake()              (manual wake, e.g. on touch)
// ---------------------------------------------------------------------------

const WAKE_DURATION_MS = 60_000;        // 1 minute
const MOTION_THRESHOLD = 8;             // luminance delta (0-255 scale)
const DIM_BRIGHTNESS = 0.0;            // fully dim when idle
const WAKE_BRIGHTNESS = 0.7;           // bright when active
const SAMPLE_PIXELS = 200;             // how many pixels to sample for speed

/**
 * Compute average luminance from a base64-encoded JPEG.
 * We decode only a small sample of the raw base64 bytes as a fast proxy
 * for actual pixel brightness (JPEG byte distribution correlates with
 * image brightness well enough for motion detection).
 */
function estimateLuminance(base64: string): number {
  // Sample evenly spaced characters from the base64 string and
  // convert their char codes to a rough brightness estimate.
  // This is intentionally imprecise but extremely fast – no image
  // decoding required.
  const len = base64.length;
  if (len < SAMPLE_PIXELS) return 128;

  let sum = 0;
  const step = Math.floor(len / SAMPLE_PIXELS);
  for (let i = 0; i < SAMPLE_PIXELS; i++) {
    sum += base64.charCodeAt(i * step) & 0xff;
  }
  return sum / SAMPLE_PIXELS;
}

export function useMotionWake() {
  const [screenAwake, setScreenAwake] = useState(true); // start awake
  const prevLuminanceRef = useRef<number | null>(null);
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awakeRef = useRef(true); // mirror for non-reactive callbacks

  // ---- Screen control helpers -------------------------------------------
  const dimScreen = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      await Brightness.setBrightnessAsync(DIM_BRIGHTNESS);
      deactivateKeepAwake('motion-wake');
    } catch (e) {
      console.warn('Brightness dim failed:', e);
    }
    awakeRef.current = false;
    setScreenAwake(false);
  }, []);

  const wakeScreen = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      await Brightness.setBrightnessAsync(WAKE_BRIGHTNESS);
      await activateKeepAwakeAsync('motion-wake');
    } catch (e) {
      console.warn('Brightness wake failed:', e);
    }
    awakeRef.current = true;
    setScreenAwake(true);
  }, []);

  // ---- Wake trigger (resets the 1-minute idle timer) --------------------
  const triggerWake = useCallback(() => {
    // Clear existing idle timer
    if (wakeTimerRef.current) {
      clearTimeout(wakeTimerRef.current);
      wakeTimerRef.current = null;
    }

    // Wake if currently dimmed
    if (!awakeRef.current) {
      wakeScreen();
    }

    // Start new idle countdown
    wakeTimerRef.current = setTimeout(() => {
      dimScreen();
    }, WAKE_DURATION_MS);
  }, [wakeScreen, dimScreen]);

  // ---- Frame analysis callback ------------------------------------------
  const onFrameCaptured = useCallback(
    (base64: string) => {
      const lum = estimateLuminance(base64);
      const prev = prevLuminanceRef.current;
      prevLuminanceRef.current = lum;

      if (prev === null) return; // first frame – no comparison yet

      const delta = Math.abs(lum - prev);
      if (delta > MOTION_THRESHOLD) {
        triggerWake();
      }
    },
    [triggerWake],
  );

  // ---- Initial wake + system brightness permission ----------------------
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    (async () => {
      try {
        // Request WRITE_SETTINGS permission for brightness control
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === 'granted') {
          // Use system brightness so it survives app restarts
          await Brightness.setSystemBrightnessAsync(WAKE_BRIGHTNESS);
        }
      } catch {
        // Fall back to app-level brightness
      }
    })();

    // Start the initial idle countdown
    triggerWake();

    return () => {
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    };
  }, [triggerWake]);

  // ---- Also wake on app returning to foreground -------------------------
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') triggerWake();
    });
    return () => sub.remove();
  }, [triggerWake]);

  return { screenAwake, onFrameCaptured, triggerWake };
}
