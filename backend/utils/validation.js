const { z } = require("zod");

// ── Auth ─────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Email invalid"),
  password: z.string().min(1, "Parola este obligatorie"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Numele trebuie să aibă cel puțin 2 caractere").max(100),
  email: z.string().email("Email invalid"),
  password: z.string().min(8, "Parola trebuie să aibă cel puțin 8 caractere")
    .regex(/[A-Z]/, "Parola trebuie să conțină cel puțin o majusculă")
    .regex(/[0-9]/, "Parola trebuie să conțină cel puțin o cifră"),
  role: z.enum(["worker", "employer"]).default("worker"),
});

const resetRequestSchema = z.object({
  email: z.string().email("Email invalid"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token invalid"),
  password: z.string().min(8, "Parola trebuie să aibă cel puțin 8 caractere")
    .regex(/[A-Z]/, "Parola trebuie să conțină cel puțin o majusculă")
    .regex(/[0-9]/, "Parola trebuie să conțină cel puțin o cifră"),
});

// ── Jobs ─────────────────────────────────────────────────────
const createJobSchema = z.object({
  title: z.string().min(3, "Titlul trebuie să aibă cel puțin 3 caractere").max(200),
  description: z.string().min(10, "Descrierea trebuie să aibă cel puțin 10 caractere").max(5000),
  category: z.string().min(1, "Categoria este obligatorie"),
  salary: z.number().positive("Salariul trebuie să fie pozitiv"),
  type: z.enum(["full-time", "part-time", "proiect", "zilier"]).optional(),
  work_duration: z.enum(["ore", "zile", "saptamani", "luni"]).optional(),
  urgent: z.boolean().optional(),
  second_job: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  location: z.object({
    address: z.string().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }).optional(),
  contact_phone: z.string().optional(),
  schedule: z.string().optional(),
});

// ── Payments ─────────────────────────────────────────────────
const createPaymentSchema = z.object({
  job_id: z.string().min(1, "Job ID obligatoriu"),
  payee_id: z.string().min(1, "Payee ID obligatoriu"),
  amount: z.number().positive("Suma trebuie să fie pozitivă").max(100000),
});

const releasePaymentSchema = z.object({
  payment_id: z.string().min(1, "Payment ID obligatoriu"),
});

// ── Messages ─────────────────────────────────────────────────
const sendMessageSchema = z.object({
  text: z.string().min(1, "Mesajul nu poate fi gol").max(5000),
});

const startConversationSchema = z.object({
  user2_id: z.string().min(1, "ID destinatar obligatoriu"),
  job_id: z.string().optional(),
});

// ── Reviews ──────────────────────────────────────────────────
const createReviewSchema = z.object({
  target_id: z.string().min(1, "Target ID obligatoriu"),
  job_id: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(3, "Recenzia trebuie să aibă cel puțin 3 caractere").max(2000),
});

// ── Contracts ────────────────────────────────────────────────
const createContractSchema = z.object({
  job_id: z.string().min(1, "Job ID obligatoriu"),
  worker_id: z.string().min(1, "Worker ID obligatoriu"),
  terms: z.string().min(10, "Termenii trebuie să aibă cel puțin 10 caractere").max(10000),
  salary: z.number().positive("Salariul trebuie să fie pozitiv"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// ── Reports ──────────────────────────────────────────────────
const createReportSchema = z.object({
  reported_user_id: z.string().min(1, "ID utilizator raportat obligatoriu"),
  reason: z.enum(["limbaj_ofensiv", "rasism", "hartuire", "spam", "frauda", "altele"]),
  details: z.string().max(2000).optional(),
});

// ── Translation ──────────────────────────────────────────────
const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  target_lang: z.string().min(2).max(5),
  source_lang: z.string().min(2).max(5).optional(),
});

const translateBatchSchema = z.object({
  messages: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    text: z.string().min(1).max(5000),
  })).min(1).max(50),
  target_lang: z.string().min(2).max(5),
});

// ── Middleware factory ───────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error?.issues || [];
      const errors = issues.map(e => e.message);
      return res.status(400).json({ error: errors[0] || "Date invalide", errors });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = {
  validate,
  loginSchema,
  registerSchema,
  resetRequestSchema,
  resetPasswordSchema,
  createJobSchema,
  createPaymentSchema,
  releasePaymentSchema,
  sendMessageSchema,
  startConversationSchema,
  createReviewSchema,
  createContractSchema,
  createReportSchema,
  translateSchema,
  translateBatchSchema,
};
