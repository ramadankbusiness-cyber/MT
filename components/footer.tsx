"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useSite } from "./site-provider";

export function Footer() {
  const { text } = useSite();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="brand" href="/" aria-label={text.nav.homeLabel}>
          <Image src="/mt-logo.png" alt="" width={34} height={34} />
          <span>MT Club</span>
        </Link>
        <p>{text.footer}</p>
      </div>
    </footer>
  );
}
