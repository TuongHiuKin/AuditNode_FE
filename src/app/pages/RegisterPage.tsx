import { useState } from "react";
import { Link, useNavigate } from "react-router";
import apiClient from "../../shared/api/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: "var(--surface)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "12px 14px",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-family-label, 'JetBrains Mono', monospace)",
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
  lineHeight: 1,
  display: "block",
};

const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "var(--primary)";
  e.target.style.boxShadow = "0 0 0 3px oklch(0.62 0.22 25 / 0.15)";
};

const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "var(--border)";
  e.target.style.boxShadow = "none";
};

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/api/v1/auth/register", { username, email, password });
      setSuccess("Account created successfully! Redirecting to login…");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to register. Username or email may already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      backgroundColor: "var(--background)",
      fontFamily: "var(--font-family-body, 'Manrope', system-ui, sans-serif)",
    }}>
      {/* ── Left decorative panel ── */}
      <div style={{
        flex: "0 0 40%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, oklch(0.12 0.03 260) 0%, oklch(0.10 0.05 280) 100%)",
      }}>
        {/* Decorative grid */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(oklch(0.28 0.02 260 / 0.4) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.28 0.02 260 / 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        }} />

        {/* Glow orb */}
        <div style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.62 0.22 25 / 0.10) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "300px" }}>
          {/* Logo mark */}
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, var(--primary) 0%, oklch(0.50 0.22 10) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 0 32px oklch(0.62 0.22 25 / 0.3)",
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L28 10V22L16 28L4 22V10L16 4Z" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="16" cy="16" r="4" fill="white" />
              <path d="M16 4V12M16 20V28M4 10L11 14M21 18L28 22M4 22L11 18M21 14L28 10" stroke="white" strokeWidth="1" opacity="0.5" />
            </svg>
          </div>

          <h2 style={{
            fontFamily: "var(--font-family-display, 'Sora', system-ui)",
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--foreground)",
            letterSpacing: "-0.025em",
            marginBottom: "12px",
            lineHeight: 1.2,
          }}>
            AuditNode
          </h2>
          <p style={{
            fontSize: "0.875rem",
            color: "var(--muted-foreground)",
            lineHeight: 1.6,
          }}>
            Create your account and start auditing your infrastructure today.
          </p>

          <div style={{ marginTop: "36px", display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
            {[
              { icon: "◈", label: "Real-time topology mapping" },
              { icon: "◉", label: "Dependency graph analysis" },
              { icon: "◎", label: "Multi-datacenter inventory" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "var(--primary)", fontSize: "1rem", lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 40px",
        backgroundColor: "var(--background)",
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {/* Heading */}
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{
              fontFamily: "var(--font-family-display, 'Sora', system-ui)",
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--foreground)",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              margin: 0,
            }}>
              Create Account
            </h1>
            <p style={{
              fontSize: "0.875rem",
              color: "var(--muted-foreground)",
              marginTop: "8px",
              lineHeight: 1.5,
            }}>
              Register to access the platform
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px 16px",
              backgroundColor: "oklch(0.62 0.22 25 / 0.1)",
              border: "1px solid oklch(0.62 0.22 25 / 0.25)",
              borderRadius: "10px",
              color: "var(--danger)",
              fontSize: "0.8rem",
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}>
              <span style={{ flexShrink: 0, marginTop: "1px" }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              padding: "12px 16px",
              backgroundColor: "oklch(0.72 0.18 155 / 0.1)",
              border: "1px solid oklch(0.72 0.18 155 / 0.25)",
              borderRadius: "10px",
              color: "var(--success)",
              fontSize: "0.8rem",
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}>
              <span style={{ flexShrink: 0, marginTop: "1px" }}>✓</span>
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="reg-username" style={labelStyle}>Username</label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="e.g. jdoe"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="reg-email" style={labelStyle}>Email Address</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="reg-password" style={labelStyle}>Password</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="reg-confirm-password" style={labelStyle}>Confirm Password</label>
              <input
                id="reg-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px 24px",
                backgroundColor: loading ? "oklch(0.45 0.18 25)" : "var(--primary)",
                color: "oklch(0.98 0 0)",
                border: "none",
                borderRadius: "10px",
                fontSize: "0.875rem",
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: loading ? "none" : "0 0 20px oklch(0.62 0.22 25 / 0.25)",
                opacity: loading ? 0.7 : 1,
                marginTop: "4px",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.target as HTMLButtonElement).style.boxShadow = "0 0 28px oklch(0.62 0.22 25 / 0.4)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px oklch(0.62 0.22 25 / 0.25)";
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {loading ? "Registering…" : "Create Account"}
            </button>
          </form>

          {/* Footer link */}
          <p style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--muted-foreground)",
            lineHeight: 1.5,
          }}>
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
