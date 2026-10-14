import mongoose from "mongoose";
import { randomUUID } from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import Ticket from "../models/Ticket.js";
import Event from "../models/Event.js";
import Payment from "../models/Payment.js";
import TicketTemplate from "../models/TicketTemplate.js";

const canCoordinatorAccessEvent = (event, user) => {
  if (!event || !user) return false;
  const userId = user._id?.toString();
  if (!userId) return false;
  return event.coordinator_id && event.coordinator_id.toString() === userId;
};

const reserveEventSeat = async (eventId) => {
  return Event.findOneAndUpdate(
    {
      _id: eventId,
      $expr: {
        $lt: [{ $ifNull: ["$booked_count", 0] }, "$capacity"],
      },
    },
    [
      {
        $set: {
          booked_count: { $add: [{ $ifNull: ["$booked_count", 0] }, 1] },
        },
      },
    ],
    { new: true },
  );
};

const releaseEventSeat = async (eventId) => {
  return Event.findByIdAndUpdate(
    eventId,
    [
      {
        $set: {
          booked_count: {
            $max: [{ $subtract: [{ $ifNull: ["$booked_count", 0] }, 1] }, 0],
          },
        },
      },
    ],
    { new: true },
  );
};

// Generate unique ticket code
const generateTicketCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomUUID().split("-")[0].toUpperCase();
  return `TKT-${timestamp}-${random}`;
};

const formatEventDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

async function renderTicketPdf(doc, ticket) {
  const qrCodeData = JSON.stringify({
    ticket_code: ticket.ticket_code,
    event_id: ticket.event_id._id,
    user_id: ticket.user_id._id,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, { width: 160 });
  const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");

  const template = await TicketTemplate.findOne().sort({ updated_at: -1 }).lean();
  const hasTemplate = Boolean(template?.image_data_url);
  if (template?.image_data_url) {
    try {
      const templateBuffer = Buffer.from(
        template.image_data_url.split(",")[1],
        "base64",
      );
      doc.image(templateBuffer, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
      });
    } catch (error) {
      console.warn("Failed to render ticket template image:", error);
    }
  } else {
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f8fafc");
  }

  if (!hasTemplate) {
    doc
      .roundedRect(24, 24, doc.page.width - 48, doc.page.height - 48, 18)
      .fillOpacity(0.96)
      .fillAndStroke("#ffffff", "#dbe4f0");
    doc.fillOpacity(1);
  }

  const titleX = hasTemplate ? 56 : 42;
  const titleY = hasTemplate ? 52 : 42;
  const titleWidth = hasTemplate ? doc.page.width - 240 : doc.page.width - 220;

  if (!hasTemplate) {
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#123386")
      .text("CONFNOW ENTRY PASS", titleX, titleY, { align: "left" });
  }

  doc
    .fontSize(hasTemplate ? 28 : 24)
    .font("Helvetica-Bold")
    .fillColor("#111827")
    .text(ticket.event_id?.event_name || "Event", titleX, hasTemplate ? 72 : 62, {
      width: titleWidth,
    });

  const eventTitleHeight = doc.heightOfString(ticket.event_id?.event_name || "Event", {
    width: titleWidth,
  });
  const detailStartY = (hasTemplate ? 72 : 62) + eventTitleHeight + (hasTemplate ? 14 : 10);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#334155")
    .text(formatEventDate(ticket.event_id?.event_date), titleX, detailStartY, {
      width: titleWidth,
    });
  doc.text(ticket.event_id?.location || "N/A", titleX, detailStartY + 18, {
    width: titleWidth,
  });

  if (hasTemplate) {
    doc
      .roundedRect(doc.page.width - 168, 48, 104, 104, 10)
      .fillOpacity(0.9)
      .fillAndStroke("#ffffff", "#cbd5e1");
    doc.fillOpacity(1);
    doc.image(qrCodeBuffer, doc.page.width - 158, 58, { width: 84, height: 84 });
  } else {
    doc
      .roundedRect(doc.page.width - 170, 44, 108, 108, 12)
      .fillAndStroke("#f8fafc", "#dbe4f0");
    doc.image(qrCodeBuffer, doc.page.width - 160, 54, { width: 88, height: 88 });
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#64748b")
      .text("Scan at venue", doc.page.width - 164, 145, {
        width: 96,
        align: "center",
      });
  }

  const infoTop = hasTemplate ? 220 : 172;
  const leftX = hasTemplate ? 56 : 42;
  const rightX = hasTemplate ? doc.page.width / 2 + 18 : doc.page.width / 2 + 6;
  const rowGap = hasTemplate ? 54 : 44;

  const drawField = (label, value, x, y, width = 160) => {
    if (hasTemplate) {
      doc
        .roundedRect(x - 6, y - 6, width + 12, 42, 8)
        .fillOpacity(0.82)
        .fillAndStroke("#ffffff", "#dbe4f0");
      doc.fillOpacity(1);
    }
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#64748b")
      .text(label, x, y, { width });
    doc
      .fontSize(13)
      .font("Helvetica")
      .fillColor("#111827")
      .text(value || "—", x, y + 14, { width });
  };

  drawField("Ticket Code", ticket.ticket_code, leftX, infoTop);
  drawField("Attendee", ticket.user_id?.fullName, rightX, infoTop);
  drawField("Email", ticket.user_id?.email, leftX, infoTop + rowGap);
  drawField(
    "Payment",
    ticket.payment_status === "paid"
      ? "Paid"
      : Number(ticket.price || 0) <= 0
        ? "Free"
        : ticket.payment_status || "Pending",
    rightX,
    infoTop + rowGap,
  );
  drawField(
    "Ticket Type",
    String(ticket.ticket_type || "regular").replace(/_/g, " ").toUpperCase(),
    leftX,
    infoTop + rowGap * 2,
  );
  drawField(
    "Issued On",
    ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "—",
    rightX,
    infoTop + rowGap * 2,
  );

  if (!hasTemplate) {
    doc
      .roundedRect(42, doc.page.height - 88, doc.page.width - 84, 40, 10)
      .fillAndStroke("#123386", "#123386");
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text(
        "This ticket is generated using the active admin template and is valid for one entry.",
        56,
        doc.page.height - 74,
        { width: doc.page.width - 112, align: "center" },
      );
  }
}

