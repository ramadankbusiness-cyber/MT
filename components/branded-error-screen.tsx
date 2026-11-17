"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import englishMessages from "@/messages/en.json";
import arabicMessages from "@/messages/ar.json";

export type ErrorScreenVariant = "404" | "500" | "403" | "offline";

type Props = {
  variant: ErrorScreenVariant;
  errorId?: string;
  onRetry?: () => void;
};

export function BrandedErrorScreen({ variant, errorId, onRetry }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const content = (locale === "ar" ? arabicMessages : englishMessages).site.errorPages;
  const title = variant === "404" ? content.notFoundTitle : variant === "500" ? content.serverTitle : variant === "403" ? content.forbiddenTitle : content.offlineTitle;
  const message = variant === "404" ? content.notFoundMessage : variant === "500" ? content.serverMessage : variant === "403" ? content.forbiddenMessage : content.offlineMessage;

  useEffect(() => {
    const activeLocale = window.location.pathname.split("/")[1] === "ar" || document.documentElement.lang === "ar" ? "ar" : "en";
    setLocale(activeLocale);
    document.documentElement.lang = activeLocale;
    document.documentElement.dir = activeLocale === "ar" ? "rtl" : "ltr";
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

  const reportHref = `mailto:?subject=${encodeURIComponent(content.emailSubject)}&body=${encodeURIComponent(`${locale === "ar" ? "رقم الخطأ" : "Error ID"}: ${errorId ?? content.errorUnavailable}\nPage: ${typeof window === "undefined" ? "" : window.location.pathname}`)}`;

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
        <p className="error-code">{variant}</p>
        <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
        <p className="error-message">{message}</p>
        {errorId && <p className="error-reference">{content.errorId.replace("{id}", errorId)}</p>}
        <div className="error-actions">
          {onRetry && <button className="button button-primary" type="button" onClick={onRetry}>{content.retry}</button>}
          <Link className={`button ${onRetry ? "button-secondary" : "button-primary"}`} href="/">{content.backHome}</Link>
          <button className="button button-secondary" type="button" onClick={() => history.back()}>{content.goBack}</button>
        </div>
        {errorId && <a className="error-report" href={reportHref}>{content.report}</a>}
      </section>
    </main>
  );
}
