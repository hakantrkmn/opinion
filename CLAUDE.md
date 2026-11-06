# droPINion web + API

Next.js 15 app that serves both the website and the JSON API (`src/app/api/**`) used by the native apps. Setup, stack and env vars: see `README.md`.

## Related repositories

| What | Local path | GitHub |
| --- | --- | --- |
| Web + API (this repo) | `~/Documents/GitHub/opinion` | `hakantrkmn/opinion` |
| Android app (Kotlin + Compose) | `~/Documents/GitHub/opinion-android` | `hakantrkmn/opinion-android` (private) |
| iOS app (SwiftUI) | `~/Documents/GitHub/opinion-ios` | `hakantrkmn/opinion-ios` |

Each app repo has its own `CLAUDE.md`. When an API contract changes here (route, field, error code, push payload), the Android and iOS clients must follow:
- Android: `core/network/Endpoints.kt` + `models/Models.kt`.
- iOS: the owner updates it.

The owner pushes all repos; don't push from a session.

## Local dev

```bash
docker compose up -d        # PostGIS, container opinion-db, localhost:5432
npm run db:migrate
npm run db:seed             # user1@example.test … user39@example.test / password1234
PORT=3003 npm run dev       # 3000 is often taken by another project on this machine
```

- Don't stop or reuse whatever is already listening on port 3000; pick another port.
- The Android emulator reaches this server at `http://10.0.2.2:<port>` (build the app with `-PdevSiteUrl=http://10.0.2.2:<port>`).
- The local DB is a dev DB: free to reset or fill with test data.

## Things that affect the apps

- **Native auth:** better-auth bearer tokens. Apps send `Origin: opinionmobile://` and pick up rotated tokens from the `set-auth-token` response header.
- **Push:** sent directly to APNs (`@parse/node-apn`) and FCM HTTP v1 (`firebase-admin`), no Expo. See `src/server/services/push/`.
  - FCM payloads are data-only with `title`, `body` and routing keys (`pinId`, `follower_id`, `community_id`).
  - FCM credentials come from `FCM_SERVICE_ACCOUNT`: a file path locally, single-line JSON on Dokploy. It's a secret, so never print it.
  - Firebase project: `opinion-e5d0e`.
- **Locale:** the account language (`POST /api/locale`, `en` | `tr`) picks push/email copy. The web UI strings are in `messages/{en,tr}/*.json`.
- **App Links:** `public/.well-known/assetlinks.json` lets `https://dropinion.app/{pin,u,c}/…` open the Android app. It holds the package `com.hakanturkmen.opinion` and the release signing certificate SHA-256, so it must change if the release keystore ever changes.
