import { Router } from "express";
import {
  createPayment,
  paymentSuccess,
  paymentFailure,
  getOrderStatus,
  paymentWebhook,
  verifyPayment,
  getEventPayments
} from "../controllers/PaymentController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";


const paymentRoutes = Router();

// GET /api/payments - Get payments (requires auth)
paymentRoutes.get("/", verifyToken, getEventPayments);

// POST /api/payments/create-payment - Create payment (requires auth)
paymentRoutes.post("/create-payment", verifyToken, createPayment);

// POST /api/payments/payment-success - PayU success callback (no auth - called by PayU)
paymentRoutes.post("/payment-success", paymentSuccess);

// POST /api/payments/payment-fail - PayU failure callback (no auth - called by PayU)
paymentRoutes.post("/payment-fail", paymentFailure);

// POST /api/payments/webhook - PayU server-to-server webhook (no auth - called by PayU)
paymentRoutes.post("/webhook", paymentWebhook);

// POST /api/payments/verify - Verify payment status (requires auth)
paymentRoutes.post("/verify", verifyToken, verifyPayment);

// GET /api/payments/order/:txnid - Get order status by txnid
paymentRoutes.get("/order/:txnid", getOrderStatus);

export default paymentRoutes;