// GET /api/tickets/admin/all - Get all tickets (admin only)
export const getAdminTickets = async (req, res) => {
  try {
    const { event_id, status, payment_status } = req.query;

    let query = {};

    if (event_id) {
      if (!mongoose.Types.ObjectId.isValid(event_id)) {
        return res.status(400).json({
          message: "Invalid event ID format",
        });
      }
      query.event_id = event_id;
    }

    if (status && ["pending", "booked", "cancelled"].includes(status)) {
      query.status = status;
    }

    if (payment_status && ["pending", "paid", "failed", "refunded"].includes(payment_status)) {
      query.payment_status = payment_status;
    }

    const tickets = await Ticket.find(query)
      .populate("event_id", "event_name event_date location capacity")
      .populate("user_id", "fullName email phone")
      .sort({ created_at: -1 });

    return res.status(200).json({
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error("Get Admin Tickets Error:", error);
    return res.status(500).json({
      message: "Failed to fetch tickets",
    });
  }
};

// GET /api/tickets/admin/:id - Get ticket details by ID (admin only)
export const getAdminTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid ticket ID format",
      });
    }

    const ticket = await Ticket.findById(id)
      .populate("event_id", "event_name event_description event_date location capacity price")
      .populate("user_id", "fullName email phone role");

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      ticket,
    });
  } catch (error) {
    console.error("Get Admin Ticket By ID Error:", error);
    return res.status(500).json({
      message: "Failed to fetch ticket",
    });
  }
};

