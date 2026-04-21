const express = require("express");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Payment = require("../models/Payment");
const Contract = require("../models/Contract");
const Review = require("../models/Review");

const router = express.Router();

// GET /api/stats/dashboard
// Get dashboard statistics for current user
router.get("/dashboard", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      // Jobs stats (if employer)
      myJobs,
      // Applications stats
      myApplications,
      applicationsToMyJobs,
      // Messages stats
      conversations,
      // Payments stats
      paymentsAsPayer,
      paymentsAsPayee,
      // Contracts stats
      myContracts,
      // Reviews stats
      reviewsReceived,
      reviewsGiven,
    ] = await Promise.all([
      Job.find({ employer_id: userId }).lean(),
      Application.find({ worker_id: userId }).lean(),
      Application.find({}).populate({ path: "job_id", match: { employer_id: userId } }).lean(),
      Conversation.find({ $or: [{ user1_id: userId }, { user2_id: userId }] }).lean(),
      Payment.find({ payer_id: userId }).lean(),
      Payment.find({ payee_id: userId }).lean(),
      Contract.find({ $or: [{ worker_id: userId }, { employer_id: userId }] }).lean(),
      Review.find({ target_id: userId }).lean(),
      Review.find({ reviewer_id: userId }).lean(),
    ]);

    // Filter applications to my jobs (populate doesn't filter nulls)
    const validApplicationsToMyJobs = applicationsToMyJobs.filter(a => a.job_id);

    // Calculate stats
    const stats = {
      // Overview
      overview: {
        total_jobs_posted: myJobs.length,
        active_jobs: myJobs.filter(j => j.active).length,
        total_applications_sent: myApplications.length,
        applications_received: validApplicationsToMyJobs.length,
        total_conversations: conversations.length,
        contracts_signed: myContracts.filter(c => c.status === "signed_both").length,
      },

      // Applications breakdown
      applications: {
        sent: {
          total: myApplications.length,
          pending: myApplications.filter(a => a.status === "pending").length,
          accepted: myApplications.filter(a => a.status === "accepted").length,
          rejected: myApplications.filter(a => a.status === "rejected").length,
        },
        received: {
          total: validApplicationsToMyJobs.length,
          pending: validApplicationsToMyJobs.filter(a => a.status === "pending").length,
          accepted: validApplicationsToMyJobs.filter(a => a.status === "accepted").length,
          rejected: validApplicationsToMyJobs.filter(a => a.status === "rejected").length,
        },
      },

      // Financial stats
      finances: {
        total_paid: paymentsAsPayer.reduce((sum, p) => sum + (p.amount || 0), 0),
        total_earned: paymentsAsPayee.filter(p => p.status === "released").reduce((sum, p) => sum + (p.amount || 0), 0),
        pending_payments: paymentsAsPayer.filter(p => p.status === "held").reduce((sum, p) => sum + (p.amount || 0), 0),
        pending_earnings: paymentsAsPayee.filter(p => p.status === "held").reduce((sum, p) => sum + (p.amount || 0), 0),
        commission_paid: paymentsAsPayer.reduce((sum, p) => sum + (p.commission || 0), 0),
      },

      // Reviews stats
      reviews: {
        received: {
          total: reviewsReceived.length,
          average: reviewsReceived.length > 0 
            ? (reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length).toFixed(1)
            : 0,
        },
        given: reviewsGiven.length,
      },

      // Activity over time (last 30 days)
      activity: {
        applications_last_30_days: myApplications.filter(a => new Date(a.created_at) > thirtyDaysAgo).length,
        applications_last_7_days: myApplications.filter(a => new Date(a.created_at) > sevenDaysAgo).length,
        jobs_posted_last_30_days: myJobs.filter(j => new Date(j.created_at) > thirtyDaysAgo).length,
      },

      // Chart data - applications per day (last 7 days)
      charts: {
        applications_daily: getApplicationsPerDay(myApplications, 7),
        earnings_monthly: getEarningsPerMonth(paymentsAsPayee.filter(p => p.status === "released")),
      },
    };

    res.json(stats);
  } catch (err) {
    logger.error("Get dashboard stats error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/jobs/:id
// Get statistics for a specific job (owner only)
router.get("/jobs/:id", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: "Job negăsit" });
    if (String(job.employer_id) !== String(req.user.id)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const applications = await Application.find({ job_id: req.params.id })
      .populate("worker_id", "name initials rating reviews_count")
      .lean();

    res.json({
      job_id: req.params.id,
      title: job.title,
      created_at: job.created_at,
      views: job.views || 0,
      applications: {
        total: applications.length,
        pending: applications.filter(a => a.status === "pending").length,
        accepted: applications.filter(a => a.status === "accepted").length,
        rejected: applications.filter(a => a.status === "rejected").length,
      },
      applicants: applications.map(a => ({
        id: a.worker_id?._id,
        name: a.worker_id?.name,
        initials: a.worker_id?.initials,
        rating: a.worker_id?.rating,
        status: a.status,
        applied_at: a.created_at,
      })),
    });
  } catch (err) {
    logger.error("Get job stats error", { jobId: req.params.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Helper: Get applications per day for last N days
function getApplicationsPerDay(applications, days) {
  const result = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const count = applications.filter(a => {
      const createdAt = new Date(a.created_at);
      return createdAt >= date && createdAt < nextDate;
    }).length;
    
    result.push({
      date: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("ro", { weekday: "short" }),
      count,
    });
  }
  
  return result;
}

// Helper: Get earnings per month for last 6 months
function getEarningsPerMonth(payments) {
  const result = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    
    const total = payments
      .filter(p => {
        const releasedAt = new Date(p.released_at || p.created_at);
        return releasedAt >= date && releasedAt < nextMonth;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    result.push({
      month: date.toLocaleDateString("ro", { month: "short" }),
      year: date.getFullYear(),
      total,
    });
  }
  
  return result;
}

module.exports = router;
