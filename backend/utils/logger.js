const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

// Custom format for console (pretty print in dev)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// File transport with rotation
const fileTransport = new DailyRotateFile({
  filename: path.join(__dirname, "../logs/app-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  format: jsonFormat,
});

const errorFileTransport = new DailyRotateFile({
  filename: path.join(__dirname, "../logs/error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  level: "error",
  format: jsonFormat,
});

const transports = [
  new winston.transports.Console({
    format: isProduction ? jsonFormat : consoleFormat,
  }),
];

// Add file transports in production
if (isProduction) {
  transports.push(fileTransport, errorFileTransport);
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  transports,
  exitOnError: false,
});

// Create stream for Morgan HTTP logging if needed
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
