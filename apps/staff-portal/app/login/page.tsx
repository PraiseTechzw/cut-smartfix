"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "../../lib/auth";
import { Mascot } from "../../components/Mascot";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<"none" | "email" | "password">("none");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setDone(false);
      await login(email, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Left hero panel (desktop only) ── */}
      <aside className="auth-hero">
        {/* Logo */}
        <div className="auth-hero-logo">
          <div className="auth-hero-logo-icon">
            <OwlIcon size={26} color="#fff" />
          </div>
          <div className="auth-hero-logo-text">
            <strong>CUT SmartFix</strong>
            <span>Chinhoyi University of Technology</span>
          </div>
        </div>

        {/* Mascot + tagline */}
        <div className="auth-hero-center">
          <div className="auth-hero-mascot-wrap">
            <Mascot activeField={activeField} success={done} error={Boolean(error)} scale={1.3} />
          </div>
          <div className="auth-hero-tagline">
            <h2>Your maintenance hub,&nbsp;sorted.</h2>
            <p>
              Track repair requests, manage work orders, and coordinate your
              team — all in one place.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="auth-hero-footer">
          © {new Date().getFullYear()} CUT SmartFix · Staff Portal
        </p>
      </aside>

      {/* ── Right form panel ── */}
      <section className="auth-form-panel">
        <div className="auth-form-inner">

          {/* Mobile-only logo */}
          <div className="auth-mobile-logo">
            <div className="auth-mobile-logo-icon">
              <OwlIcon size={28} color="#fff" />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                CUT SmartFix
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "2px 0 0" }}>
                Staff Portal
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="auth-card">
            <div className="auth-card-header">
              <h1>Welcome back</h1>
              <p>Sign in to your staff account to continue</p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="alert alert-error" role="alert">
                <AlertIcon />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="form-group">
                <label className="label" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@cut.ac.zw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField("none")}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <label className="label" htmlFor="password" style={{ margin: 0 }}>
                    Password
                  </label>
                </div>
                <div className="auth-password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setActiveField("password")}
                    onBlur={() => setActiveField("none")}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOffIcon />
                    ) : (
                      <EyeIcon />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !email || !password}
                style={{ width: "100%", marginTop: 4, padding: "11px 16px", fontSize: "0.95rem", fontWeight: 600 }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                    <span
                      className="spinner spinner-sm"
                      style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
                    />
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>Maintenance Staff Access</span>
            </div>

            {/* Info note */}
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
              Use your CUT institutional email address. Contact your
              supervisor if you need access.
            </p>
          </div>

          <p className="auth-footer">
            CUT SmartFix &copy; {new Date().getFullYear()} &middot;{" "}
            Chinhoyi University of Technology
          </p>
        </div>
      </section>
    </div>
  );
}

/* ── Inline icon helpers (no extra deps) ── */

function OwlIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Simplified owl silhouette */}
      <ellipse cx="12" cy="13" rx="7" ry="8" fill={color} opacity="0.9" />
      {/* Ear tufts */}
      <path d="M7 6 Q6 3 8 2 Q8.5 5 9 6Z" fill={color} />
      <path d="M17 6 Q18 3 16 2 Q15.5 5 15 6Z" fill={color} />
      {/* Face */}
      <ellipse cx="12" cy="12" rx="4.5" ry="4.5" fill="white" opacity="0.9" />
      {/* Eyes */}
      <circle cx="10.2" cy="11.5" r="1.5" fill="#17231f" />
      <circle cx="13.8" cy="11.5" r="1.5" fill="#17231f" />
      <circle cx="10.6" cy="11" r="0.5" fill="white" />
      <circle cx="14.2" cy="11" r="0.5" fill="white" />
      {/* Beak */}
      <path d="M11.3 13.8 L12 15 L12.7 13.8Z" fill="#e3a820" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0, marginTop: 2 }}>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
