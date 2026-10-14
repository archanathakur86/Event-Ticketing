import crypto from "crypto";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Order from "../models/Order.js";
import Ticket from "../models/Ticket.js";
import Event from "../models/Event.js";
import { log } from "console";

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

// Webhook logging configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEBHOOK_LOG_FILE = process.env.WEBHOOK_LOG_FILE || path.join(__dirname, "../../logs/webhook.log");

// Ensure log directory exists
const ensureLogDirectory = () => {
  const logDir = path.dirname(WEBHOOK_LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

// Verbose webhook logger - writes detailed logs to file
const webhookLog = (level, message, data = {}) => {
  try {
    ensureLogDirectory();
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(data, null, 2)}\n`;
    fs.appendFileSync(WEBHOOK_LOG_FILE, logLine);

    // Also log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.log(`[WEBHOOK] ${logLine}`);
    }
  } catch (err) {
    console.error("Failed to write webhook log:", err);
  }
};

// PayU Configuration - use getters to read at runtime (after dotenv loads)
const getPayuKey = () => process.env.PAYU_KEY;
const getPayuSalt = () => process.env.PAYU_SALT;
const getFrontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";
const getBackendUrl = () => process.env.BACKEND_URL

// Feature flag: if true, creates ticket only after payment success
// if false, creates pending ticket upfront and updates on payment result
// Set CREATE_TICKET_ONLY_ON_PAYMENT_SUCCESS=false in .env to create pending tickets upfront
const CREATE_TICKET_ONLY_ON_PAYMENT_SUCCESS = () =>
  process.env.CREATE_TICKET_ONLY_ON_PAYMENT_SUCCESS !== "false"; // defaults to true

// PayU callback URLs - these must point to backend endpoints
const getPayuSuccessUrl = () => process.env.PAYU_SUCCESS_URL || `${getBackendUrl()}/api/payments/payment-success`;
const getPayuFailureUrl = () => process.env.PAYU_FAILURE_URL || `${getBackendUrl()}/api/payments/payment-fail`;

// Generate unique ticket code
const generateTicketCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomUUID().split("-")[0].toUpperCase();
  return `TKT-${timestamp}-${random}`;
};

// POST /api/payments/create-payment - Create payment and get PayU params
export const createPayment = async (req, res) => {
  try {
    const { event_id, ticket_type = "regular" } = req.body;
    const user = req.user;

    if (!event_id) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(event_id)) {
      return res.status(400).json({ error: "Invalid event ID format" });
    }

    // Check if event exists
    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if user already has a ticket for this event
    const existingTicket = await Ticket.findOne({
      user_id: user._id,
      event_id,
      status: { $in: ["booked", "pending"] },
    });

    if (existingTicket) {
      return res.status(400).json({
        error: "You already have a ticket for this event",
      });
    }

    // Check event capacity
    const bookedTickets = await Ticket.countDocuments({
      event_id,
      status: { $in: ["booked", "pending"] },
    });
    if (bookedTickets >= event.capacity) {
      return res.status(400).json({ error: "Event is fully booked" });
    }

    // Calculate amount based on ticket type
    let amount = event.price;
    if (ticket_type === "vip") {
      amount = event.price * 1.5;
    } else if (ticket_type === "early_bird") {
      amount = event.price * 0.8;
    }

    // Validate PayU configuration for paid events
    if (amount > 0 && (!getPayuKey() || !getPayuSalt())) {
      console.error("PayU configuration missing: PAYU_KEY or PAYU_SALT not set");
      return res.status(500).json({ error: "Payment gateway not configured properly" });
    }

    // If event is free, create ticket directly
    if (amount === 0) {
      const reservedEvent = await reserveEventSeat(event_id);
      if (!reservedEvent) {
        return res.status(400).json({ message: "Event is fully booked" });
      }

      try {
        const ticket_code = generateTicketCode();
        const qr_code = JSON.stringify({
          ticket_code,
          event_id,
          user_id: user._id,
        });

        const ticket = await Ticket.create({
          user_id: user._id,
          event_id,
          ticket_type,
          ticket_code,
          qr_code,
          status: "booked",
          payment_status: "paid",
          price: amount,
        });

        return res.status(201).json({
          message: "Free ticket booked successfully",
          ticket,
          is_free: true,
        });
      } catch (error) {
        await releaseEventSeat(event_id).catch(() => { });
        throw error;
      }
    }

    // Generate transaction ID and ticket code
    const txnid = "TXN_" + Date.now();
    const ticket_code = generateTicketCode();
    const productinfo = `Ticket for ${event.event_name}`;
    const firstname = user.fullName?.split(" ")[0] || "User";

    let ticket = null;

    // Feature flag: Create pending ticket upfront if flag is false
    if (!CREATE_TICKET_ONLY_ON_PAYMENT_SUCCESS()) {
      ticket = await Ticket.create({
        user_id: user._id,
        event_id,
        ticket_type,
        ticket_code,
        qr_code: null,
        status: "pending",
        payment_status: "pending",
        price: amount,
      });
    }

    // Store order in DB with ticket details in productinfo
    const order = new Order({
      productinfo: {
        description: productinfo,
        ticket_type,
        event_name: event.event_name,
        price: amount,
      },
      user_id: user._id,
      event_id,
      txnid,
      amount,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || "",
      ticket_id: ticket?._id || null, // Link ticket if created upfront
    });
    await order.save();

    const hashComponents = [
      getPayuKey(),
      txnid,
      amount,
      productinfo,
      firstname,
      user.email,
      "", "", "", "", "",
      "", "", "", "", "",
      getPayuSalt(),
    ];
    //hashComponents.join("|");
    // Generate hash per PayU specs
    const hashString = hashComponents.join("|");
    //`${getPayuKey()}|${txnid}|${amount}|${productinfo}|${firstname}|${user.email}|||||||||||${getPayuSalt()}`;

    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    const reverseHash = crypto.createHash("sha512").update(hashComponents.reverse().join("|")).digest("hex");
    res.json({
      key: getPayuKey(),
      txnid,
      amount,
      productinfo,
      firstname,
      email: user.email,
      phone: user.phone || "9999999999",
      surl: getPayuSuccessUrl(),
      furl: getPayuFailureUrl(),
      hash,
      service_provider: "payu_paisa",
    });
    console.log(hashString);
    console.log(`${getPayuKey()}|${txnid}|${amount}|${productinfo}|${firstname}|${user.email}|||||||||||${getPayuSalt()}`);


    console.log(hash);
    console.log(reverseHash);


  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({ error: "Payment creation failed" });
  }
};

// POST /api/payments/payment-success - PayU success callback
export const paymentSuccess = async (req, res) => {
  try {
    const { txnid, status, mihpayid } = req.body;

    const order = await Order.findOne({ txnid });
    if (!order) {
      return res.redirect(`${getFrontendUrl()}/payment/failure?error=order_not_found`);
    }

    if (status === "success") {
      order.status = "success";
      order.mihpayid = mihpayid;
      order.mode = req.body.mode;
      order.bank_ref_num = req.body.bank_ref_num;
      order.bankcode = req.body.bankcode;
      order.payment_date = new Date();
      order.payu_response = req.body;

      const ticket_code = generateTicketCode();
      const qr_code = JSON.stringify({
        ticket_code,
        event_id: order.event_id,
        user_id: order.user_id,
      });

      let ticket;

      if (CREATE_TICKET_ONLY_ON_PAYMENT_SUCCESS()) {
        // Create ticket only after successful payment verification
        ticket = await Ticket.create({
          user_id: order.user_id,
          event_id: order.event_id,
          ticket_type: order.productinfo?.ticket_type || "regular",
          ticket_code,
          qr_code,
          status: "booked",
          payment_status: "paid",
          price: order.productinfo?.price || order.amount,
        });
        order.ticket_id = ticket._id;
      } else {
        // Update existing pending ticket
        ticket = await Ticket.findById(order.ticket_id);
        if (ticket) {
          ticket.status = "booked";
          ticket.payment_status = "paid";
          ticket.qr_code = qr_code;
          await ticket.save();
        }
      }

      await order.save();
      res.redirect(`${getFrontendUrl()}/payment/success?txnid=${txnid}`);
    } else {
      order.status = "failed";
      order.payu_response = req.body;
      await order.save();

      // If ticket was created upfront, mark as cancelled
      if (!CREATE_TICKET_ONLY_ON_PAYMENT_SUCCESS() && order.ticket_id) {
        const ticket = await Ticket.findById(order.ticket_id);
        if (ticket) {
          ticket.status = "cancelled";
          ticket.payment_status = "failed";
          await ticket.save();
        }
      }

      res.redirect(`${getFrontendUrl()}/payment/failure?txnid=${txnid}`);
    }
  } catch (error) {
    console.error("Payment success error:", error);
    res.redirect(`${getFrontendUrl()}/payment/failure`);
  }
};

// POST /api/payments/payment-fail - PayU failure callback
export const paymentFailure = async (req, res) => {
  try {
    const { txnid } = req.body;

    if (txnid) {
      const order = await Order.findOne({ txnid });
      if (order) {
        order.status = "failed";
        order.payu_response = req.body;
        await order.save();

        // Only update ticket if it was created upfront (flag was false)
        if (order.ticket_id) {
          const ticket = await Ticket.findById(order.ticket_id);
          if (ticket) {
            ticket.status = "cancelled";
            ticket.payment_status = "failed";
            await ticket.save();
          }
        }
      }
    }

    res.redirect(`${getFrontendUrl()}/payment/failure?txnid=${txnid || ""}`);
  } catch (error) {
    res.redirect(`${getFrontendUrl()}/payment/failure`);
  }
};

// GET /api/payments/order/:txnid - Get order status by txnid
export const getOrderStatus = async (req, res) => {
  try {
    const { txnid } = req.params;

    const order = await Order.findOne({ txnid })
      .populate("ticket_id", "ticket_code status payment_status")
      .populate("event_id", "event_name event_date")
      .select("-__v");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/payments/webhook - PayU server-to-server webhook notification
// This is called by PayU servers directly (more reliable than browser redirects)
export const paymentWebhook = async (req, res) => {
  const startTime = Date.now();
  const requestId = `WH_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  webhookLog("info", "Webhook request received", {
    requestId,
    method: req.method,
    url: req.originalUrl,
    headers: {
      "content-type": req.headers["content-type"],
      "user-agent": req.headers["user-agent"],
      "x-forwarded-for": req.headers["x-forwarded-for"],
      host: req.headers.host,
    },
    ip: req.ip || req.connection?.remoteAddress,
    body: req.body,
  });

  try {
    const { merchantTransactionId: txnid, status, mihpayid, hash } = req.body;

    webhookLog("debug", "Extracted webhook parameters", {
      requestId,
      txnid,
      status,
      mihpayid,
      hashProvided: !!hash,
      hashLength: hash?.length,
    });

    // Verify webhook hash (reverse hash verification)
    // PayU sends: sha512(SALT|status||||||||||||||email|firstname|productinfo|amount|txnid|key)
    const order = await Order.findOne({ txnid });
    if (!order) {
      webhookLog("error", "Order not found for txnid", {
        requestId,
        txnid,
        searchDuration: Date.now() - startTime,
      });
      return res.status(404).json({ error: "Order not found" });
    }

    webhookLog("debug", "Order found", {
      requestId,
      txnid,
      orderId: order._id,
      orderStatus: order.status,
      orderAmount: order.amount,
      userId: order.user_id,
      eventId: order.event_id,
      ticketId: order.ticket_id,
      existingMihpayid: order.mihpayid,
    });

    // Verify hash to ensure request is from PayU
    const productinfoStr = order.productinfo?.description || "";
    const reverseHashString = `${getPayuSalt()}|||||||||||${order.email}|${order.fullName?.split(" ")[0] || "User"}|${productinfoStr}|${order.amount}|${txnid}|${getPayuKey()}`;

    webhookLog("debug", "Hash verification details", {
      requestId,
      txnid,
      reverseHashString: reverseHashString.replace(getPayuSalt(), "[SALT_HIDDEN]").replace(getPayuKey(), "[KEY_HIDDEN]"),
      productinfoStr,
      email: order.email,
      firstname: order.fullName?.split(" ")[0] || "User",
      amount: order.amount,
    });

    const calculatedHash = crypto.createHash("sha512").update(reverseHashString).digest("hex");

    webhookLog("debug", "Hash comparison", {
      requestId,
      txnid,
      receivedHash: hash?.substring(0, 20) + "...",
      calculatedHash: calculatedHash.substring(0, 20) + "...",
      hashMatch: hash === calculatedHash,
    });

    if (hash && hash !== calculatedHash) {
      webhookLog("error", "Hash verification failed", {
        requestId,
        txnid,
        receivedHash: hash,
        calculatedHash,
        duration: Date.now() - startTime,
      });
      return res.status(400).json({ error: "Hash verification failed" });
    }

    webhookLog("info", "Hash verification passed", { requestId, txnid });

    // Skip if order already processed
    if (order.status === "success" || order.status === "failed") {
      webhookLog("warn", "Order already processed - skipping", {
        requestId,
        txnid,
        existingStatus: order.status,
        existingMihpayid: order.mihpayid,
        incomingStatus: status,
        incomingMihpayid: mihpayid,
        duration: Date.now() - startTime,
      });
      return res.json({ message: "Order already processed", status: order.status });
    }

    if (status === "success") {
      webhookLog("info", "Processing successful payment", {
        requestId,
        txnid,
        mihpayid,
        mode: req.body.mode,
        bankRefNum: req.body.bank_ref_num,
        bankcode: req.body.bankcode,
      });

      order.status = "success";
      order.mihpayid = mihpayid;
      order.mode = req.body.mode;
      order.bank_ref_num = req.body.bank_ref_num;
      order.bankcode = req.body.bankcode;
      order.payment_date = new Date();
      order.payu_response = req.body;

      // Create ticket if not already created (CREATE_TICKET_ONLY_ON_PAYMENT_SUCCESS=true)
      if (!order.ticket_id) {
        webhookLog("info", "Creating new ticket for order", {
          requestId,
          txnid,
          userId: order.user_id,
          eventId: order.event_id,
          ticketType: order.productinfo?.ticket_type || "regular",
        });

        const ticket_code = generateTicketCode();
        const qr_code = JSON.stringify({
          ticket_code,
          event_id: order.event_id,
          user_id: order.user_id,
        });

        const ticket = await Ticket.create({
          user_id: order.user_id,
          event_id: order.event_id,
          ticket_type: order.productinfo?.ticket_type || "regular",
          ticket_code,
          qr_code,
          status: "booked",
          payment_status: "paid",
          price: order.productinfo?.price || order.amount,
        });
        order.ticket_id = ticket._id;

        webhookLog("info", "Ticket created successfully", {
          requestId,
          txnid,
          ticketId: ticket._id,
          ticketCode: ticket_code,
          ticketStatus: "booked",
        });
      } else {
        // Update existing pending ticket
        webhookLog("info", "Updating existing pending ticket", {
          requestId,
          txnid,
          ticketId: order.ticket_id,
        });

        const ticket = await Ticket.findById(order.ticket_id);
        if (ticket && ticket.status === "pending") {
          const ticket_code = generateTicketCode();
          ticket.status = "booked";
          ticket.payment_status = "paid";
          ticket.qr_code = JSON.stringify({
            ticket_code,
            event_id: order.event_id,
            user_id: order.user_id,
          });
          await ticket.save();

          webhookLog("info", "Ticket updated successfully", {
            requestId,
            txnid,
            ticketId: ticket._id,
            ticketCode: ticket_code,
            previousStatus: "pending",
            newStatus: "booked",
          });
        } else {
          webhookLog("warn", "Ticket not found or not in pending state", {
            requestId,
            txnid,
            ticketId: order.ticket_id,
            ticketFound: !!ticket,
            ticketStatus: ticket?.status,
          });
        }
      }

      await order.save();

      webhookLog("info", "Payment success processed completely", {
        requestId,
        txnid,
        orderId: order._id,
        ticketId: order.ticket_id,
        amount: order.amount,
        duration: Date.now() - startTime,
      });

      return res.json({ message: "Payment verified and ticket created", txnid });
    } else {
      webhookLog("info", "Processing failed payment", {
        requestId,
        txnid,
        status,
        errorMessage: req.body.error_Message,
        errorCode: req.body.error,
        unmappedstatus: req.body.unmappedstatus,
      });

      order.status = "failed";
      order.payu_response = req.body;
      await order.save();

      // Cancel pending ticket if exists
      if (order.ticket_id) {
        const ticket = await Ticket.findById(order.ticket_id);
        if (ticket && ticket.status === "pending") {
          ticket.status = "cancelled";
          ticket.payment_status = "failed";
          await ticket.save();

          webhookLog("info", "Pending ticket cancelled due to payment failure", {
            requestId,
            txnid,
            ticketId: ticket._id,
          });
        }
      }

      webhookLog("info", "Payment failure processed completely", {
        requestId,
        txnid,
        orderId: order._id,
        duration: Date.now() - startTime,
      });

      return res.json({ message: "Payment failure recorded", txnid });
    }
  } catch (error) {
    webhookLog("error", "Webhook processing error", {
      requestId,
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      body: req.body,
      duration: Date.now() - startTime,
    });
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

// POST /api/payments/verify - Manually verify payment status (for frontend retry)
export const verifyPayment = async (req, res) => {
  try {
    const { txnid } = req.body;

    if (!txnid) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const order = await Order.findOne({ txnid })
      .populate("ticket_id", "ticket_code status payment_status qr_code")
      .populate("event_id", "event_name event_date");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      txnid: order.txnid,
      status: order.status,
      amount: order.amount,
      event: order.event_id,
      ticket: order.ticket_id,
      payment_date: order.payment_date,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: "Payment verification failed" });
  }
};

export const getEventPayments = async (req, res) => {
  try {
    const { event_id, status, user_id } = req.query;

    const filters = {};
    if (event_id) filters.event_id = event_id;
    if (status) filters.status = status;
    if (user_id) filters.user_id = user_id;

    const payments = await Order.find(filters)
      .populate("ticket_id", "ticket_code status payment_status")
      .populate("event_id", "event_name event_date")
      .select("-__v")
      .sort({ payment_date: -1 });
    res.json({ payments, count: payments.length });
  } catch (error) {
    console.error("Get event payments error:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
}
