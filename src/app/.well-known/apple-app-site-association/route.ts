/**
 * Universal Links for the iOS app (com.hakanturkmen.opinion, team
 * B9QCAW4A44): pin, profile and community invite links open in the app
 * when it's installed, and on this site otherwise. Apple fetches this
 * through its CDN, so it must be plain JSON at this exact path, no redirect.
 */
const IOS_APP_ID = "B9QCAW4A44.com.hakanturkmen.opinion";

const association = {
  applinks: {
    details: [
      {
        appIDs: [IOS_APP_ID],
        components: [
          { "/": "/pin/*", comment: "Shared pin" },
          { "/": "/u/*", comment: "Public profile" },
          { "/": "/c/*", comment: "Community invite" },
          { "/": "/", "?": { pin: "?*" }, comment: "Map focused on a pin" },
        ],
      },
    ],
  },
};

export const dynamic = "force-static";

export function GET() {
  return Response.json(association, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