// POST /api/tickets/book - Book a ticket
export const bookTicket = async (req, res) => {
  try {
    const { event_id, ticket_type = "regular" } = req.body;
    const user_id = req.user._id;

    if (!event_id) {
      return res.status(400).json({
        message: "Event ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(event_id)) {
      return res.status(400).json({
        message: "Invalid event ID format",
      });
    }

    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const existingTicket = await Ticket.findOne({ user_id, event_id });
    if (existingTicket) {
      return res.status(400).json({
        message: "You already have a ticket for this event",
      });
    }

    const reservedEvent = await reserveEventSeat(event_id);
    if (!reservedEvent) {
      return res.status(400).json({
        message: "Event is fully booked",
      });
    }

    try {
      if (Number(event.price || 0) > 0) {
        const successfulOrder = await Order.findOne({ user_id, event_id, status: "success" });
        if (!successfulOrder) {
          await releaseEventSeat(event_id);
          return res.status(402).json({
            message: "Payment required",
            requiresPayment: true,
            event: {
              _id: event._id,
              event_name: event.event_name,
              price: event.price,
            },
          });
        }
      }

      const ticket_code = generateTicketCode();
      const qr_code = JSON.stringify({
        ticket_code,
        event_id,
        user_id,
      });

      const ticket = await Ticket.create({
        user_id,
        event_id,
        ticket_type,
        ticket_code,
        qr_code,
        status: "booked",
        payment_status: Number(event.price || 0) <= 0 ? "paid" : "pending",
        price: Number(event.price || 0),
      });

      await ticket.populate([
        { path: "event_id", select: "event_name event_date location" },
        { path: "user_id", select: "fullName email" },
      ]);

      return res.status(201).json({
        message: "Ticket booked successfully",
        ticket,
      });
    } catch (error) {
      await releaseEventSeat(event_id).catch(() => { });
      throw error;
    }
  } catch (error) {
    console.error("Book Ticket Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "You already have a ticket for this event",
      });
    }

    return res.status(500).json({
      message: "Failed to book ticket",
    });
  }
};

// GET /api/tickets - Get all tickets (filtered by role)

export const getTickets = async (req, res) => {
  try {
    const { role, _id: user_id } = req.user;
    const { event_id, status } = req.query;
    const normalizedRole = String(role || "").toLowerCase();

    let query = {};

    if (normalizedRole === "student") {
      query.user_id = user_id;
    }

    if (normalizedRole === "coordinator") {
      const accessibleEvents = await Event.find({
        $or: [{ coordinator_id: user_id }, { created_by: user_id }],
      }).select("_id");

      const accessibleEventIds = accessibleEvents.map((event) => event._id);
      query.event_id = { $in: accessibleEventIds };
    }

    if (event_id) {
      if (!mongoose.Types.ObjectId.isValid(event_id)) {
        return res.status(400).json({
          message: "Invalid event ID format",
        });
      }
      if (normalizedRole === "coordinator") {
        const event = await Event.findById(event_id).select(
          "coordinator_id created_by",
        );
        if (!event || !canCoordinatorAccessEvent(event, req.user)) {
          return res.status(403).json({
            message: "You are not allowed to access tickets for this event",
          });
        }
      }

      query.event_id = event_id;
    }

    if (status && ["pending", "booked", "cancelled"].includes(status)) {
      query.status = status;
    }

    const tickets = await Ticket.find(query)
      .populate("event_id", "event_name event_date location")
      .populate("user_id", "fullName email")
      .sort({ created_at: -1 });

    return res.status(200).json({
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error("Get Tickets Error:", error);
    return res.status(500).json({
      message: "Failed to fetch tickets",
    });
  }
};

// GET /api/tickets/:id - Get ticket by ID
export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, _id: user_id } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid ticket ID format",
      });
    }

    const ticket = await Ticket.findById(id)
      .populate("event_id", "event_name event_description event_date location")
      .populate("user_id", "fullName email phone");

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (
      role === "student" &&
      ticket.user_id._id.toString() !== user_id.toString()
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (String(role || "").toLowerCase() === "coordinator") {
      const event = await Event.findById(ticket.event_id._id || ticket.event_id).select(
        "coordinator_id created_by",
      );
      if (!event || !canCoordinatorAccessEvent(event, req.user)) {
        return res.status(403).json({
          message: "You are not allowed to access this ticket",
        });
      }
    }

    return res.status(200).json({
      ticket,
    });
  } catch (error) {
    console.error("Get Ticket By ID Error:", error);
    return res.status(500).json({
      message: "Failed to fetch ticket",
    });
  }
};

// GET /api/tickets/download/:id - Download ticket as PDF

