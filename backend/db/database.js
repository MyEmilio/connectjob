const User         = require("../models/User");
const Job          = require("../models/Job");
const Application  = require("../models/Application");
const Conversation = require("../models/Conversation");
const Message      = require("../models/Message");
const Review       = require("../models/Review");
const Contract     = require("../models/Contract");
const Payment      = require("../models/Payment");
const OtpCode      = require("../models/OtpCode");

const db = {
  // ── Users ─────────────────────────────────────────────────
  async createUser(data) {
    const user = await User.create(data);
    return user.toJSON();
  },
  async findUserByEmail(email) {
    return User.findOne({ email }).lean({ virtuals: true });
  },
  async findUserById(id) {
    return User.findById(id).lean({ virtuals: true });
  },
  async updateUser(id, patch) {
    await User.findByIdAndUpdate(id, patch);
  },

  // ── Jobs ─────────────────────────────────────────────────
  async createJob(data) {
    const job = await Job.create(data);
    return job.toJSON();
  },
  async getJobs(filter = {}) {
    const query = { active: true };
    if (filter.category && filter.category !== "Toate") query.category = filter.category;
    if (filter.type)          query.type = filter.type;
    if (filter.urgent)        query.urgent = true;
    if (filter.second_job)    query.second_job = true;
    if (filter.work_duration) query.work_duration = filter.work_duration;

    const jobs = await Job.find(query)
      .populate("employer_id", "name initials rating phone")
      .sort({ promoted: -1, created_at: -1 })
      .lean({ virtuals: true });

    return jobs.map(j => ({
      ...j,
      employer:          j.employer_id?.name,
      employer_initials: j.employer_id?.initials,
      employer_rating:   j.employer_id?.rating,
      employer_phone:    j.employer_id?.phone,
      promoted:          j.promoted || false,
      second_job:        j.second_job || false,
      work_duration:     j.work_duration || "zile",
    }));
  },
  async findJobById(id) {
    const j = await Job.findById(id)
      .populate("employer_id", "name initials phone")
      .lean({ virtuals: true });
    if (!j) return null;
    return {
      ...j,
      employer:          j.employer_id?.name,
      employer_initials: j.employer_id?.initials,
      employer_phone:    j.employer_id?.phone,
    };
  },
  async updateJob(id, patch) {
    await Job.findByIdAndUpdate(id, patch);
  },

  // ── Applications ─────────────────────────────────────────
  async createApplication(data) {
    const exists = await Application.findOne({ job_id: data.job_id, worker_id: data.worker_id });
    if (exists) throw new Error("DUPLICATE");
    const app = await Application.create(data);
    return app.toJSON();
  },
  async getApplicationsByJob(job_id) {
    const apps = await Application.find({ job_id })
      .populate("worker_id", "name initials rating verified")
      .lean({ virtuals: true });
    return apps.map(a => ({
      ...a,
      name:     a.worker_id?.name,
      initials: a.worker_id?.initials,
      rating:   a.worker_id?.rating,
      verified: a.worker_id?.verified,
    }));
  },

  // ── Conversations ─────────────────────────────────────────
  async findOrCreateConversation(user1_id, user2_id, job_id) {
    const filter = {
      $or: [
        { user1_id, user2_id },
        { user1_id: user2_id, user2_id: user1_id },
      ],
      ...(job_id ? { job_id } : {}),
    };
    let conv = await Conversation.findOne(filter).lean({ virtuals: true });
    if (!conv) {
      const created = await Conversation.create({ user1_id, user2_id, job_id: job_id || null });
      conv = created.toJSON();
    }
    return conv;
  },
  async getUserConversations(userId) {
    const convs = await Conversation.find({
      $or: [{ user1_id: userId }, { user2_id: userId }],
    })
      .populate("user1_id", "name initials")
      .populate("user2_id", "name initials")
      .populate("job_id",   "title")
      .lean({ virtuals: true });

    const results = await Promise.all(convs.map(async (c) => {
      const msgs    = await Message.find({ conversation_id: c.id }).sort({ created_at: 1 }).lean({ virtuals: true });
      const lastMsg = msgs[msgs.length - 1];
      const unread  = msgs.filter(m => String(m.sender_id) !== String(userId) && !m.read).length;
      return {
        ...c,
        user1_name:     c.user1_id?.name,
        user1_initials: c.user1_id?.initials,
        user2_name:     c.user2_id?.name,
        user2_initials: c.user2_id?.initials,
        job_title:      c.job_id?.title,
        last_msg:       lastMsg?.text,
        last_time:      lastMsg?.created_at,
        unread,
      };
    }));

    return results.sort((a, b) => new Date(b.last_time || b.created_at) - new Date(a.last_time || a.created_at));
  },
  async findConversationById(id) {
    return Conversation.findById(id).lean({ virtuals: true });
  },

  // ── Messages ─────────────────────────────────────────────
  async createMessage(data) {
    const msg    = await Message.create(data);
    const sender = await User.findById(data.sender_id).lean({ virtuals: true });
    return { ...msg.toJSON(), sender_name: sender?.name, sender_initials: sender?.initials };
  },
  async getConversationMessages(conversation_id, userId) {
    await Message.updateMany(
      { conversation_id, sender_id: { $ne: userId }, read: false },
      { read: true }
    );
    const msgs = await Message.find({ conversation_id })
      .populate("sender_id", "name initials")
      .sort({ created_at: 1 })
      .lean({ virtuals: true });
    return msgs.map(m => ({
      ...m,
      sender_name:     m.sender_id?.name,
      sender_initials: m.sender_id?.initials,
    }));
  },

  // ── Reviews ──────────────────────────────────────────────
  async createReview(data) {
    const review = await Review.create(data);
    const targetReviews = await Review.find({ target_id: data.target_id });
    const avg = targetReviews.reduce((s, r) => s + r.rating, 0) / targetReviews.length;
    await User.findByIdAndUpdate(data.target_id, {
      rating: parseFloat(avg.toFixed(1)),
      reviews_count: targetReviews.length,
    });
    return review.toJSON();
  },
  async getUserReviews(target_id) {
    const reviews = await Review.find({ target_id })
      .populate("reviewer_id", "name initials verified")
      .sort({ created_at: -1 })
      .lean({ virtuals: true });
    return reviews.map(r => ({
      ...r,
      reviewer_name:     r.reviewer_id?.name,
      reviewer_initials: r.reviewer_id?.initials,
      reviewer_verified: r.reviewer_id?.verified,
    }));
  },

  // ── Contracts ─────────────────────────────────────────────
  async createContract(data) {
    const contract = await Contract.create(data);
    return contract.toJSON();
  },
  async findContractById(id) {
    return Contract.findById(id).lean({ virtuals: true });
  },
  async updateContract(id, patch) {
    await Contract.findByIdAndUpdate(id, patch);
  },
  async getUserContracts(userId) {
    const contracts = await Contract.find({
      $or: [{ worker_id: userId }, { employer_id: userId }],
    })
      .populate("job_id",      "title")
      .populate("worker_id",   "name")
      .populate("employer_id", "name")
      .lean({ virtuals: true });
    return contracts.map(c => ({
      ...c,
      job_title:     c.job_id?.title,
      worker_name:   c.worker_id?.name,
      employer_name: c.employer_id?.name,
    }));
  },

  // ── Payments ─────────────────────────────────────────────
  async createPayment(data) {
    const payment = await Payment.create(data);
    return payment.toJSON();
  },
  async findPaymentById(id) {
    return Payment.findById(id).lean({ virtuals: true });
  },
  async updatePayment(id, patch) {
    await Payment.findByIdAndUpdate(id, patch);
  },
  async getUserPayments(userId) {
    const payments = await Payment.find({
      $or: [{ payer_id: userId }, { payee_id: userId }],
    })
      .populate("job_id",   "title")
      .populate("payee_id", "name")
      .lean({ virtuals: true });
    return payments.map(p => ({
      ...p,
      job_title:  p.job_id?.title,
      payee_name: p.payee_id?.name,
    }));
  },

  // ── OTP ──────────────────────────────────────────────────
  async saveOtp(phone, code) {
    await OtpCode.deleteMany({ phone });
    await OtpCode.create({
      phone,
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });
  },
  async verifyOtp(phone, code) {
    const record = await OtpCode.findOne({
      phone,
      code,
      used: false,
      expires_at: { $gt: new Date() },
    });
    if (!record) return false;
    record.used = true;
    await record.save();
    return true;
  },
};

module.exports = db;
