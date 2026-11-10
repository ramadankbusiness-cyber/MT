"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

export type ErrorScreenVariant = "404" | "500" | "403" | "offline";

const copy: Record<ErrorScreenVariant, { code: string; title: string; message: string }> = {
  "404": {
    code: "404",
    title: "Page not found",
    message: "This page wandered off. Let’s get you back.",
  },
  "500": {
    code: "500",
    title: "Something went wrong",
    message: "Our robot hit a snag. Please try again.",
  },
  "403": {
    code: "403",
    title: "No access here",
    message: "You don’t have permission to view this page.",
  },
  offline: {
    code: "offline",
    title: "You’re offline",
    message: "Check your connection and try again.",
  },
};

type Props = {
  variant: ErrorScreenVariant;
  errorId?: string;
  onRetry?: () => void;
};

export function BrandedErrorScreen({ variant, errorId, onRetry }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const content = copy[variant];

  useEffect(() => {
    headingRef.current?.focus();
    if (errorId && variant === "500") {
      void fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId, route: window.location.pathname }),
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [errorId, variant]);

  const reportHref = `mailto:?subject=${encodeURIComponent("MT Club error report")}&body=${encodeURIComponent(`Error ID: ${errorId ?? "not available"}\nPage: ${typeof window === "undefined" ? "" : window.location.pathname}`)}`;

  return (
    <main id="main-content" className="branded-error" role="alert">
      <div className="error-orb error-orb-a" aria-hidden="true" />
      <div className="error-orb error-orb-b" aria-hidden="true" />
      <section className="error-content">
        <Image
          className="error-robot"
          src="/robot-error.png"
          width={300}
          height={300}
          priority
          unoptimized
          alt="A friendly MT Club robot mascot"
        />
        <p className="error-code">{content.code}</p>
        <h1 ref={headingRef} tabIndex={-1}>{content.title}</h1>
        <p className="error-message">{content.message}</p>
        {errorId && <p className="error-reference">Error ID: {errorId}</p>}
        <div className="error-actions">
          {onRetry && <button className="button button-primary" type="button" onClick={onRetry}>Try again</button>}
          <Link className={`button ${onRetry ? "button-secondary" : "button-primary"}`} href="/">Back to home</Link>
          <button className="button button-secondary" type="button" onClick={() => history.back()}>Go back</button>
        </div>
        {errorId && <a className="error-report" href={reportHref}>Report this problem</a>}
      </section>
    </main>
  );
}