export const downloadTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, _id: user_id } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid ticket ID format",
      });
    }

    const ticket = await Ticket.findById(id)
      .populate("event_id", "event_name event_description event_date location")
      .populate("user_id", "fullName email phone");

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (
      role === "student" &&
      ticket.user_id._id.toString() !== user_id.toString()
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (String(role || "").toLowerCase() === "coordinator") {
      const event = await Event.findById(ticket.event_id._id || ticket.event_id).select(
        "coordinator_id created_by",
      );
      if (!event || !canCoordinatorAccessEvent(event, req.user)) {
        return res.status(403).json({
          message: "You are not allowed to download this ticket",
        });
      }
    }

    // Only allow downloading booked tickets
    if (ticket.status !== "booked") {
      return res.status(400).json({
        message: `Cannot download ticket with status "${ticket.status}". Only booked tickets can be downloaded.`,
      });
    }

    // Create PDF document
    const doc = new PDFDocument({ size: "A5", margin: 40 });

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ticket-${ticket.ticket_code}.pdf`,
    );

    // Pipe PDF to response
    doc.pipe(res);
    await renderTicketPdf(doc, ticket);
    doc.end();
  } catch (error) {
    console.error("Download Ticket Error:", error);
    return res.status(500).json({
      message: "Failed to download ticket",
    });
  }
};

// GET /api/tickets/bulk-download/:eventId - Bulk download tickets for an event

export const bulkDownloadTickets = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { role } = req.user;

    // Only coordinators and admins can bulk download
    if (!["super admin", "coordinator", "administration"].includes(role)) {
      return res.status(403).json({
        message: "Access denied. Admin or Coordinator access required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        message: "Invalid event ID format",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (String(role || "").toLowerCase() === "coordinator") {
      if (!canCoordinatorAccessEvent(event, req.user)) {
        return res.status(403).json({
          message: "You are not allowed to download tickets for this event",
        });
      }
    }

    // Import Payment and Attendance models
    const Payment = mongoose.model("Payment");
    const Attendance = mongoose.model("Attendance");

    const tickets = await Ticket.find({ event_id: eventId, status: "booked" })
      .populate("user_id", "fullName email phone")
      .populate("event_id", "event_name")
      .sort({ created_at: -1 });

    // Fetch payments for all tickets to get transaction IDs
    const ticketIds = tickets.map(t => t._id);
    const payments = await Payment.find({ ticket_id: { $in: ticketIds } }).lean();
    const paymentMap = {};
    payments.forEach(p => {
      paymentMap[p.ticket_id.toString()] = p;
    });

    // Fetch attendance records for all tickets
    const attendanceRecords = await Attendance.find({ ticket_id: { $in: ticketIds } }).lean();
    const attendanceMap = {};
    attendanceRecords.forEach(a => {
      attendanceMap[a.ticket_id.toString()] = a;
    });

    // Create CSV header
    const headers = [
      "Ticket ID",
      "Event Name",
      "Attendee Name",
      "Email",
      "Ticket Status",
      "Payment Status",
      "Booking Date",
      "Attendance Status",
      "Transaction ID",
    ];

    // Create CSV rows
    const rows = tickets.map((t) => {
      const payment = paymentMap[t._id.toString()];
      const attendance = attendanceMap[t._id.toString()];

      return [
        t._id.toString(),
        t.event_id?.event_name || "N/A",
        t.user_id?.fullName || "N/A",
        t.user_id?.email || "N/A",
        t.status?.toUpperCase() || "BOOKED",
        t.payment_status?.toUpperCase() || "PENDING",
        new Date(t.created_at).toLocaleString(),
        attendance ? attendance.status.toUpperCase() : "NOT MARKED",
        payment?.transaction_id || payment?.payu_txnid || "N/A",
      ];
    });

    // Combine headers and rows with proper CSV escaping
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    const safeEventName = event.event_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeEventName}-tickets.csv"`,
    );

    return res.send(csvContent);
  } catch (error) {
    console.error("Bulk Download Tickets Error:", error);
    return res.status(500).json({
      message: "Failed to fetch tickets for download",
    });
  }
};

// POST /api/tickets/bulk-create - Bulk create tickets for an event (admin/coordinator only)

