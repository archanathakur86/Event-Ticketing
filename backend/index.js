import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/AuthRoute.js";
import eventRoutes from "./src/routes/EventRoute.js";
import ticketRoutes from "./src/routes/TicketRoute.js";
import paymentRoutes from "./src/routes/PaymentRoute.js";
import userRoutes from "./src/routes/UserRoute.js";
import logRoutes from "./src/routes/LogRoute.js";
import notificationRoutes from "./src/routes/NotificationRoute.js";
import attendanceRoutes from "./src/routes/AttendanceRoute.js";
import ticketTemplateRoutes from "./src/routes/TicketTemplateRoute.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "127.0.0.1";

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // For PayU callback

// Connect to MongoDB
connectDB();

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/payments", paymentRoutes);
// Additional routes
app.use("/api/logs", logRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/ticket-template", ticketTemplateRoutes);

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  console.error("HTTP server error:", error);
});
