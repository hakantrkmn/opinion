import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getQuickFix } from "../geolocation";

type Cb = (p: GeolocationPosition) => void;
type ErrCb = (e: GeolocationPositionError) => void;

function position(accuracy: number, lat = 41, lng = 29): GeolocationPosition {
  return {
    coords: { latitude: lat, longitude: lng, accuracy } as GeolocationCoordinates,
    timestamp: Date.now(),
  } as GeolocationPosition;
}

/** Fake geolocation: quick (low accuracy) and watch (high accuracy) sources. */
function installGeo(opts: {
  quick?: { after: number; accuracy: number };
  watch?: { after: number; accuracy: number };
  deny?: boolean;
}) {
  const clearWatch = vi.fn();
  const geo = {
    getCurrentPosition: (ok: Cb, err: ErrCb) => {
      if (opts.deny) {
        setTimeout(() => err({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError), 10);
        return;
      }
      if (opts.quick) setTimeout(() => ok(position(opts.quick!.accuracy)), opts.quick.after);
    },
    watchPosition: (ok: Cb) => {
      if (opts.watch) setTimeout(() => ok(position(opts.watch!.accuracy, 41.001)), opts.watch.after);
      return 7;
    },
    clearWatch,
  };
  vi.stubGlobal("navigator", { geolocation: geo });
  return { clearWatch };
}

describe("getQuickFix", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("resolves immediately with a precise quick fix", async () => {
    const { clearWatch } = installGeo({ quick: { after: 200, accuracy: 30 } });
    const p = getQuickFix();
    await vi.advanceTimersByTimeAsync(200);
    await expect(p).resolves.toMatchObject({ accuracy: 30 });
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it("settles for a coarse fix after ~3s instead of waiting for GPS", async () => {
    installGeo({ quick: { after: 300, accuracy: 120 }, watch: { after: 12_000, accuracy: 10 } });
    const p = getQuickFix();
    let settled = false;
    p.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1_100);
    await expect(p).resolves.toMatchObject({ accuracy: 120 });
  });

  it("prefers a precise watch fix that arrives before settling", async () => {
    installGeo({ quick: { after: 300, accuracy: 120 }, watch: { after: 1_500, accuracy: 15 } });
    const p = getQuickFix();
    await vi.advanceTimersByTimeAsync(1_500);
    await expect(p).resolves.toMatchObject({ accuracy: 15, lat: 41.001 });
  });

  it("rejects right away when permission is denied", async () => {
    installGeo({ deny: true });
    const p = getQuickFix();
    const assertion = expect(p).rejects.toMatchObject({ kind: "denied" });
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
  });

  it("times out when no position ever arrives", async () => {
    installGeo({});
    const p = getQuickFix({ timeoutMs: 5_000 });
    const assertion = expect(p).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(5_600);
    await assertion;
  });
});
