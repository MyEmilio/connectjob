// Tier & commission helpers — single source of truth for pricing logic.
//
// Tier rules (Feb 2026, decided with founder):
//   • Founders        — first 100 users  → 0% commission, max 3 job posts
//   • Early Adopters  — users 101..300   → 3% flat commission
//   • Standard        — users 301+       → tiered by subscription plan:
//        free    → 7%
//        pro     → 5%
//        premium → 3%
//
// `signup_order` is set on registration (auto-incremented).
// Existing users without it are treated as "standard" (handled in payments route).

const FOUNDER_LIMIT = 100;
const EARLY_ADOPTER_LIMIT = 300;
const FOUNDER_MAX_POSTS = 3;

function getTier(user) {
  const order = user?.signup_order;
  if (!order || order < 1) return "standard";
  if (order <= FOUNDER_LIMIT) return "founder";
  if (order <= EARLY_ADOPTER_LIMIT) return "early_adopter";
  return "standard";
}

function getCommissionRate(user) {
  const tier = getTier(user);
  if (tier === "founder") return 0;
  if (tier === "early_adopter") return 0.03;
  // Standard tier — based on subscription plan
  const plan = user?.subscription_plan || "free";
  if (plan === "premium") return 0.03;
  if (plan === "pro") return 0.05;
  return 0.07; // free
}

function getTierInfo(user) {
  const tier = getTier(user);
  return {
    tier,
    commission_rate: getCommissionRate(user),
    is_founder: tier === "founder",
    is_early_adopter: tier === "early_adopter",
    founder_max_posts: tier === "founder" ? FOUNDER_MAX_POSTS : null,
  };
}

module.exports = {
  FOUNDER_LIMIT,
  EARLY_ADOPTER_LIMIT,
  FOUNDER_MAX_POSTS,
  getTier,
  getCommissionRate,
  getTierInfo,
};
