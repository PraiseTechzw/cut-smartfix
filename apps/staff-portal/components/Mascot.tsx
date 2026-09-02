"use client";

import { useEffect, useState } from "react";

interface MascotProps {
  activeField: "none" | "email" | "password";
  success: boolean;
  error: boolean;
  /** Optional size multiplier, default 1 */
  scale?: number;
}

export function Mascot({ activeField, success, error, scale = 1 }: MascotProps) {
  const [blink, setBlink] = useState(false);

  /* ── Random blink every 3–5 s ── */
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const delay = 3000 + Math.random() * 2000;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          schedule();
        }, 120);
      }, delay);
    };

    schedule();
    return () => clearTimeout(timeout);
  }, []);

  const stateClass = success
    ? "mascot-success"
    : error
    ? "mascot-error"
    : activeField === "password"
    ? "mascot-peek"
    : "mascot-idle";

  return (
    <div
      className={`auth-mascot ${stateClass}`}
      aria-hidden="true"
      style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
    >
      {/* Ground shadow */}
      <div className="mascot-shadow" />

      {/* Body */}
      <div className="mascot-body">
        {/* Ear tufts */}
        <i className="mascot-ear mascot-ear-left" />
        <i className="mascot-ear mascot-ear-right" />

        {/* Face disc */}
        <div className="mascot-face">
          {/* Eyes */}
          <div className="mascot-eyes">
            <div className={`mascot-eye-socket${blink ? " blink" : ""}`} />
            <div className={`mascot-eye-socket${blink ? " blink" : ""}`} />
          </div>

          {/* Beak */}
          <div className="mascot-beak" />

          {/* Blush */}
          <span className="mascot-cheek mascot-cheek-left" />
          <span className="mascot-cheek mascot-cheek-right" />
        </div>

        {/* Talons */}
        <div className="mascot-paws">
          <div className="mascot-talon" />
          <div className="mascot-talon" />
        </div>
      </div>
    </div>
  );
}
