"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import DownloadCount from "./DownloadCount";
import DownloadButton from "./DownloadButton";
import Icon from "./Icon";

const links = [
  ["/", "Home"],
  ["/about", "About"],
  ["/docs", "Docs"],
  ["/contact", "Contact"],
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const toggle = useRef(null);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    function outside(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 960px)");
    function resize() {
      if (desktop.matches) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", outside);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", outside);
      desktop.removeEventListener("change", resize);
    };
  }, [open]);

  return (
    <header className="site-header" ref={root}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="header-inner">
        <Logo showVersion />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <DownloadCount />
          <div className="desktop-download">
            <DownloadButton header windows label="Download Windows" />
          </div>
          <button
            className="menu-toggle"
            ref={toggle}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label="Mobile navigation"
        hidden={!open}
        onBlur={(event) => {
          if (!root.current?.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
            <Icon name="arrow" />
          </Link>
        ))}
        <DownloadButton windows label="Download for Windows" />
        <small>Windows 10/11 · 64-bit</small>
      </nav>
    </header>
  );
}
