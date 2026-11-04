"use client";

/** A festive toran of small hanging lanterns across the top (decoration only). */
export function Toran() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 top-0 h-14 w-full opacity-70" viewBox="0 0 400 56" preserveAspectRatio="none" aria-hidden>
      <path d="M0 6 Q100 26 200 6 T400 6" fill="none" stroke="#e7bc72" strokeOpacity=".45" strokeWidth="1.2" />
      {[30, 85, 140, 200, 260, 315, 370].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={i % 2 ? 14 : 12} x2={x} y2={i % 2 ? 26 : 22} stroke="#e7bc72" strokeOpacity=".5" strokeWidth="1" />
          <path d={`M${x - 5} ${i % 2 ? 26 : 22} h10 l-2 9 h-6 Z`} fill={i % 3 === 0 ? "#f4515b" : i % 3 === 1 ? "#e7bc72" : "#ff8a5b"} opacity=".8" />
          <circle cx={x} cy={(i % 2 ? 26 : 22) + 4} r="6" fill="#ffcf7a" opacity=".12" />
        </g>
      ))}
    </svg>
  );
}
