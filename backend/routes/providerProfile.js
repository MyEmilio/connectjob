const express = require("express");
const auth = require("../middleware/auth");
const ProviderProfile = require("../models/ProviderProfile");
const User = require("../models/User");
const logger = require("../utils/logger");

const router = express.Router();

// GET /api/provider-profile — current user's profile (creates empty if missing)
router.get("/", auth, async (req, res) => {
  try {
    let profile = await ProviderProfile.findOne({ user_id: req.user.id }).lean();
    if (!profile) {
      profile = {
        user_id: req.user.id,
        service_categories: [],
        hourly_rate: 0,
        lat: null,
        lng: null,
        city: "",
        description: "",
      };
    } else {
      delete profile._id;
      delete profile.__v;
    }
    res.json(profile);
  } catch (err) {
    logger.error("get provider-profile error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/provider-profile — update current user's profile
router.put("/", auth, async (req, res) => {
  try {
    const { service_categories, hourly_rate, lat, lng, city, description } = req.body;
    const update = {};
    if (service_categories !== undefined) update.service_categories = service_categories;
    if (hourly_rate !== undefined) update.hourly_rate = Math.max(0, parseFloat(hourly_rate) || 0);
    if (lat !== undefined) update.lat = lat === null ? null : parseFloat(lat);
    if (lng !== undefined) update.lng = lng === null ? null : parseFloat(lng);
    if (city !== undefined) update.city = String(city || "").slice(0, 120);
    if (description !== undefined) update.description = String(description || "").slice(0, 500);

    const profile = await ProviderProfile.findOneAndUpdate(
      { user_id: req.user.id },
      { $set: update },
      { new: true, upsert: true, lean: true }
    );
    delete profile._id;
    delete profile.__v;
    logger.info("Provider profile updated", { userId: req.user.id, hasLocation: !!(update.lat && update.lng) });
    res.json({ success: true, profile });
  } catch (err) {
    logger.error("update provider-profile error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
