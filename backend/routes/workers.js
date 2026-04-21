const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const logger = require("../utils/logger");

const router = express.Router();

// Haversine distance helper
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

// Privacy offset ±300m (~0.0027° lat) — deterministic per user so it doesn't jitter
function privacyOffset(userId) {
  const seed = String(userId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = (seed % 360) * (Math.PI / 180);
  const dist = 0.0018 + ((seed % 100) / 100) * 0.0009; // 200-300m
  return { dLat: Math.sin(angle) * dist, dLng: Math.cos(angle) * dist };
}

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

// Demo workers for map when DB is empty (España / Alicante area)
const DEMO_WORKERS = [
  { id: "demo-w1", name: "María García", initials: "MG", rating: 4.8, reviews_count: 24, skills: ["Limpieza", "Jardinería"], hourly_rate: 12, lat: 38.3452, lng: -0.4810, verified: true, is_demo: true, is_online: true },
  { id: "demo-w2", name: "Carlos Ruiz", initials: "CR", rating: 4.9, reviews_count: 31, skills: ["Construcción", "Electricidad"], hourly_rate: 18, lat: 38.3520, lng: -0.4900, verified: true, is_demo: true, is_online: false },
  { id: "demo-w3", name: "Ana López", initials: "AL", rating: 4.7, reviews_count: 12, skills: ["Cuidado niños", "Cocina"], hourly_rate: 10, lat: 38.3380, lng: -0.4720, verified: true, is_demo: true, is_online: true },
  { id: "demo-w4", name: "Javier Moreno", initials: "JM", rating: 4.6, reviews_count: 18, skills: ["Transporte", "Mudanzas"], hourly_rate: 15, lat: 38.3580, lng: -0.4650, verified: true, is_demo: true, is_online: false },
  { id: "demo-w5", name: "Laura Vila", initials: "LV", rating: 5.0, reviews_count: 8, skills: ["Paseo perros", "Cuidado mascotas"], hourly_rate: 8, lat: 38.3420, lng: -0.4890, verified: true, is_demo: true, is_online: true },
];

// GET /api/workers/available — returns verified workers with approximate location
router.get("/available", auth, async (req, res) => {
  try {
    const { lat, lng, radius = 50, limit = 50, category, online_only } = req.query;

    // Get verified workers with approximate location derived from jobs they've applied to (or profile coords later)
    // For now: return users with role=worker & verified=true
    const users = await User.find({ role: "worker", verified: true, status: "active" })
      .select("name initials rating reviews_count skills avatar verified last_seen")
      .lean();

    // Get provider profiles for hourly_rate, categories
    const profiles = await ProviderProfile.find({
      user_id: { $in: users.map(u => u._id) },
    }).lean();

    const profilesMap = {};
    profiles.forEach(p => { profilesMap[String(p.user_id)] = p; });

    // Build workers list — only those with a location can appear on map
    const now = Date.now();
    let workers = users
      .map(u => {
        const profile = profilesMap[String(u._id)];
        if (!profile || !profile.lat || !profile.lng) return null;
        const off = privacyOffset(u._id);
        const isOnline = u.last_seen && (now - new Date(u.last_seen).getTime() < ONLINE_WINDOW_MS);
        return {
          id: String(u._id),
          name: u.name,
          initials: u.initials || (u.name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
          rating: u.rating || 0,
          reviews_count: u.reviews_count || 0,
          skills: u.skills || profile.service_categories || [],
          avatar: u.avatar,
          hourly_rate: profile.hourly_rate || 0,
          verified: u.verified,
          lat: profile.lat + off.dLat,
          lng: profile.lng + off.dLng,
          is_demo: false,
          is_online: !!isOnline,
        };
      })
      .filter(Boolean);

    // If no real workers, return demo workers so UI can be showcased
    if (workers.length === 0) {
      workers = DEMO_WORKERS;
    }

    // Filter by category
    if (category && category !== "all") {
      workers = workers.filter(w =>
        (w.skills || []).some(s => s.toLowerCase().includes(String(category).toLowerCase()))
      );
    }

    // Filter online only
    if (online_only === "true" || online_only === "1") {
      workers = workers.filter(w => w.is_online);
    }

    // Compute distance & filter by radius
    if (lat && lng) {
      const uLat = parseFloat(lat), uLng = parseFloat(lng);
      workers = workers
        .map(w => ({ ...w, distance: haversineKm(uLat, uLng, w.lat, w.lng) }))
        .filter(w => w.distance <= parseFloat(radius));
    }

    workers.sort((a, b) => {
      // Online users first, then by distance
      if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
      return (a.distance ?? 999) - (b.distance ?? 999);
    });

    res.json({
      workers: workers.slice(0, parseInt(limit)),
      total: workers.length,
    });
  } catch (err) {
    logger.error("workers/available error:", err);
    res.status(500).json({ error: "Error loading workers" });
  }
});

module.exports = router;
