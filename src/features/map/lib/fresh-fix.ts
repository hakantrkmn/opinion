import { startLocationWatch } from "../hooks/useLocationWatch";
import { useLocationStore, type GeoFix } from "../store/location-store";
import { getQuickFix } from "./geolocation";

/** A watched fix this recent and precise is reused instead of asking again. */
const REUSABLE_FIX_AGE_MS = 30_000;
const REUSABLE_FIX_ACCURACY_M = 50;

/**
 * A current location fix for "you must be there" actions: the live one when
 * recent and precise, otherwise a quick new one (which also starts the live
 * "you are here" dot so the next action is instant). Rejects with GeoError.
 */
export async function getFreshFix(): Promise<GeoFix> {
  const known = useLocationStore.getState().fix;
  if (
    known &&
    Date.now() - known.timestamp < REUSABLE_FIX_AGE_MS &&
    known.accuracy <= REUSABLE_FIX_ACCURACY_M
  ) {
    return known;
  }
  const fix = await getQuickFix();
  useLocationStore.getState().setFix(fix);
  startLocationWatch();
  return fix;
}
