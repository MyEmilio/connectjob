const { LowSync } = require("lowdb");
const { JSONFileSync } = require("lowdb/node");
const path = require("path");

// Structura initiala a bazei de date
const defaultData = {
  users:         [],
  jobs:          [],
  applications:  [],
  conversations: [],
  messages:      [],
  reviews:       [],
  contracts:     [],
  payments:      [],
  otp_codes:     [],
  _counters: { users:0, jobs:0, applications:0, conversations:0, messages:0, reviews:0, contracts:0, payments:0, otp_codes:0 },
};

const adapter = new JSONFileSync(path.join(__dirname, "joobconnect.json"));
const db      = new LowSync(adapter, defaultData);
db.read();

// Auto-increment helper
const nextId = (table) => {
  db.data._counters[table] = (db.data._counters[table] || 0) + 1;
  return db.data._counters[table];
};

// Query helpers (similar cu SQL)
const dbHelper = {
  // ── Users ─────────────────────────────────────────────────
  createUser(data) {
    const user = { id: nextId("users"), created_at: new Date().toISOString(), rating:0, reviews_count:0, verified:0, role:"worker", skills:"[]", ...data };
    db.data.users.push(user);
    db.write();
    return user;
  },
  findUserByEmail: (email) => db.data.users.find(u => u.email === email),
  findUserById:    (id)    => db.data.users.find(u => u.id === id),
  updateUser(id, patch) {
    const idx = db.data.users.findIndex(u => u.id === id);
    if (idx !== -1) { Object.assign(db.data.users[idx], patch); db.write(); }
  },

  // ── Jobs ─────────────────────────────────────────────────
  createJob(data) {
    const job = { id: nextId("jobs"), created_at: new Date().toISOString(), active:1, urgent:0, skills:"[]", icon:"💼", color:"#059669", ...data };
    db.data.jobs.push(job);
    db.write();
    return job;
  },
  getJobs(filter = {}) {
    let jobs = db.data.jobs.filter(j => j.active === 1);
    if (filter.category && filter.category !== "Toate") jobs = jobs.filter(j => j.category === filter.category);
    if (filter.type)   jobs = jobs.filter(j => j.type === filter.type);
    if (filter.urgent) jobs = jobs.filter(j => j.urgent === 1);
    return jobs.map(j => {
      const employer = db.data.users.find(u => u.id === j.employer_id) || {};
      return { ...j, employer: employer.name, employer_initials: employer.initials, employer_rating: employer.rating, employer_phone: employer.phone };
    }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  },
  findJobById(id) {
    const j = db.data.jobs.find(j => j.id === id);
    if (!j) return null;
    const employer = db.data.users.find(u => u.id === j.employer_id) || {};
    return { ...j, employer: employer.name, employer_initials: employer.initials, employer_phone: employer.phone };
  },
  updateJob(id, patch) {
    const idx = db.data.jobs.findIndex(j => j.id === id);
    if (idx !== -1) { Object.assign(db.data.jobs[idx], patch); db.write(); }
  },

  // ── Applications ─────────────────────────────────────────
  createApplication(data) {
    const exists = db.data.applications.find(a => a.job_id === data.job_id && a.worker_id === data.worker_id);
    if (exists) throw new Error("DUPLICATE");
    const app = { id: nextId("applications"), created_at: new Date().toISOString(), status:"pending", ...data };
    db.data.applications.push(app);
    db.write();
    return app;
  },
  getApplicationsByJob(job_id) {
    return db.data.applications.filter(a => a.job_id === job_id).map(a => {
      const worker = db.data.users.find(u => u.id === a.worker_id) || {};
      return { ...a, name: worker.name, initials: worker.initials, rating: worker.rating, verified: worker.verified };
    });
  },

  // ── Conversations ─────────────────────────────────────────
  findOrCreateConversation(user1_id, user2_id, job_id) {
    const existing = db.data.conversations.find(c =>
      ((c.user1_id === user1_id && c.user2_id === user2_id) ||
       (c.user1_id === user2_id && c.user2_id === user1_id)) &&
      (!job_id || c.job_id === job_id)
    );
    if (existing) return existing;
    const conv = { id: nextId("conversations"), user1_id, user2_id, job_id: job_id || null, created_at: new Date().toISOString() };
    db.data.conversations.push(conv);
    db.write();
    return conv;
  },
  getUserConversations(userId) {
    return db.data.conversations
      .filter(c => c.user1_id === userId || c.user2_id === userId)
      .map(c => {
        const msgs    = db.data.messages.filter(m => m.conversation_id === c.id);
        const lastMsg = msgs[msgs.length - 1];
        const unread  = msgs.filter(m => m.sender_id !== userId && !m.read).length;
        const u1 = db.data.users.find(u => u.id === c.user1_id) || {};
        const u2 = db.data.users.find(u => u.id === c.user2_id) || {};
        const job = c.job_id ? db.data.jobs.find(j => j.id === c.job_id) : null;
        return { ...c, user1_name: u1.name, user1_initials: u1.initials, user2_name: u2.name, user2_initials: u2.initials, last_msg: lastMsg?.text, last_time: lastMsg?.created_at, job_title: job?.title, unread };
      })
      .sort((a,b) => new Date(b.last_time || b.created_at) - new Date(a.last_time || a.created_at));
  },
  findConversationById: (id) => db.data.conversations.find(c => c.id === id),

  // ── Messages ─────────────────────────────────────────────
  createMessage(data) {
    const msg = { id: nextId("messages"), created_at: new Date().toISOString(), read: 0, ...data };
    db.data.messages.push(msg);
    db.write();
    const sender = db.data.users.find(u => u.id === data.sender_id) || {};
    return { ...msg, sender_name: sender.name, sender_initials: sender.initials };
  },
  getConversationMessages(conversation_id, userId) {
    // Marcheaza ca citite
    db.data.messages.forEach(m => { if (m.conversation_id === conversation_id && m.sender_id !== userId) m.read = 1; });
    db.write();
    return db.data.messages.filter(m => m.conversation_id === conversation_id).map(m => {
      const sender = db.data.users.find(u => u.id === m.sender_id) || {};
      return { ...m, sender_name: sender.name, sender_initials: sender.initials };
    });
  },

  // ── Reviews ──────────────────────────────────────────────
  createReview(data) {
    const review = { id: nextId("reviews"), created_at: new Date().toISOString(), ...data };
    db.data.reviews.push(review);
    // Actualizeaza rating user
    const targetReviews = db.data.reviews.filter(r => r.target_id === data.target_id);
    const avg = targetReviews.reduce((s,r) => s+r.rating, 0) / targetReviews.length;
    this.updateUser(data.target_id, { rating: parseFloat(avg.toFixed(1)), reviews_count: targetReviews.length });
    db.write();
    return review;
  },
  getUserReviews(target_id) {
    return db.data.reviews.filter(r => r.target_id === target_id).map(r => {
      const reviewer = db.data.users.find(u => u.id === r.reviewer_id) || {};
      return { ...r, reviewer_name: reviewer.name, reviewer_initials: reviewer.initials, reviewer_verified: reviewer.verified };
    }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // ── Contracts ─────────────────────────────────────────────
  createContract(data) {
    const contract = { id: nextId("contracts"), created_at: new Date().toISOString(), status:"pending", ...data };
    db.data.contracts.push(contract);
    db.write();
    return contract;
  },
  findContractById: (id) => db.data.contracts.find(c => c.id === id),
  updateContract(id, patch) {
    const idx = db.data.contracts.findIndex(c => c.id === id);
    if (idx !== -1) { Object.assign(db.data.contracts[idx], patch); db.write(); }
  },
  getUserContracts(userId) {
    return db.data.contracts.filter(c => c.worker_id === userId || c.employer_id === userId).map(c => {
      const job  = db.data.jobs.find(j => j.id === c.job_id) || {};
      const w    = db.data.users.find(u => u.id === c.worker_id) || {};
      const e    = db.data.users.find(u => u.id === c.employer_id) || {};
      return { ...c, job_title: job.title, worker_name: w.name, employer_name: e.name };
    });
  },

  // ── Payments ─────────────────────────────────────────────
  createPayment(data) {
    const payment = { id: nextId("payments"), created_at: new Date().toISOString(), status:"pending", ...data };
    db.data.payments.push(payment);
    db.write();
    return payment;
  },
  findPaymentById: (id) => db.data.payments.find(p => p.id === id),
  updatePayment(id, patch) {
    const idx = db.data.payments.findIndex(p => p.id === id);
    if (idx !== -1) { Object.assign(db.data.payments[idx], patch); db.write(); }
  },
  getUserPayments(userId) {
    return db.data.payments.filter(p => p.payer_id === userId || p.payee_id === userId).map(p => {
      const job   = db.data.jobs.find(j => j.id === p.job_id) || {};
      const payee = db.data.users.find(u => u.id === p.payee_id) || {};
      return { ...p, job_title: job.title, payee_name: payee.name };
    });
  },

  // ── OTP ──────────────────────────────────────────────────
  saveOtp(phone, code) {
    db.data.otp_codes = db.data.otp_codes.filter(o => o.phone !== phone);
    db.data.otp_codes.push({ id: nextId("otp_codes"), phone, code, expires_at: new Date(Date.now() + 10*60*1000).toISOString(), used: 0 });
    db.write();
  },
  verifyOtp(phone, code) {
    const record = db.data.otp_codes.find(o => o.phone === phone && o.code === code && !o.used && new Date(o.expires_at) > new Date());
    if (!record) return false;
    record.used = 1;
    db.write();
    return true;
  },
};

module.exports = dbHelper;
