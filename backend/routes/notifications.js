const express = require("express");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const User = require("../models/User");
const {
  saveSubscription,
  removeSubscription,
  getVapidPublicKey,
} = require("../utils/pushService");

const router = express.Router();

// GET /api/notifications/vapid-public-key
// Returns the VAPID public key for client-side subscription
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// POST /api/notifications/subscribe
// Subscribe to push notifications
router.post("/subscribe", auth, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Subscription invalidă" });
    }

    await saveSubscription(req.user.id, subscription);
    
    logger.info("User subscribed to push notifications", { userId: req.user.id });
    res.json({ success: true, message: "Notificări activate!" });
  } catch (err) {
    logger.error("Push subscribe error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/unsubscribe
// Unsubscribe from push notifications
router.post("/unsubscribe", auth, async (req, res) => {
  try {
    await removeSubscription(req.user.id);
    
    logger.info("User unsubscribed from push notifications", { userId: req.user.id });
    res.json({ success: true, message: "Notificări dezactivate" });
  } catch (err) {
    logger.error("Push unsubscribe error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/preferences
// Get user's notification preferences
router.get("/preferences", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("favorite_categories notify_new_jobs notify_messages notify_applications push_subscription")
      .lean();
    
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      favorite_categories: user.favorite_categories || [],
      notify_new_jobs: user.notify_new_jobs !== false,
      notify_messages: user.notify_messages !== false,
      notify_applications: user.notify_applications !== false,
      is_subscribed: !!user.push_subscription,
    });
  } catch (err) {
    logger.error("Get preferences error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/preferences
// Update user's notification preferences
router.put("/preferences", auth, async (req, res) => {
  try {
    const { 
      favorite_categories, 
      notify_new_jobs, 
      notify_messages, 
      notify_applications 
    } = req.body;

    const updateData = {};
    
    if (Array.isArray(favorite_categories)) {
      // Validate categories - max 10
      updateData.favorite_categories = favorite_categories.slice(0, 10).map(c => c.toLowerCase());
    }
    if (typeof notify_new_jobs === "boolean") {
      updateData.notify_new_jobs = notify_new_jobs;
    }
    if (typeof notify_messages === "boolean") {
      updateData.notify_messages = notify_messages;
    }
    if (typeof notify_applications === "boolean") {
      updateData.notify_applications = notify_applications;
    }

    await User.findByIdAndUpdate(req.user.id, updateData);
    
    logger.info("Notification preferences updated", { userId: req.user.id, updateData });
    res.json({ success: true, message: "Preferințe salvate!" });
  } catch (err) {
    logger.error("Update preferences error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/favorite-category
// Add a category to favorites
router.post("/favorite-category", auth, async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: "Categoria este obligatorie" });
    }

    const user = await User.findById(req.user.id);
    const categories = user.favorite_categories || [];
    
    if (categories.length >= 10) {
      return res.status(400).json({ error: "Poți avea maxim 10 categorii favorite" });
    }

    const normalizedCategory = category.toLowerCase();
    if (!categories.includes(normalizedCategory)) {
      categories.push(normalizedCategory);
      await User.findByIdAndUpdate(req.user.id, { favorite_categories: categories });
    }

    logger.info("Category added to favorites", { userId: req.user.id, category });
    res.json({ success: true, favorite_categories: categories });
  } catch (err) {
    logger.error("Add favorite category error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/favorite-category/:category
// Remove a category from favorites
router.delete("/favorite-category/:category", auth, async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category).toLowerCase();
    
    const user = await User.findById(req.user.id);
    const categories = (user.favorite_categories || []).filter(c => c !== category);
    
    await User.findByIdAndUpdate(req.user.id, { favorite_categories: categories });

    logger.info("Category removed from favorites", { userId: req.user.id, category });
    res.json({ success: true, favorite_categories: categories });
  } catch (err) {
    logger.error("Remove favorite category error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
