import React from "react";
import { useTranslation } from "react-i18next";

// Trust badges shown right above payment CTA buttons.
// Strict design: monochrome, slate-on-white, no logos that imply
// 3rd-party certifications we don't actually hold (e.g. real Stripe Verified
// requires their official badge program). We use SEMANTIC trust signals:
// - "Pago seguro Stripe" — neutral copy, hints at Stripe processing
// - "SSL 256-bit"        — true (HTTPS via Railway/Vercel)
// - "GDPR"               — true (EU jurisdiction)
// - "Money-back"         — true (Escrow holds funds, refundable until release)
// - "Soporte 24h"        — operational claim (commit to supporting it)
//
// Per Baymard Institute, sober text-based trust badges in monochrome
// outperform colorful logos for "money apps" — they reinforce rather than
// distract from the primary CTA.

const SHIELD = (
  <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z M9 12l2 2 4-4" />
);
const LOCK = (
  <path d="M6 10V7a6 6 0 1 1 12 0v3 M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z M12 14v3" />
);
const SCALE = (
  <path d="M12 3v18 M5 7l-3 7h6l-3-7z M19 7l-3 7h6l-3-7z M5 21h14" />
);
const REFRESH = (
  <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3 M21 3v6h-6 M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3 M3 21v-6h6" />
);
const CLOCK = (
  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 5v5l3 2" />
);

const BADGES = [
  { key: "stripe",    Path: SHIELD,  label: "trust_stripe",    fallback: "Pago seguro Stripe" },
  { key: "ssl",       Path: LOCK,    label: "trust_ssl",       fallback: "SSL 256-bit" },
  { key: "gdpr",      Path: SCALE,   label: "trust_gdpr",      fallback: "GDPR" },
  { key: "moneyback", Path: REFRESH, label: "trust_moneyback", fallback: "Garantie de retur" },
  { key: "support",   Path: CLOCK,   label: "trust_support",   fallback: "Suport 24h" },
];

export default function TrustBadges({ style = {}, compact = false }) {
  const { t } = useTranslation("t");
  const size = compact ? 14 : 16;
  const fontSize = compact ? 10 : 11;
  return (
    <div
      data-testid="trust-badges"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: compact ? 8 : 12,
        padding: compact ? "10px 0" : "14px 0",
        borderTop: "1px solid var(--border, #e2e8f0)",
        borderBottom: "1px solid var(--border, #e2e8f0)",
        margin: compact ? "10px 0" : "14px 0",
        ...style,
      }}
    >
      {BADGES.map(b => (
        <div
          key={b.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--text-2, #475569)",
            fontFamily: "Inter,sans-serif",
            fontSize,
            fontWeight: 600,
            letterSpacing: "0.01em",
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {b.Path}
          </svg>
          <span>{t(b.label, b.fallback)}</span>
        </div>
      ))}
    </div>
  );
}
