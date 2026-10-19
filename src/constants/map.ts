/** Below this zoom the client asks for server-side clusters, at/above it for pins. */
export const PIN_DETAIL_MIN_ZOOM = 12;

/** Hard cap of pins returned by GET /api/pins for one viewport. */
export const PINS_MAX_RESULTS = 2000;

/** "You must be there" rule for dropping a pin. */
export const PIN_CREATE_MAX_DISTANCE_M = 100;

/** Max GPS accuracy (meters) added as slack to the distance check. */
export const PIN_CREATE_MAX_ACCURACY_SLACK_M = 50;

/** Client-side GL clustering stops above this zoom. */
export const CLIENT_CLUSTER_MAX_ZOOM = 16;

/** Pin names become visible as map labels from this zoom. */
export const PIN_LABEL_MIN_ZOOM = 14;
