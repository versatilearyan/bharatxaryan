"use client";

import { useRef } from "react";

/**
 * Six boxes for a numeric code. Typing moves to the next box, Backspace goes
 * back, arrows move around, and pasting (or the phone's "From Messages"
 * suggestion) fills every box at once.
 */
export function OtpInput({ value, onChange, length = 6, invalid = false, disabled = false, autoFocus = false, onComplete, describedBy }: { value: string; onChange: (v: string) => void; length?: number; invalid?: boolean; disabled?: boolean; autoFocus?: boolean; onComplete?: (v: string) => void; describedBy?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const setFrom = (start: number, text: string) => {
    const clean = text.replace(/\D/g, "");
    if (!clean) return;
    const next = (value.slice(0, start) + clean).slice(0, length);
    onChange(next);
    focus(next.length >= length ? length - 1 : next.length);
    if (next.length === length) onComplete?.(next);
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label={`${length}-digit code`}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? length : 1}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              onChange(value.slice(0, i) + value.slice(i + 1));
              return;
            }
            const typed = v.replace(/\D/g, "");
            if (!typed) return;
            // Several digits at once: autofill or a paste into one box
            if (typed.length > 1 && (i === 0 || !digits[i])) return setFrom(Math.min(i, value.length), typed);
            const c = typed.slice(-1);
            if (i < value.length) {
              // Overwrite a digit in place
              const next = value.slice(0, i) + c + value.slice(i + 1);
              onChange(next);
              focus(i + 1);
              if (next.length === length) onComplete?.(next);
            } else setFrom(value.length, c);
          }}
          onPaste={(e) => {
            e.preventDefault();
            setFrom(0, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              e.preventDefault();
              onChange(value.slice(0, i - 1));
              focus(i - 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              focus(i - 1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              focus(i + 1);
            }
          }}
          className={`h-14 w-full min-w-0 max-w-[52px] rounded-2xl bg-surface text-center font-display text-[24px] font-extrabold text-cream caret-gold outline-none ring-1 transition-shadow focus:ring-2 disabled:opacity-60 ${invalid ? "ring-[#ff8a8f] focus:ring-[#ff8a8f]" : d ? "ring-gold/50 focus:ring-gold" : "ring-line focus:ring-gold"}`}
        />
      ))}
    </div>
  );
}
