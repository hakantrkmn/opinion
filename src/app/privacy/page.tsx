import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How droPINion collects, uses, and protects your data. Read our full privacy policy.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/privacy",
  },
};

const LAST_UPDATED = "May 1, 2026";
const CONTACT_EMAIL = "hakanturkmendev@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <header className="mb-10">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to droPINion
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section className="space-y-3">
            <p>
              droPINion (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a
              location-based social map. This Privacy Policy explains what
              information we collect, how we use it, and your choices. It
              applies to the droPINion mobile app and the droPINion website.
            </p>
            <p>
              By creating an account or using the app, you agree to this Policy.
              If you do not agree, do not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>

            <h3 className="text-base font-semibold">
              Information you provide
            </h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Account:</strong> email address and password (passwords
                are stored hashed; we never see your plaintext password).
              </li>
              <li>
                <strong>Profile:</strong> display name and optional avatar
                photo.
              </li>
              <li>
                <strong>User-generated content:</strong> pins (a pin
                consists of a name, a precise geographic coordinate, an optional
                photo, and a comment), comments on other pins, and your votes
                (likes / dislikes) on comments.
              </li>
              <li>
                <strong>Photos:</strong> images you choose to attach to a pin
                or comment.
              </li>
            </ul>

            <h3 className="text-base font-semibold">
              Information collected automatically
            </h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Location:</strong> when you create a pin or center the
                map on your current position, the app reads your device GPS
                coordinates. We do not track your location in the background.
                You can deny or revoke the location permission at any time in
                your device settings — the app will still let you browse the
                public map.
              </li>
              <li>
                <strong>Push notification token:</strong> if you enable
                notifications, your device&apos;s push token is stored so we
                can send relevant alerts (e.g. when someone likes your
                comment).
              </li>
              <li>
                <strong>Technical data:</strong> IP address and user-agent
                string. These are used for rate limiting, abuse prevention, and
                admin audit logs. We do not use them for tracking or
                advertising.
              </li>
            </ul>

            <h3 className="text-base font-semibold">
              Information we do <em>not</em> collect
            </h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>We do not collect contacts, calendar, or microphone data.</li>
              <li>
                We do not run third-party analytics or advertising SDKs in the
                app.
              </li>
              <li>
                We do not sell your personal data and we do not share it for
                cross-context behavioral advertising.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>To create and authenticate your account.</li>
              <li>
                To display your pins, comments, and votes to other users at the
                exact coordinate you chose.
              </li>
              <li>
                To deliver push notifications you have opted in to receive.
              </li>
              <li>
                To moderate the service: review reports, block abusive users,
                and remove content that violates our rules.
              </li>
              <li>
                To prevent fraud and abuse (rate limiting, audit logging).
              </li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Public Content</h2>
            <p>
              Pins, comments, votes, and your public profile (display name,
              avatar) are visible to anyone using droPINion, including users
              who have not signed in (the public map is browseable without an
              account). Do not post anything you would not want to be public.
            </p>
            <p>
              Your email address and the precise GPS coordinate of your
              current device location (as opposed to a pin coordinate you
              chose to publish) are <strong>never</strong> shown to other
              users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Third-Party Services</h2>
            <p>
              We use a small number of trusted vendors to operate the service.
              Each receives only the data they need:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Apple Push Notification Service / Firebase Cloud
                Messaging:</strong> to deliver push notifications. Your device
                push token is stored with the vendor.
              </li>
              <li>
                <strong>Google Maps SDK:</strong> renders the Android map
                surface. Subject to Google&apos;s privacy terms.
              </li>
              <li>
                <strong>Resend:</strong> sends transactional emails (sign-up
                confirmation, password reset). Receives your email address and
                the email body.
              </li>
              <li>
                <strong>Hosting / database:</strong> our servers and Postgres
                database store the data described above. They run on
                infrastructure providers under standard data-processing terms.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              5. User-Generated Content & Moderation
            </h2>
            <p>
              droPINion has zero tolerance for objectionable content or
              abusive behaviour. We provide the following tools, accessible
              from inside the app:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Report:</strong> any pin, comment, or user can be
                reported via the &quot;…&quot; menu, with reasons including
                spam, harassment, and inappropriate content.
              </li>
              <li>
                <strong>Block:</strong> any user can be blocked from their
                profile. A blocked user&apos;s pins and comments become
                invisible to you, and yours to them.
              </li>
              <li>
                <strong>Delete:</strong> you can delete any of your own pins,
                comments, and uploaded photos at any time.
              </li>
            </ul>
            <p>
              We commit to reviewing every report and acting on it (removing
              content, suspending users, or dismissing the report) within{" "}
              <strong>24 hours</strong>. Users who repeatedly violate our
              rules will have their accounts removed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Data Retention</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Account data is retained while your account is active.
              </li>
              <li>
                When you delete your account, we delete your profile, pins,
                comments, votes, photos, and push tokens. This action is
                irreversible.
              </li>
              <li>
                Server logs (IP, user-agent, audit log) are retained for up to
                90 days for security and abuse-prevention purposes, then
                deleted.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Your Rights</h2>
            <p>
              Depending on where you live (e.g. EU/UK under GDPR, California
              under CCPA, Türkiye under KVKK), you may have the right to:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate data (you can edit your profile in the app).</li>
              <li>Delete your data (you can delete your account from the app).</li>
              <li>Export a copy of your data.</li>
              <li>Withdraw consent for processing.</li>
              <li>Object to processing or lodge a complaint with your local data-protection authority.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Children</h2>
            <p>
              droPINion is not intended for children under 13 (or under 16 in
              the EEA, where applicable). We do not knowingly collect data
              from such children. If you believe a child has registered, email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we will remove the account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Security</h2>
            <p>
              We use TLS in transit, hashed passwords (better-auth), restricted
              admin access, and database-level access controls. No system is
              perfectly secure; if we ever experience a breach affecting your
              data, we will notify you as required by applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. International Transfers</h2>
            <p>
              Our infrastructure may store and process data in countries other
              than the one you reside in. Where required, we rely on standard
              contractual clauses or equivalent safeguards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Policy. Material changes will be highlighted
              in the app and the &quot;Last updated&quot; date above will
              change. Continued use of droPINion after a change constitutes
              acceptance of the updated Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">12. Contact</h2>
            <p>
              Questions, requests, or complaints? Email us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
