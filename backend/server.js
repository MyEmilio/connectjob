require("dotenv").config();
const express   = require("express");
const http      = require("http");
const cors      = require("cors");
const path      = require("path");
const { Server } = require("socket.io");
const jwt       = require("jsonwebtoken");
const db        = require("./db/database");

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
];

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true }
});

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes ─────────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/jobs",      require("./routes/jobs"));
app.use("/api/messages",  require("./routes/messages"));
app.use("/api/payments",  require("./routes/payments"));
app.use("/api/reviews",   require("./routes/reviews"));
app.use("/api/contracts", require("./routes/contracts"));
app.use("/api/kyc",       require("./routes/kyc"));

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
  socket.on("send_message", ({ conversation_id, text }) => {
    if (!text?.trim()) return;
    const conv = db.findConversationById(parseInt(conversation_id));
    if (!conv || (conv.user1_id !== userId && conv.user2_id !== userId)) return;

    const msg = db.createMessage({ conversation_id: parseInt(conversation_id), sender_id: userId, text: text.trim() });
    const otherId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
    socket.emit("new_message", msg);
    const otherSocket = onlineUsers.get(otherId);
    if (otherSocket) io.to(otherSocket).emit("new_message", msg);
  });

  // Indicator "scrie..."
  socket.on("typing", ({ conversation_id, is_typing }) => {
    const conv = db.findConversationById(parseInt(conversation_id));
    if (!conv) return;
    const otherId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
    const otherSocket = onlineUsers.get(otherId);
    if (otherSocket) io.to(otherSocket).emit("typing", { conversation_id: parseInt(conversation_id), user_id: userId, is_typing });
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
  console.log(`\n🚀 JoobConnect Backend pornit pe portul ${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
