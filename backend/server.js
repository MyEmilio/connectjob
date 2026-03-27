require("dotenv").config();
const express      = require("express");
const http         = require("http");
const cors         = require("cors");
const path         = require("path");
const { Server }   = require("socket.io");
const jwt          = require("jsonwebtoken");
const rateLimit    = require("express-rate-limit");
const mongoose     = require("mongoose");
const db           = require("./db/database");

// ── Conexiune MongoDB ──────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectat"))
  .catch(err => { console.error("❌ MongoDB eroare:", err.message); process.exit(1); });

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
];

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true }
});

// ── Rate limiters ──────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 20,
  message: { error: "Prea multe incercari. Incearca din nou dupa 15 minute." },
  standardHeaders: true, legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 5,
  message: { error: "Limita de SMS depasita. Incearca din nou dupa o ora." },
  standardHeaders: true, legacyHeaders: false,
});

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes ─────────────────────────────────────────────────────
app.use("/api/auth",      authLimiter, require("./routes/auth"));
app.use("/api/jobs",      require("./routes/jobs"));
app.use("/api/messages",  require("./routes/messages"));
app.use("/api/payments",  require("./routes/payments"));
app.use("/api/reviews",   require("./routes/reviews"));
app.use("/api/contracts", require("./routes/contracts"));
app.use("/api/kyc",       require("./routes/kyc"));
app.use("/api/reports",  require("./routes/reports"));

// ── Health check ───────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ── Socket.io — mesagerie in timp real ────────────────────────
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

  console.log(`✅ User ${userId} conectat (${socket.id})`);

  // Trimite mesaj
  socket.on("send_message", async ({ conversation_id, text }) => {
    if (!text?.trim()) return;
    const conv = await db.findConversationById(conversation_id);
    if (!conv || (String(conv.user1_id) !== String(userId) && String(conv.user2_id) !== String(userId))) return;

    const msg = await db.createMessage({ conversation_id, sender_id: userId, text: text.trim() });
    const otherId = String(conv.user1_id) === String(userId) ? String(conv.user2_id) : String(conv.user1_id);
    socket.emit("new_message", msg);
    const otherSocket = onlineUsers.get(otherId);
    if (otherSocket) io.to(otherSocket).emit("new_message", msg);
  });

  // Indicator "scrie..."
  socket.on("typing", async ({ conversation_id, is_typing }) => {
    const conv = await db.findConversationById(conversation_id);
    if (!conv) return;
    const otherId = String(conv.user1_id) === String(userId) ? String(conv.user2_id) : String(conv.user1_id);
    const otherSocket = onlineUsers.get(otherId);
    if (otherSocket) io.to(otherSocket).emit("typing", { conversation_id, user_id: userId, is_typing });
  });

  // Intra in camera unei conversatii
  socket.on("join_conversation", (conversation_id) => {
    socket.join(`conv_${conversation_id}`);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("online_users", Array.from(onlineUsers.keys()));
    console.log(`❌ User ${userId} deconectat`);
  });
});

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 ConnectJob Backend pornit pe portul ${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
