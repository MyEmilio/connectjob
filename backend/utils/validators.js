const { body, param, query, validationResult } = require("express-validator");

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Date invalide",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Auth validators
const registerValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Numele este obligatoriu")
    .isLength({ max: 100 }).withMessage("Numele poate avea maxim 100 caractere"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email-ul este obligatoriu")
    .isEmail().withMessage("Format email invalid")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Parola este obligatorie")
    .isLength({ min: 8 }).withMessage("Parola trebuie sa aiba minim 8 caractere"),
  body("role")
    .optional()
    .isIn(["worker", "employer"]).withMessage("Rol invalid"),
  validate,
];

const loginValidator = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email-ul este obligatoriu")
    .isEmail().withMessage("Format email invalid"),
  body("password")
    .notEmpty().withMessage("Parola este obligatorie"),
  validate,
];

const profileValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("Numele poate avea maxim 100 caractere"),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage("Telefonul poate avea maxim 20 caractere"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Bio poate avea maxim 500 caractere"),
  body("skills")
    .optional()
    .isArray().withMessage("Skills trebuie sa fie un array"),
  validate,
];

// Job validators
const createJobValidator = [
  body("title")
    .trim()
    .notEmpty().withMessage("Titlul este obligatoriu")
    .isLength({ min: 3, max: 200 }).withMessage("Titlul trebuie sa aiba intre 3 si 200 caractere"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage("Descrierea poate avea maxim 5000 caractere"),
  body("category")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("Categoria poate avea maxim 100 caractere"),
  body("salary")
    .notEmpty().withMessage("Salariul este obligatoriu")
    .isFloat({ min: 0, max: 1000000 }).withMessage("Salariu invalid (0 - 1.000.000)"),
  body("type")
    .optional()
    .isIn(["part-time", "full-time"]).withMessage("Tip invalid"),
  body("urgent")
    .optional()
    .isBoolean().withMessage("Urgent trebuie sa fie boolean"),
  body("lat")
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage("Latitudine invalida"),
  body("lng")
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage("Longitudine invalida"),
  body("skills")
    .optional()
    .isArray().withMessage("Skills trebuie sa fie un array"),
  validate,
];

const updateJobValidator = [
  param("id")
    .isMongoId().withMessage("ID job invalid"),
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage("Titlul trebuie sa aiba intre 3 si 200 caractere"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage("Descrierea poate avea maxim 5000 caractere"),
  body("salary")
    .optional()
    .isFloat({ min: 0, max: 1000000 }).withMessage("Salariu invalid"),
  validate,
];

// Message validators
const messageValidator = [
  body("text")
    .trim()
    .notEmpty().withMessage("Mesajul este obligatoriu")
    .isLength({ max: 2000 }).withMessage("Mesajul poate avea maxim 2000 caractere"),
  validate,
];

const createConversationValidator = [
  body("other_user_id")
    .notEmpty().withMessage("other_user_id este obligatoriu")
    .isMongoId().withMessage("ID utilizator invalid"),
  body("job_id")
    .optional()
    .isMongoId().withMessage("ID job invalid"),
  validate,
];

// Review validators
const reviewValidator = [
  body("target_id")
    .notEmpty().withMessage("target_id este obligatoriu")
    .isMongoId().withMessage("ID utilizator invalid"),
  body("job_id")
    .optional()
    .isMongoId().withMessage("ID job invalid"),
  body("rating")
    .notEmpty().withMessage("Rating-ul este obligatoriu")
    .isInt({ min: 1, max: 5 }).withMessage("Rating-ul trebuie sa fie intre 1 si 5"),
  body("text")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Comentariul poate avea maxim 500 caractere"),
  validate,
];

// Report validators
const reportValidator = [
  body("reported_user_id")
    .notEmpty().withMessage("reported_user_id este obligatoriu")
    .isMongoId().withMessage("ID utilizator invalid"),
  body("message_id")
    .optional()
    .isMongoId().withMessage("ID mesaj invalid"),
  body("reason")
    .notEmpty().withMessage("Motivul este obligatoriu")
    .isIn(["limbaj_ofensiv", "rasism", "hartuire", "spam", "frauda", "altele"])
    .withMessage("Motiv invalid"),
  body("details")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Detaliile pot avea maxim 1000 caractere"),
  validate,
];

// Payment validators
const paymentIntentValidator = [
  body("job_id")
    .notEmpty().withMessage("job_id este obligatoriu")
    .isMongoId().withMessage("ID job invalid"),
  body("payee_id")
    .optional()
    .isMongoId().withMessage("ID payee invalid"),
  body("amount")
    .notEmpty().withMessage("Suma este obligatorie")
    .isFloat({ min: 1, max: 100000 }).withMessage("Suma invalida (1 - 100.000)"),
  body("method")
    .optional()
    .isIn(["card", "transfer"]).withMessage("Metoda de plata invalida"),
  validate,
];

// KYC validators
const sendOtpValidator = [
  body("phone")
    .trim()
    .notEmpty().withMessage("Telefonul este obligatoriu")
    .matches(/^\+?[1-9]\d{6,14}$/).withMessage("Format telefon invalid"),
  validate,
];

const verifyOtpValidator = [
  body("phone")
    .trim()
    .notEmpty().withMessage("Telefonul este obligatoriu"),
  body("code")
    .trim()
    .notEmpty().withMessage("Codul este obligatoriu")
    .isLength({ min: 6, max: 6 }).withMessage("Codul trebuie sa aiba 6 cifre"),
  validate,
];

// Contract validators
const createContractValidator = [
  body("job_id")
    .notEmpty().withMessage("job_id este obligatoriu")
    .isMongoId().withMessage("ID job invalid"),
  body("worker_id")
    .notEmpty().withMessage("worker_id este obligatoriu")
    .isMongoId().withMessage("ID worker invalid"),
  body("content")
    .optional()
    .trim()
    .isLength({ max: 10000 }).withMessage("Contractul poate avea maxim 10000 caractere"),
  validate,
];

const signContractValidator = [
  param("id")
    .isMongoId().withMessage("ID contract invalid"),
  body("signature")
    .trim()
    .notEmpty().withMessage("Semnatura este obligatorie")
    .isLength({ max: 500 }).withMessage("Semnatura poate avea maxim 500 caractere"),
  validate,
];

// MongoDB ID validator
const mongoIdValidator = (paramName = "id") => [
  param(paramName).isMongoId().withMessage(`${paramName} invalid`),
  validate,
];

// Application validator
const applyJobValidator = [
  param("id")
    .isMongoId().withMessage("ID job invalid"),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Mesajul poate avea maxim 1000 caractere"),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  profileValidator,
  createJobValidator,
  updateJobValidator,
  messageValidator,
  createConversationValidator,
  reviewValidator,
  reportValidator,
  paymentIntentValidator,
  sendOtpValidator,
  verifyOtpValidator,
  createContractValidator,
  signContractValidator,
  mongoIdValidator,
  applyJobValidator,
};
