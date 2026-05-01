"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/hooks/useSession";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Step = "email" | "otp" | "password";

const RESEND_COOLDOWN = 60;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user && !isLoading) router.push("/");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendOtp = async (forResend = false) => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email });
      if (result.error) throw new Error(result.error.message);
      if (forResend) {
        toast.success("A new code has been sent");
      }
      setCooldown(RESEND_COOLDOWN);
      if (!forResend) setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    await sendOtp(false);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });
      if (result.error) {
        const msg = result.error.message ?? "Reset failed";
        if (/otp|code|expired|invalid/i.test(msg)) {
          setStep("otp");
          setOtp("");
        }
        throw new Error(msg);
      }
      toast.success("Password reset successfully. Please sign in.");
      router.push("/auth");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">
            {user ? "Redirecting..." : "Checking session..."}
          </span>
        </div>
      </div>
    );
  }

  const heading =
    step === "email"
      ? "Forgot password"
      : step === "otp"
        ? "Enter verification code"
        : "Set a new password";

  const subheading =
    step === "email"
      ? "Enter your email and we'll send you a code to reset your password."
      : step === "otp"
        ? `We sent a 6-digit code to ${email}. Enter it below.`
        : "Choose a strong password you haven't used before.";

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between bg-zinc-950 dark:bg-zinc-900/50 p-10 lg:p-14">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            droPINion
          </h1>
        </div>
        <div className="space-y-4">
          <p className="text-3xl lg:text-4xl font-bold tracking-tighter leading-none text-white max-w-[14ch]">
            Drop your thoughts on the map.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-[45ch]">
            Pin your opinions to real places. See what others think around the
            world.
          </p>
        </div>
        <p className="text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} droPINion
        </p>
      </div>

      <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-12">
        <div className="md:hidden mb-10">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            droPINion
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drop your thoughts on the map.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div
            key={step}
            className="space-y-1.5 mb-8 animate-[fadeSlideIn_0.4s_ease_both]"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {heading}
            </h2>
            <p className="text-sm text-muted-foreground">{subheading}</p>
          </div>

          {step === "email" && (
            <form
              key="step-email"
              onSubmit={handleEmailSubmit}
              className="space-y-5"
            >
              <div className="space-y-2 animate-[fadeSlideIn_0.4s_ease_0.05s_both]">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-10"
                />
              </div>

              {error && (
                <Alert
                  variant="destructive"
                  className="animate-[fadeSlideIn_0.3s_ease_both]"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] animate-[fadeSlideIn_0.4s_ease_0.15s_both]"
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {submitting ? "Sending..." : "Send code"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form
              key="step-otp"
              onSubmit={handleOtpSubmit}
              className="space-y-5"
            >
              <div className="space-y-2 animate-[fadeSlideIn_0.4s_ease_0.05s_both]">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  required
                  autoFocus
                  className="h-10 tracking-[0.4em] text-center font-mono"
                />
              </div>

              {error && (
                <Alert
                  variant="destructive"
                  className="animate-[fadeSlideIn_0.3s_ease_both]"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full h-10 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] animate-[fadeSlideIn_0.4s_ease_0.15s_both]"
              >
                Continue
              </Button>

              <div className="flex items-center justify-between text-xs animate-[fadeSlideIn_0.4s_ease_0.2s_both]">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || submitting}
                  onClick={() => sendOtp(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form
              key="step-password"
              onSubmit={handlePasswordSubmit}
              className="space-y-5"
            >
              <div className="space-y-2 animate-[fadeSlideIn_0.4s_ease_0.05s_both]">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="h-10"
                />
              </div>

              <div className="space-y-2 animate-[fadeSlideIn_0.4s_ease_0.1s_both]">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-10"
                />
              </div>

              {error && (
                <Alert
                  variant="destructive"
                  className="animate-[fadeSlideIn_0.3s_ease_both]"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] animate-[fadeSlideIn_0.4s_ease_0.15s_both]"
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {submitting ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          )}

          <div className="mt-8 animate-[fadeSlideIn_0.4s_ease_0.25s_both]">
            <Link
              href="/auth"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
