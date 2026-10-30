"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";
import { NAV_LINKS } from "@/lib/site";
import { MusicToggle } from "@/components/MusicToggle";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("#home");

  // Highlight the nav link for the section currently in view
  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || open ? "border-b border-line bg-ink/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#home" className="rounded-lg pt-2" aria-label="Panchayat home">
          <Logo size="1.55rem" />
        </a>

        <div className="ml-auto hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={active === l.href ? "location" : undefined}
              className={`relative rounded-xl px-4 py-2 text-[0.92rem] font-medium transition-colors hover:text-cream ${
                active === l.href ? "text-cream" : "text-cream/65"
              }`}
            >
              {l.label}
              {active === l.href ? (
                <motion.span
                  layoutId="nav-active"
                  aria-hidden
                  className="absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-coral to-gold"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
            </a>
          ))}
          </div>

        <div className="flex items-center gap-2 md:ml-3">
          <MusicToggle />
          <Link href="/" className={buttonClass("ghost", "hidden !px-4 !py-2.5 text-sm sm:inline-flex")}>
            Open the app
          </Link>
          <span className="hidden md:block">
            <a href="#waitlist" className={buttonClass("primary", "!px-5 !py-2.5 text-sm")}>
              Join the Waitlist
            </a>
          </span>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong text-cream md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "x" : "menu"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.span>
          </AnimatePresence>
        </button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            key="mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden md:hidden"
          >
            <motion.ul
              className="flex flex-col gap-1 px-4 pb-6 pt-2"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}
            >
              {NAV_LINKS.map((l) => (
                <motion.li key={l.href} variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-3 font-display text-2xl font-semibold text-cream hover:bg-cream/5"
                  >
                    {l.label}
                  </a>
                </motion.li>
              ))}
              <motion.li variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="pt-3">
                <a href="#waitlist" onClick={() => setOpen(false)} className={buttonClass("primary", "w-full")}>
                  Join the Waitlist
                </a>
              </motion.li>
            </motion.ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
