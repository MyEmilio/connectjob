const express = require("express");
const PDFDocument = require("pdfkit");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Job = require("../models/Job");
const logger = require("../utils/logger");

const router = express.Router();

// GET /api/contracts/pdf/:jobId — generates a contract PDF for the given job
router.get("/:jobId", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId).lean();
    if (!job) return res.status(404).json({ error: "Empleo no encontrado" });

    const me = await User.findById(req.user.id).select("name email phone role").lean();
    const other = await User.findById(job.employer_id).select("name email phone").lean();

    // Worker and employer (role-aware)
    const isEmployer = String(job.employer_id) === String(req.user.id);
    const client = isEmployer ? me : (other || { name: "Cliente ConnectJob" });
    const worker = isEmployer ? { name: "Prestador seleccionado" } : me;

    const contractId = `CJ-${String(job._id).slice(-6).toUpperCase()}`;
    const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

    // Stream PDF
    const doc = new PDFDocument({ size: "A4", margin: 50, info: {
      Title: `Contrato ${contractId}`,
      Author: "ConnectJob",
      Subject: job.title,
    }});
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Contrato-${contractId}.pdf"`);
    doc.pipe(res);

    // ── Header ──
    doc.fillColor("#059669").fontSize(28).font("Helvetica-Bold").text("ConnectJob", 50, 50);
    doc.fillColor("#64748b").fontSize(10).font("Helvetica").text("Marketplace de servicios profesionales", 50, 82);
    doc.fillColor("#94a3b8").fontSize(9).text(`www.connectjob.es · ${today}`, 50, 97);

    doc.moveTo(50, 120).lineTo(545, 120).lineWidth(2).strokeColor("#059669").stroke();

    // ── Title ──
    doc.fillColor("#0f172a").fontSize(20).font("Helvetica-Bold").text("CONTRATO DE PRESTACIÓN DE SERVICIOS", 50, 140, { align: "center" });
    doc.fillColor("#64748b").fontSize(11).font("Helvetica").text(`Nº ${contractId}`, { align: "center" });

    // ── Parties ──
    let y = 200;
    doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text("ENTRE LAS PARTES:", 50, y);
    y += 25;
    doc.fontSize(10).font("Helvetica-Bold").text("CLIENTE:", 50, y);
    doc.font("Helvetica").text(`${client.name || "Cliente"}  ·  ${client.email || ""}${client.phone ? "  ·  " + client.phone : ""}`, 110, y);
    y += 18;
    doc.font("Helvetica-Bold").text("PRESTADOR:", 50, y);
    doc.font("Helvetica").text(`${worker.name || "Prestador"}  ·  ${worker.email || ""}${worker.phone ? "  ·  " + worker.phone : ""}`, 120, y);

    // ── Job details box ──
    y += 40;
    doc.rect(50, y, 495, 95).fillAndStroke("#f0fdf4", "#86efac");
    doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text("DETALLES DEL SERVICIO", 65, y + 10);
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`Título:    ${job.title}`, 65, y + 32);
    doc.text(`Categoría: ${job.category || "—"}`, 65, y + 48);
    doc.text(`Ubicación: ${job.location || job.city || "—"}`, 65, y + 64);
    doc.fillColor("#059669").font("Helvetica-Bold").text(`Importe acordado: ${job.salary} €`, 65, y + 80);

    // ── Clauses ──
    y += 115;
    const clauses = [
      ["1. OBJETO",
       `El Prestador se compromete a ejecutar el servicio de «${job.title}» conforme a los requisitos y especificaciones acordadas con el Cliente a través de la plataforma ConnectJob.`],
      ["2. PAGO EN ESCROW",
       `La suma de ${job.salary} € se depositará en el sistema de Escrow de ConnectJob. Los fondos serán liberados al Prestador únicamente tras la confirmación de finalización por parte del Cliente. ConnectJob retiene un 3% de comisión.`],
      ["3. PLAZOS",
       "El plazo de ejecución y el calendario de hitos serán acordados mutuamente a través de la plataforma. Los incumplimientos deben ser comunicados de inmediato."],
      ["4. CONFIDENCIALIDAD",
       "Ambas partes se comprometen a mantener la confidencialidad sobre la información intercambiada y a no divulgarla a terceros."],
      ["5. RESOLUCIÓN DE DISPUTAS",
       "Las disputas se resolverán a través del sistema de mediación de ConnectJob. Si no se llega a un acuerdo, las partes podrán recurrir a los tribunales competentes."],
      ["6. EVASIÓN DE PLATAFORMA — PENALIZACIÓN",
       "Queda expresamente prohibido intentar realizar pagos fuera de la plataforma, compartir datos de contacto privados o proponer acuerdos paralelos. El incumplimiento conlleva la suspensión inmediata y la pérdida de todas las protecciones (Escrow, seguros, soporte)."],
    ];

    clauses.forEach((c) => {
      if (y > 720) { doc.addPage(); y = 50; }
      doc.fillColor("#059669").fontSize(10.5).font("Helvetica-Bold").text(c[0], 50, y);
      y += 14;
      doc.fillColor("#334155").fontSize(9.5).font("Helvetica").text(c[1], 50, y, { width: 495, align: "justify" });
      y += doc.heightOfString(c[1], { width: 495 }) + 14;
    });

    // ── Signatures ──
    if (y > 650) { doc.addPage(); y = 50; }
    y += 20;
    doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("FIRMAS DIGITALES", 50, y, { align: "center" });
    y += 25;
    doc.moveTo(80, y + 30).lineTo(240, y + 30).strokeColor("#cbd5e1").lineWidth(1).stroke();
    doc.moveTo(315, y + 30).lineTo(475, y + 30).stroke();
    doc.fillColor("#64748b").fontSize(9).font("Helvetica").text("Cliente", 80, y + 35);
    doc.text(client.name || "", 80, y + 48, { width: 160 });
    doc.text("Prestador", 315, y + 35);
    doc.text(worker.name || "", 315, y + 48, { width: 160 });

    // ── Footer ──
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica")
       .text(`Este contrato fue generado automáticamente por ConnectJob el ${today}. Documento válido con firma electrónica integrada en la plataforma.`, 50, 790, { width: 495, align: "center" });

    doc.end();
    logger.info("Contract PDF generated", { userId: req.user.id, jobId, contractId });
  } catch (err) {
    logger.error("Contract PDF error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
