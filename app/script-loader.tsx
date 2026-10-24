"use client";
import { useEffect } from "react";

export default function ScriptLoader() {
  useEffect(() => {
    const analytics = document.createElement("script");
    analytics.src = "/analytics.js";
    document.body.appendChild(analytics);
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/app.js";
    document.body.appendChild(script);
    return () => {
      script.remove();
      analytics.remove();
    };
  }, []);
  return null;
}
