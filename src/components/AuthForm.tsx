"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function AuthForm() {
  const { signIn, signUp, isSigningIn, isSigningUp, signInError, signUpError } =
    useSession();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Watch for mutation errors and display them
  const currentError = isLogin ? signInError : signUpError;
  const displayError = error || currentError?.message;

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <div className="text-center pt-6 pb-2">
          <h1 className="text-3xl font-bold text-foreground">
            <span className="font-serif">oPINion</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share your thoughts on the map
          </p>
        </div>
        <CardHeader className="space-y-1 text-center pt-2">
          <CardTitle className="text-xl sm:text-2xl font-bold">
            {isLogin ? "Sign In" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base px-2">
            {isLogin
              ? "Enter your credentials to access your account"
              : "Create a new account to start sharing your opinions"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {displayError && (
              <Alert variant="destructive">
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isSigningIn || isSigningUp}
              className="w-full text-sm sm:text-base"
            >
              {(isSigningIn || isSigningUp) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSigningIn || isSigningUp
                ? "Loading..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsLogin(!isLogin);
                setDisplayName("");
                setError(null);
              }}
              className="text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
