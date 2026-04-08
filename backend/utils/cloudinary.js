const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const logger = require("./logger");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    !process.env.CLOUDINARY_CLOUD_NAME.includes("ADAUGA")
  );
};

// Storage configuration for KYC documents
const kycStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "connectjob/kyc",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
    resource_type: "auto",
    transformation: [{ quality: "auto:good" }],
  },
});

// Create multer upload middleware
const createUploader = (storage, limits = {}) => {
  return multer({
    storage,
    limits: {
      fileSize: limits.fileSize || 10 * 1024 * 1024, // 10MB default
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Tip fisier nepermis. Acceptat: JPG, PNG, WEBP, PDF"));
      }
    },
  });
};

// KYC document uploader
const kycUploader = createUploader(kycStorage);

// Delete file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Cloudinary file deleted", { publicId, result });
    return result;
  } catch (error) {
    logger.error("Cloudinary delete error", { publicId, error: error.message });
    throw error;
  }
};

// Get file URL
const getFileUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, options);
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  kycUploader,
  kycStorage,
  deleteFile,
  getFileUrl,
};
