const express = require("express");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
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

    saveSubscription(req.user.id, subscription);
    
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
    removeSubscription(req.user.id);
    
    logger.info("User unsubscribed from push notifications", { userId: req.user.id });
    res.json({ success: true, message: "Notificări dezactivate" });
  } catch (err) {
    logger.error("Push unsubscribe error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
