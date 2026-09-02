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
  const [activeField, setActiveField] = useState<"none" | "email" | "password">(
    "none",
  );
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.brand}>
          <Mascot
            activeField={activeField}
            success={false}
            error={Boolean(error)}
          />
          <h1 style={styles.brandTitle}>CUT SmartFix</h1>
          <p style={styles.brandSub}>Staff Portal</p>
        </div>

        <h2 style={styles.heading}>Welcome back</h2>
        <p style={styles.subheading}>
          Chinhoyi University of Technology – Maintenance Staff
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="your@cut.ac.zw"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setActiveField("email")}
              onBlur={() => setActiveField("none")}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">
              Password
            </label>
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
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !email || !password}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "10px 16px",
              fontSize: "0.95rem",
            }}
          >
            {loading ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "center",
                }}
              >
                <span
                  className="spinner spinner-sm"
                  style={{
                    borderTopColor: "#fff",
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                />
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p style={styles.footer}>
          CUT SmartFix &copy; {new Date().getFullYear()} ·{" "}
          <span style={{ color: "var(--muted)" }}>
            Chinhoyi University of Technology
          </span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: "24px 16px",
  },
  box: {
    background: "var(--surface)",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
    padding: "40px 36px",
    width: "100%",
    maxWidth: 420,
    border: "1px solid var(--border)",
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 28,
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "var(--green)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  brandSub: {
    fontSize: "0.82rem",
    color: "var(--muted)",
    marginTop: 2,
  },
  heading: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 4,
    textAlign: "center",
  },
  subheading: {
    fontSize: "0.82rem",
    color: "var(--muted)",
    textAlign: "center",
    marginBottom: 24,
  },
  footer: {
    marginTop: 28,
    textAlign: "center",
    fontSize: "0.75rem",
    color: "var(--muted)",
  },
};
