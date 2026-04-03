"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function AuthForm() {
  const {
    signIn,
    signUp,
    isSigningIn,
    isSigningUp,
    signInError,
    signUpError,
  } = useSession();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentError = isLogin ? signInError : signUpError;
  const displayError = error || currentError?.message;
  const isSubmitting = isSigningIn || isSigningUp;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLogin) {
      signIn({ email, password });
    } else {
      if (!displayName.trim()) {
        setError("Display name is required");
        return;
      }
      signUp({ email, password, displayName: displayName.trim() });
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setDisplayName("");
    setError(null);
  };

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-background">
      {/* Left — Branding panel */}
      <div className="hidden md:flex flex-col justify-between bg-zinc-950 dark:bg-zinc-900/50 p-10 lg:p-14">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            oPINion
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
          &copy; {new Date().getFullYear()} oPINion
        </p>
      </div>

      {/* Right — Form panel */}
      <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-12">
        {/* Mobile branding */}
        <div className="md:hidden mb-10">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            oPINion
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drop your thoughts on the map.
          </p>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div
            className="space-y-1.5 mb-8 animate-[fadeSlideIn_0.4s_ease_both]"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {isLogin ? "Welcome back" : "Get started"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to continue to your account"
                : "Create an account to start pinning"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div
                className="space-y-2 animate-[fadeSlideIn_0.3s_ease_both]"
              >
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={!isLogin}
                  className="h-10"
                />
              </div>
            )}

            <div
              className="space-y-2 animate-[fadeSlideIn_0.4s_ease_0.05s_both]"
            >
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div
              className="space-y-2 animate-[fadeSlideIn_0.4s_ease_0.1s_both]"
            >
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>

            {displayError && (
              <Alert variant="destructive" className="animate-[fadeSlideIn_0.3s_ease_both]">
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)] animate-[fadeSlideIn_0.4s_ease_0.15s_both]"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting
                ? "Loading..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-8 text-center animate-[fadeSlideIn_0.4s_ease_0.2s_both]">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
