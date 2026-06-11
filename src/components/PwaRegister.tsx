"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // sin SW la app sigue funcionando, solo pierde el modo offline
      });
    }
  }, []);

  return null;
}
