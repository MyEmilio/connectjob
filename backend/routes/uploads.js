const express = require("express");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const { cloudinary, isCloudinaryConfigured } = require("../utils/cloudinary");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Local fallback storage when Cloudinary is not configured
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "chat");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage: localStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido. Aceptados: JPG, PNG, WEBP, GIF, PDF"));
    }
  },
});

// POST /api/uploads/chat — upload file for chat
router.post("/chat", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha proporcionado archivo" });
    }

    let fileUrl, fileType, publicId;
    const isImage = req.file.mimetype.startsWith("image/");
    fileType = isImage ? "image" : "document";

    if (isCloudinaryConfigured()) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "connectjob/chat",
        resource_type: "auto",
        transformation: isImage ? [{ quality: "auto:good", width: 1200, crop: "limit" }] : undefined,
      });
      fileUrl = result.secure_url;
      publicId = result.public_id;
      // Clean up local file
      fs.unlink(req.file.path, () => {});
      logger.info("Chat file uploaded to Cloudinary", { publicId, userId: req.user.id });
    } else {
      // Use local storage
      fileUrl = `/api/uploads/files/${req.file.filename}`;
      publicId = req.file.filename;
      logger.info("Chat file stored locally", { filename: req.file.filename, userId: req.user.id });
    }

    res.json({
      url: fileUrl,
      type: fileType,
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      public_id: publicId,
    });
  } catch (err) {
    logger.error("Chat upload error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/uploads/files/:filename — serve local files
router.get("/files/:filename", (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo no encontrado" });
  res.sendFile(filePath);
});

module.exports = router;
