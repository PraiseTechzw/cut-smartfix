"use client";

import { useEffect, useState } from "react";

export function Mascot({
  activeField,
  success,
  error,
}: {
  activeField: "none" | "email" | "password";
  success: boolean;
  error: boolean;
}) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3600);
    return () => window.clearInterval(timer);
  }, []);
  const expression = success
    ? "mascot-success"
    : error
      ? "mascot-error"
      : activeField === "password"
        ? "mascot-peek"
        : "mascot-idle";
  return (
    <div className={`auth-mascot ${expression}`} aria-hidden="true">
      <div className="mascot-shadow" />
      <div className="mascot-body">
        <i className="mascot-ear mascot-ear-left" />
        <i className="mascot-ear mascot-ear-right" />
        <div className="mascot-face">
          <div className="mascot-eyes">
            <i className={blink ? "blink" : ""} />
            <i className={blink ? "blink" : ""} />
          </div>
          <div className="mascot-beak" />
          <span className="mascot-cheek mascot-cheek-left" />
          <span className="mascot-cheek mascot-cheek-right" />
        </div>
        <div className="mascot-paws">
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}
