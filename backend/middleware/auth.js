const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// Throttle map: last update per user (60s window)
const lastTouch = new Map();
const TOUCH_THROTTLE_MS = 60 * 1000;

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token lipsa" });
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Verifica daca contul e activ (nu suspendat/banat)
    const user = await User.findById(decoded.id).select("status").lean();
    if (user?.status === "banned") {
      return res.status(403).json({ error: "Contul tau a fost suspendat permanent pentru incalcarea termenilor ConnectJob." });
    }
    if (user?.status === "suspended") {
      return res.status(403).json({ error: "Contul tau este temporar suspendat. Contacteaza support@connectjob.ro pentru detalii." });
    }

    // Touch last_seen (throttled, fire-and-forget)
    const now = Date.now();
    const prev = lastTouch.get(decoded.id) || 0;
    if (now - prev > TOUCH_THROTTLE_MS) {
      lastTouch.set(decoded.id, now);
      User.updateOne({ _id: decoded.id }, { $set: { last_seen: new Date(now) } }).catch(() => {});
    }

    next();
  } catch {
    res.status(401).json({ error: "Token invalid sau expirat" });
  }
};
