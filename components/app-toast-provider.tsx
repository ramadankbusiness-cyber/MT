"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setMessage(""), 4500);
  }, []);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && <div className="app-toast" role="alert" aria-live="assertive">{message}</div>}
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  return useContext(ToastContext);
}
