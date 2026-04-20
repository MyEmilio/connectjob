require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const db = require("./db/database");
const logger = require("./utils/logger");

// ── MongoDB Connection ─────────────────────────────────────────
const mongoUri = process.env.MONGO_URI;
const mongoOpts = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
};
mongoose
  .connect(mongoUri, mongoOpts)
  .then(() => logger.info("MongoDB connected successfully"))
  .catch((err) => {
    logger.error("MongoDB connection error", { error: err.message });
    logger.warn("Server continues in degraded mode — MongoDB unavailable");
  });

// Track MongoDB connection state
mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});
mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});

// ── CORS Configuration ─────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  // Allow Emergent preview domains
  /\.preview\.emergentagent\.com$/,
  /\.preview\.emergentcf\.cloud$/,
].filter(Boolean);

const app = express();

// Trust proxy for rate limiting behind reverse proxy (Railway, Vercel, etc.)
app.set("trust proxy", 1);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

// ── Security Middleware ────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable for API
  })
);

// ── Rate Limiters ──────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Prea multe cereri. Incearca din nou mai tarziu." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health", // Skip health checks
  validate: { xForwardedForHeader: false },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Prea multe incercari. Incearca din nou dupa 15 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: "Limita de SMS depasita. Incearca din nou dupa o ora." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// ── CORS Middleware ────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin matches any allowed origin (string or regex)
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
        if (typeof allowed === "string") return allowed === origin;
        if (allowed instanceof RegExp) return allowed.test(origin);
        return false;
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
      logger.warn("CORS blocked origin", { origin });
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ── Body Parsing with Size Limits ──────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Static Files ───────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Apply General Rate Limiter to All API Routes ───────────────
app.use("/api", generalLimiter);

// ── Routes ─────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/contracts", require("./routes/contracts"));
app.use("/api/kyc", require("./routes/kyc"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/translate", require("./routes/translate"));
app.use("/api/subscriptions", require("./routes/subscriptions"));
app.use("/api/uploads", require("./routes/uploads"));
app.use("/api/workers", require("./routes/workers"));
app.use("/api/speech", require("./routes/speech"));

// ── Health Check ───────────────────────────────────────────────
const startTime = Date.now();
app.get("/api/health", (_, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

  res.json({
    status: dbState === 1 ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    database: dbStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

// ── Production Config Status ──────────────────────────────────
app.get("/api/config/status", (_, res) => {
  const { isEmailConfigured } = require("./utils/emailService");
  const { isCloudinaryConfigured } = require("./utils/cloudinary");
  const { getVapidPublicKey } = require("./utils/pushService");

  const stripeConfigured = !!((process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY) && !(process.env.STRIPE_SECRET_KEY || "").includes("ADAUGA") && (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY) !== "sk_test_emergent");
  const emailConfigured = isEmailConfigured();
  const cloudinaryConfigured = isCloudinaryConfigured();
  const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  const jwtConfigured = !!(process.env.JWT_SECRET && process.env.JWT_SECRET.length > 32);

  const services = {
    database: { status: mongoose.connection.readyState === 1 ? "active" : "inactive", details: "MongoDB" },
    stripe: { status: stripeConfigured ? "active" : "simulated", details: stripeConfigured ? "Stripe live/test" : "Mod simulat — adaugă STRIPE_SECRET_KEY în .env" },
    email: { status: emailConfigured ? "active" : "inactive", details: emailConfigured ? "SMTP configurat" : "Adaugă EMAIL_USER + EMAIL_PASS în .env" },
    cloudinary: { status: cloudinaryConfigured ? "active" : "local", details: cloudinaryConfigured ? "Cloud uploads" : "Fallback local — adaugă CLOUDINARY_* în .env" },
    push_notifications: { status: vapidConfigured ? "active" : "inactive", details: vapidConfigured ? "VAPID configurat" : "Adaugă VAPID_* în .env" },
    jwt: { status: jwtConfigured ? "secure" : "weak", details: jwtConfigured ? "JWT secret puternic" : "JWT secret prea scurt" },
  };

  const activeCount = Object.values(services).filter(s => s.status === "active" || s.status === "secure").length;
  const totalCount = Object.keys(services).length;

  res.json({
    production_ready: activeCount === totalCount,
    active_services: `${activeCount}/${totalCount}`,
    services,
    vapid_public_key: getVapidPublicKey(),
  });
});

// ── Error Handling Middleware ──────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ error: "Eroare interna de server" });
});

// ── 404 Handler ────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn("Route not found", { path: req.path, method: req.method });
  res.status(404).json({ error: "Ruta negasita" });
});

// ── Socket.io — Real-time Messaging ────────────────────────────
const onlineUsers = new Map(); // userId → socketId

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Token lipsa"));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Token invalid"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user.id;
  onlineUsers.set(userId, socket.id);
  io.emit("online_users", Array.from(onlineUsers.keys()));

  logger.debug("User connected", { userId, socketId: socket.id });

  // Send message
  socket.on("send_message", async ({ conversation_id, text }) => {
    if (!text?.trim()) return;
    try {
      const conv = await db.findConversationById(conversation_id);
      if (
        !conv ||
        (String(conv.user1_id) !== String(userId) &&
          String(conv.user2_id) !== String(userId))
      )
        return;

      // Chat moderation
      const { moderateMessage } = require("./utils/chatModerationService");
      const User = require("./models/User");
      const sender = await User.findById(userId).lean();
      const modResult = moderateMessage(text.trim(), sender?.subscription_plan || "free");
      if (!modResult.allowed) {
        socket.emit("message_blocked", {
          conversation_id,
          reason: modResult.reason,
          category: modResult.category,
        });
        return;
      }

      const msg = await db.createMessage({
        conversation_id,
        sender_id: userId,
        text: text.trim(),
      });
      const otherId =
        String(conv.user1_id) === String(userId)
          ? String(conv.user2_id)
          : String(conv.user1_id);
      socket.emit("new_message", msg);
      const otherSocket = onlineUsers.get(otherId);
      if (otherSocket) io.to(otherSocket).emit("new_message", msg);
    } catch (err) {
      logger.error("Socket send_message error", { userId, error: err.message });
    }
  });

  // Typing indicator
  socket.on("typing", async ({ conversation_id, is_typing }) => {
    try {
      const conv = await db.findConversationById(conversation_id);
      if (!conv) return;
      const otherId =
        String(conv.user1_id) === String(userId)
          ? String(conv.user2_id)
          : String(conv.user1_id);
      const otherSocket = onlineUsers.get(otherId);
      if (otherSocket)
        io.to(otherSocket).emit("typing", {
          conversation_id,
          user_id: userId,
          is_typing,
        });
    } catch (err) {
      logger.error("Socket typing error", { userId, error: err.message });
    }
  });

  // Join conversation room
  socket.on("join_conversation", (conversation_id) => {
    socket.join(`conv_${conversation_id}`);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("online_users", Array.from(onlineUsers.keys()));
    logger.debug("User disconnected", { userId });
  });
});

// ── Graceful Shutdown ──────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await mongoose.connection.close();
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ── Start Server ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`ConnectJob Backend started`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development",
    apiUrl: `http://localhost:${PORT}/api`,
  });
});
