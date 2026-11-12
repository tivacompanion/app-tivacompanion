import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [showManualCode, setShowManualCode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Real-time listener: If the user clicks the confirmation link in their email,
  // Supabase automatically updates the session.
  useEffect(() => {
    if (!showOtp) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsVerified(true);
        toast({
          title: "Email verified successfully!",
          description: "Welcome to Tiva. Taking you to your dashboard...",
        });
        setTimeout(() => {
          window.location.href = "/auth-redirect";
        }, 1200);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [showOtp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please provide a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const result = await base44.auth.register({ email, password });
      // If email confirmation is disabled or user is immediately logged in:
      if (result?.session) {
        window.location.href = "/auth-redirect";
        return;
      }
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      setIsVerified(true);
      window.location.href = "/auth-redirect";
    } catch (err) {
      setError(err.message || "Invalid verification code. Please check your email or click the link sent.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    setError("");
    try {
      const user = await base44.auth.me();
      if (user) {
        setIsVerified(true);
        window.location.href = "/auth-redirect";
      } else {
        setError("Your account is not confirmed yet. Please click the confirmation link in your email.");
      }
    } catch {
      setError("Unable to confirm status. Please click the confirmation link in your email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Email sent",
        description: "A new confirmation email has been dispatched. Please check your inbox or spam.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend confirmation email");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/auth-redirect");
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}`}
      >
        {isVerified ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto animate-bounce" />
            <h3 className="text-lg font-semibold text-foreground">Email Confirmed!</h3>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Primary Option: Click the link */}
            <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-2 text-center">
              <Mail className="w-8 h-8 mx-auto text-primary" />
              <h4 className="font-semibold text-foreground text-sm">Confirmation Link Sent</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Supabase sent a confirmation email to <strong className="text-foreground">{email}</strong>.
                Click the <span className="font-medium text-primary">"Confirm your mail"</span> link inside the email to complete registration.
              </p>
            </div>

            <Button
              className="w-full h-12 font-medium"
              onClick={handleCheckVerification}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking status...
                </>
              ) : (
                <>
                  I've confirmed my email
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {/* Secondary Option: 6-digit Code (if user's Supabase template uses Token) */}
            <div className="pt-2 border-t border-border/50 text-center">
              {!showManualCode ? (
                <button
                  type="button"
                  onClick={() => setShowManualCode(true)}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  Did you receive a 6-digit code instead? Enter code here
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">Enter the 6-digit code from your email:</p>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      autoFocus
                      autoComplete="one-time-code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm font-medium"
                    onClick={handleVerify}
                    disabled={loading || otpCode.length < 6}
                  >
                    Verify Code
                  </Button>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Didn't receive the email?{" "}
              <button
                type="button"
                onClick={handleResend}
                className="text-primary font-medium hover:underline"
              >
                Resend email
              </button>
            </p>
          </div>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
