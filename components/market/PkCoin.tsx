/** The PK Coin: a red-and-blue split coin with "PK" on it (the PK Shop's currency, never mixed with coins). */
export function PkCoin({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#ffd36b" />
      <path d="M12 2.6a9.4 9.4 0 0 0 0 18.8z" fill="#e2324f" />
      <path d="M12 2.6a9.4 9.4 0 0 1 0 18.8z" fill="#2f6bf0" />
      <path d="M13.4 3.2 10 12h3l-2.4 8.8" fill="none" stroke="#ffe9a8" strokeWidth="1.3" strokeLinejoin="round" />
      <text x="12" y="15.4" textAnchor="middle" fontSize="8.6" fontWeight="900" fill="#fff" stroke="#3a1730" strokeWidth="0.5" paintOrder="stroke" fontFamily="system-ui, sans-serif">
        PK
      </text>
    </svg>
  );
}

export const formatPk = (n: number) => Math.max(0, Math.floor(n)).toLocaleString("en-IN");
