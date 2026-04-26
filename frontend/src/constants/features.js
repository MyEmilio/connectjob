// Feature flags — control which pages/features show up in the UI.
// To re-enable a hidden feature, flip its flag to true (no rebuild needed
// since these are bundled at build time, but the codebase remains intact).
//
// Strategic decision (Feb 2026): "MVP-focused UI" — hide everything that
// doesn't directly support: find job → apply → chat → pay.
// Hidden features are NOT deleted — they remain in /pages and /routes,
// only their entry points in the nav are removed.

const FEATURES = {
  // CORE — always visible
  home: true,
  jobs: true,
  map: true,
  chat: true,
  verify: true,    // profile/KYC
  pricing: true,
  post_job: true,  // employer only
  escrow: true,    // payment flow

  // HIDDEN for MVP (focus on conversion, not feature breadth)
  analytics: false,   // graphs / advanced stats
  calendar: false,    // event calendar
  contract: false,    // formal contract signing
  reviews: false,     // dedicated reviews page (rating still works inline)
  admin: false,       // admin panel — accessible via direct URL only
};

export const isFeatureEnabled = (key) => FEATURES[key] !== false;

export default FEATURES;
