"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useSite } from "./site-provider";
import { NotificationBell } from "./notification-bell";

const links = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/events", key: "events" },
  { href: "/team", key: "team" },
  { href: "/join", key: "join" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const { text, language, toggleLanguage, toggleTheme } = useSite();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link className="brand" href="/" aria-label="MT Club home" onClick={() => setMenuOpen(false)}>
          <Image src="/mt-logo.png" alt="" width={38} height={38} priority />
          <span>MT Club</span>
        </Link>
        <nav id="site-navigation" className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          {links.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={pathname === href ? "nav-link active" : "nav-link"}
              onClick={() => setMenuOpen(false)}
            >
              {text.nav[key]}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="icon-button language-button" type="button" onClick={toggleLanguage} aria-label={`Switch language to ${language === "en" ? "Arabic" : "English"}`}>
            {text.nav.language}
          </button>
          <button className="icon-button theme-button" type="button" onClick={toggleTheme} aria-label={text.nav.theme}>
            <span aria-hidden="true">◐</span>
          </button>
          {session?.user ? (
            <div className="account-actions">
              <NotificationBell />
              <button className="avatar-button" type="button" aria-expanded={accountMenuOpen} aria-label="Account menu" onClick={() => setAccountMenuOpen((open) => !open)}>
                {session.user.image ? <Image src={session.user.image} alt="" width={34} height={34} /> : <span>{session.user.name?.slice(0, 1).toUpperCase() ?? "M"}</span>}
              </button>
              {accountMenuOpen && (
                <div className="account-menu">
                  <p>{session.user.name}</p>
                  <Link href="/dashboard" onClick={() => setAccountMenuOpen(false)}>Dashboard</Link>
                  <Link href="/attendance" onClick={() => setAccountMenuOpen(false)}>Attendance</Link>
                  {(session.user.role === "ADMIN" || session.user.role === "LEADER") && <Link href="/admin/reports" onClick={() => setAccountMenuOpen(false)}>Attendance reports</Link>}
                  <Link href="/excuses" onClick={() => setAccountMenuOpen(false)}>Excuse requests</Link>
                  <Link href="/profile" onClick={() => setAccountMenuOpen(false)}>My profile</Link>
                  <Link href="/notifications" onClick={() => setAccountMenuOpen(false)}>Notifications</Link>
                  {(session.user.role === "ADMIN" || session.user.role === "LEADER") && <Link href="/admin/notifications" onClick={() => setAccountMenuOpen(false)}>Send notifications</Link>}
                  {session.user.role === "ADMIN" && <>
                    <Link href="/admin/applications" onClick={() => setAccountMenuOpen(false)}>Membership applications</Link>
                    <Link href="/admin/users" onClick={() => setAccountMenuOpen(false)}>Manage accounts</Link>
                    <Link href="/admin/events" onClick={() => setAccountMenuOpen(false)}>Manage events</Link>
                    <Link href="/admin/zones" onClick={() => setAccountMenuOpen(false)}>Attendance zones</Link>
                    <Link href="/admin/audit" onClick={() => setAccountMenuOpen(false)}>Audit log</Link>
                  </>}
                  <button type="button" onClick={() => signOut({ callbackUrl: "/" })}>Log out</button>
                </div>
              )}
            </div>
          ) : <Link className="button button-secondary login-button" href="/login">Log in</Link>}
          {!session?.user && <Link className="button button-primary nav-join" href="/join">{text.nav.joinUs}<span aria-hidden="true">↗</span></Link>}
          <button className="icon-button menu-button" type="button" aria-label={text.nav.menu} aria-controls="site-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
