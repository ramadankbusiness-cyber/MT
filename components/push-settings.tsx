"use client";

import { useState } from "react";

function decodeKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushSettings() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(false);

  async function enablePush() {
    setBusy(true);
    setMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("This browser does not support web push. Try installing the app in a supported browser.");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push notifications are not configured for this site yet.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notifications are blocked. Allow notifications for this site in your browser settings, then try again.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(key) });
      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not enable push notifications.");
      setEnabled(true);
      setMessage("Push notifications are enabled on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable push notifications.");
    } finally {
      setBusy(false);
    }
  }

  const isAppleMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isInstalled = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
  return (
    <div className="push-settings">
      <button className="button button-secondary" type="button" onClick={() => void enablePush()} disabled={busy || enabled}>
        {busy ? "Enabling…" : enabled ? "Push enabled" : "Enable push notifications"}
      </button>
      {isAppleMobile && !isInstalled && <p className="empty-note">On iPhone or iPad, add MT Club to your Home Screen first, then enable push notifications here.</p>}
      {message && <p className="form-message" role="status">{message}</p>}
    </div>
  );
}