export const bulkCreateTickets = async (req, res) => {
  try {
    const {
      event_id,
      ticket_price,
      ticket_quantity,
      ticket_type = "regular",
    } = req.body;
    const { role } = req.user;

    // Only super admin and coordinator can bulk create tickets
    if (!["super admin", "coordinator"].includes(role?.toLowerCase())) {
      return res.status(403).json({
        message: "Access denied. Super Admin or Coordinator access required.",
      });
    }

    // Validate required fields
    if (!event_id) {
      return res.status(400).json({
        message: "Event ID is required",
      });
    }

    if (ticket_price === undefined || ticket_price === null) {
      return res.status(400).json({
        message: "Ticket price is required",
      });
    }

    if (ticket_price < 0) {
      return res.status(400).json({
        message: "Ticket price cannot be negative",
      });
    }

    if (!ticket_quantity || ticket_quantity < 1) {
      return res.status(400).json({
        message: "Ticket quantity must be at least 1",
      });
    }

    if (ticket_quantity > 500) {
      return res.status(400).json({
        message: "Cannot create more than 500 tickets at once",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(event_id)) {
      return res.status(400).json({
        message: "Invalid event ID format",
      });
    }

    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // Check capacity
    const existingTickets = await Ticket.countDocuments({
      event_id,
      status: { $ne: "cancelled" },
    });

    const availableCapacity = event.capacity - existingTickets;
    if (ticket_quantity > availableCapacity) {
      return res.status(400).json({
        message: `Cannot create ${ticket_quantity} tickets. Only ${availableCapacity} spots available.`,
      });
    }

    // Create tickets in bulk
    const ticketsToCreate = [];
    for (let i = 0; i < ticket_quantity; i++) {
      const ticket_code = generateTicketCode();
      const qr_code = JSON.stringify({
        ticket_code,
        event_id,
      });

      ticketsToCreate.push({
        event_id,
        ticket_type,
        ticket_code,
        qr_code,
        price: ticket_price,
        status: "pending",
        is_assigned: false,
        user_id: null,
      });
    }

    const createdTickets = await Ticket.insertMany(ticketsToCreate);

    return res.status(201).json({
      message: `${createdTickets.length} tickets created successfully`,
      event: {
        _id: event._id,
        event_name: event.event_name,
        event_date: event.event_date,
      },
      tickets_created: createdTickets.length,
      ticket_price,
      ticket_type,
    });
  } catch (error) {
    console.error("Bulk Create Tickets Error:", error);
    return res.status(500).json({
      message: "Failed to create tickets in bulk",
    });
  }
};

// PATCH /api/tickets/:id/cancel - Cancel a ticket

export const cancelTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, _id: user_id } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid ticket ID format",
      });
    }

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (
      role === "student" &&
      ticket.user_id.toString() !== user_id.toString()
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (ticket.status === "cancelled") {
      return res.status(400).json({
        message: "Ticket is already cancelled",
      });
    }

    const wasBooked = ticket.status === "booked";
    const currentPaymentStatus = String(ticket.payment_status || "").toLowerCase();

    if (currentPaymentStatus === "paid") {
      return res.status(400).json({
        message: "Paid tickets cannot be cancelled",
      });
    }

    if (currentPaymentStatus === "pending") {
      const pendingPayment = await Payment.findOne({
        ticket_id: ticket._id,
        payment_status: "pending",
      }).sort({ created_at: -1 });

      if (pendingPayment) {
        pendingPayment.payment_status = "failed";
        pendingPayment.payment_response = {
          ...(pendingPayment.payment_response || {}),
          cancel_reason: "cancelled_by_student",
          cancelled_at: new Date().toISOString(),
        };
        await pendingPayment.save();
      }

      ticket.payment_status = "failed";
    }

    ticket.status = "cancelled";
    await ticket.save();

    if (wasBooked) {
      await releaseEventSeat(ticket.event_id);
    }

    return res.status(200).json({
      message: "Ticket cancelled successfully",
      ticket,
    });
  } catch (error) {
    console.error("Cancel Ticket Error:", error);
    return res.status(500).json({
      message: "Failed to cancel ticket",
    });
  }
};
