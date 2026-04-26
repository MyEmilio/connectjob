// ConnectJob — Design tokens (colors only, NO text)
// Synced with CSS variables in index.css. Inter font, sober palette.
export const T = {
  // Brand
  green:"#16a34a", greenDark:"#15803d", greenLight:"#22c55e",
  // Semantic
  blue:"#3b82f6", blueDark:"#2563eb",
  amber:"#f59e0b", amberDark:"#d97706",
  purple:"#7c3aed",
  red:"#ef4444",
  // Surfaces (sober slate scale instead of warm stone)
  dark:"#0f172a", dark2:"#1e293b", dark3:"#334155",
  text:"#0f172a", text2:"#475569", text3:"#94a3b8",
  border:"#e2e8f0", bg:"#f8fafc", white:"#fff",
  // Aliases to ease redesign rollout
  primary:"#16a34a", primaryDark:"#15803d", primaryLight:"#22c55e",
};

// Categories — keys only, labels come from i18n
// Order = display priority. Strategic re-ordering (Feb 2026):
// digital/quick jobs first (high-margin, hard to leave platform).
// Recurring services like "gradina" hidden via ENABLED flag — code intact.
export const CATEGORIES = [
  // PRIORITY 1 — Digital / IT (top-margin, AI-friendly, platform-locked)
  { key:"it",           icon:"\u{1F4BB}",         color:"#6366f1", subKeys:["sub_web_app","sub_pc_repair","sub_networks","sub_seo","sub_social_media","sub_design"] },
  // PRIORITY 2 — Quick local jobs (one-time, repeatable, hard to bypass platform)
  { key:"transport",    icon:"\u{1F697}",         color:"#3b82f6", subKeys:["sub_delivery","sub_taxi","sub_driver","sub_moving","sub_courier"] },
  { key:"reparatii",    icon:"\u{1F527}",         color:"#92400e", subKeys:["sub_auto","sub_appliances","sub_furniture","sub_computers","sub_watches"] },
  { key:"constructii",  icon:"\u{1F3D7}\uFE0F",   color:"#ea580c", subKeys:["sub_masonry","sub_painting","sub_plumbing","sub_carpentry","sub_electrical","sub_sanitary","sub_tiling"] },
  // PRIORITY 3 — Trust-sensitive services (need platform's escrow + verification)
  { key:"ingrijire",    icon:"\u{1F931}",         color:"#ec4899", subKeys:["sub_babysitting","sub_elderly","sub_disabled","sub_au_pair"] },
  { key:"animale",      icon:"\u{1F43E}",         color:"#7c3aed", subKeys:["sub_walking","sub_care","sub_training","sub_pet_sitting","sub_vet"] },
  // PRIORITY 4 — Event-based (one-time, fits platform model)
  { key:"evenimente",   icon:"\u{1F389}",         color:"#0891b2", subKeys:["sub_photographer","sub_videographer","sub_musician","sub_animator","sub_organizer"] },
  { key:"gastronomie",  icon:"\u{1F468}\u200D\u{1F373}", color:"#ef4444", subKeys:["sub_chef","sub_waiter","sub_catering","sub_bartender","sub_pastry"] },
  // PRIORITY 5 — Education / occasional
  { key:"educatie",     icon:"\u{1F4DA}",         color:"#f59e0b", subKeys:["sub_tutoring","sub_languages","sub_music","sub_sports","sub_arts"] },
  // KEPT but lower priority (occasional cleanings only — recurring shouldn't use this)
  { key:"curatenie",    icon:"\u{1F9F9}",         color:"#16a34a", subKeys:["sub_domestic","sub_offices","sub_windows","sub_post_construction","sub_carpets"] },
  { key:"frumusete",    icon:"\u{1F485}",         color:"#db2777", subKeys:["sub_hairdresser","sub_aesthetics","sub_manicure","sub_massage","sub_makeup"] },
  // HIDDEN — recurring services bleed off-platform (per Feb 2026 strategy decision)
  // { key:"gradina",      icon:"\u{1F33F}",         color:"#16a34a", subKeys:["sub_lawn","sub_planting","sub_irrigation","sub_tree_cutting","sub_garden_design"] },
];
