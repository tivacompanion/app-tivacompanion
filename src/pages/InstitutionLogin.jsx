import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Lock, Loader2, Building2, ArrowLeft } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

export default function InstitutionLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      const user = await base44.auth.me();
      const isAdmin = ['admin', 'institution_admin', 'super_admin'].includes(user?.role);
      if (!isAdmin) {
        await base44.auth.logout();
        setError("This portal is for institutional administrators only. Use the standard login for patient accounts.");
        setLoading(false);
        return;
      }
      window.location.href = "/institution";
    } catch (err) {
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/institution");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to patient login */}
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to patient login
        </Link>

        <div className="bg-card/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-tiva-teal flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#0A0F0D]" strokeWidth={2} />
            </div>
            <h1 className="font-heading font-bold text-2xl text-navy mb-1">Institutional Portal</h1>
            <p className="text-sm text-muted-foreground">Secure access for healthcare administrators</p>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium mb-6 border-white/15"
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
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
              <Label htmlFor="email">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="admin@hospital.cm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-medium bg-tiva-teal text-[#0A0F0D] hover:bg-tiva-teal/90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Access Dashboard
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 space-y-3 text-center">
          <Link to="/request-institution" className="block text-xs text-tiva-teal font-medium hover:underline">
            Don't have access? Request institutional access →
          </Link>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            Tiva Health — Institutional Access
          </div>
        </div>
      </div>
    </div>
  );
}