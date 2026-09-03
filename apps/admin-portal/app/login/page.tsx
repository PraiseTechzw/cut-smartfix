"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { login, loading, user } = useAuth();
  const router = useRouter();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) { router.replace("/dashboard"); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Inline style objects ──────────────────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", display: "flex", background: "#f0f4f3" },
    // Left hero panel
    hero: {
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      minWidth: 380, maxWidth: 480, flex: "0 0 420px",
      background: "linear-gradient(160deg,#0b6b57 0%,#085a49 55%,#073d34 100%)",
      padding: "48px 44px", position: "relative", overflow: "hidden",
    } as React.CSSProperties,
    heroDots: {
      position: "absolute", inset: 0, zIndex: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='rgba(255,255,255,0.07)'/%3E%3C/svg%3E")`,
      backgroundSize: "30px 30px",
    } as React.CSSProperties,
    heroContent: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" } as React.CSSProperties,
    heroLogo: { display: "flex", alignItems: "center", gap: 12, marginBottom: "auto" },
    heroLogoIcon: {
      width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
    },
    heroLogoText: { color: "#fff" },
    heroLogoName: { fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" },
    heroLogoSub:  { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 1 },
    heroCenter: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, paddingBottom: 32 } as React.CSSProperties,
    heroIllustration: {
      width: 100, height: 100, borderRadius: "50%",
      background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    },
    heroTagline: { textAlign: "center" as const },
    heroTaglineH: { color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 8 },
    heroTaglineP: { color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.6, maxWidth: 260, margin: "0 auto" },
    heroFeatures: { display: "flex", flexDirection: "column" as const, gap: 10, width: "100%" },
    heroFeature: {
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,0.08)", borderRadius: 8,
      padding: "10px 14px", color: "rgba(255,255,255,0.9)", fontSize: 13,
    },
    heroFooter: { color: "rgba(255,255,255,0.35)", fontSize: 11, textAlign: "center" as const },
    // Right form panel
    formPanel: {
      flex: 1, display: "flex", flexDirection: "column" as const,
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", minHeight: "100vh",
    },
    formInner: { width: "100%", maxWidth: 400 },
    mobileLogo: { display: "flex", flexDirection: "column" as const, alignItems: "center", marginBottom: 32, gap: 12 },
    mobileLogoIcon: {
      width: 56, height: 56, borderRadius: 16, background: "#0b6b57",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 14px rgba(11,107,87,0.3)",
    },
    mobileLogoText: { fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" },
    mobileLogoSub:  { fontSize: 12, color: "#6b7280", marginTop: 2 },
    card: {
      background: "#fff", borderRadius: 14, padding: "32px 28px",
      border: "1px solid #e2e8e4", boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
    },
    cardH: { fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", marginBottom: 6 },
    cardSub: { fontSize: 13, color: "#6b7280", marginBottom: 24 },
    label: { display: "block", fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 5 },
    inputWrap: { position: "relative" as const, marginBottom: 18 },
    input: {
      display: "block", width: "100%", padding: "9px 12px",
      border: "1px solid #e2e8e4", borderRadius: 7, fontSize: 13,
      color: "#111827", background: "#fff", outline: "none",
      transition: "border-color 0.15s, box-shadow 0.15s", boxSizing: "border-box" as const,
    },
    inputPr: {
      display: "block", width: "100%", padding: "9px 42px 9px 12px",
      border: "1px solid #e2e8e4", borderRadius: 7, fontSize: 13,
      color: "#111827", background: "#fff", outline: "none",
      boxSizing: "border-box" as const,
    },
    eyeBtn: {
      position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)",
      background: "none", border: "none", cursor: "pointer", color: "#6b7280",
      display: "flex", alignItems: "center", padding: 4,
    },
    submitBtn: {
      width: "100%", padding: "11px 16px", background: "#0b6b57", color: "#fff",
      border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700,
      cursor: "pointer", marginTop: 6, display: "flex", alignItems: "center",
      justifyContent: "center", gap: 8, transition: "background 0.15s",
    },
    submitBtnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    errorBox: {
      background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca",
      borderRadius: 7, padding: "10px 14px", fontSize: 13, marginBottom: 16,
    },
    footer: { marginTop: 20, textAlign: "center" as const, fontSize: 11, color: "#9ca3af", lineHeight: 1.5 },
  };

  return (
    <div style={s.page}>
      {/* ── Left hero (hidden <860px via inline media query not possible — use CSS class instead) ── */}
      <aside style={s.hero} className="login-hero">
        <div style={s.heroDots} />
        <div style={s.heroContent}>
          {/* Logo */}
          <div style={s.heroLogo}>
            <div style={s.heroLogoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={s.heroLogoText}>
              <div style={s.heroLogoName}>CUT SmartFix</div>
              <div style={s.heroLogoSub}>Chinhoyi University of Technology</div>
            </div>
          </div>

          {/* Center illustration + tagline */}
          <div style={s.heroCenter}>
            <div style={s.heroIllustration}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div style={s.heroTagline}>
              <h2 style={s.heroTaglineH}>Secure Admin Access</h2>
              <p style={s.heroTaglineP}>Full control over maintenance operations, staff, and analytics.</p>
            </div>
            <div style={s.heroFeatures}>
              {[
                { icon: "shield", label: "Role-based access control" },
                { icon: "chart",  label: "Real-time analytics" },
                { icon: "bell",   label: "Instant alerts & notifications" },
              ].map(({ label }) => (
                <div key={label} style={s.heroFeature}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p style={s.heroFooter}>© {new Date().getFullYear()} Chinhoyi University of Technology</p>
        </div>
      </aside>

      {/* ── Right form ── */}
      <section style={s.formPanel}>
        <div style={s.formInner}>
          {/* Mobile-only logo */}
          <div style={s.mobileLogo} className="login-mobile-logo">
            <div style={s.mobileLogoIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={s.mobileLogoText}>CUT SmartFix</div>
              <div style={{ ...s.mobileLogoSub, textAlign: "center" }}>Admin Portal</div>
            </div>
          </div>

          {/* Card */}
          <div style={s.card}>
            <h1 style={s.cardH}>Administrator Sign In</h1>
            <p style={s.cardSub}>Access restricted to authorised administrators and supervisors</p>

            {error && <div style={s.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 18 }}>
                <label style={s.label} htmlFor="email">Email address</label>
                <input
                  id="email" type="email" style={s.input}
                  placeholder="you@cut.ac.zw"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" autoFocus disabled={submitting}
                  onFocus={(e) => { e.target.style.borderColor = "#0b6b57"; e.target.style.boxShadow = "0 0 0 3px rgba(11,107,87,0.12)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "#e2e8e4"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={s.label} htmlFor="password">Password</label>
                <div style={s.inputWrap}>
                  <input
                    id="password" type={showPass ? "text" : "password"} style={s.inputPr}
                    placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required autoComplete="current-password" disabled={submitting}
                    onFocus={(e) => { e.target.style.borderColor = "#0b6b57"; e.target.style.boxShadow = "0 0 0 3px rgba(11,107,87,0.12)"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "#e2e8e4"; e.target.style.boxShadow = "none"; }}
                  />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Hide password" : "Show password"} tabIndex={-1}>
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                style={{ ...s.submitBtn, ...(submitting ? s.submitBtnDisabled : {}) }}
                disabled={submitting || !email || !password}
              >
                {submitting ? (
                  <><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />Signing in…</>
                ) : "Sign In"}
              </button>
            </form>
          </div>

          <p style={s.footer}>
            CUT SmartFix Admin Portal · Chinhoyi University of Technology<br />
            Access restricted to authorised personnel only.
          </p>
        </div>
      </section>

      {/* Inline responsive: hide hero on narrow screens */}
      <style>{`
        @media (max-width: 860px) {
          .login-hero { display: none !important; }
        }
        @media (min-width: 861px) {
          .login-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
