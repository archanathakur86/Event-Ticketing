import { Router } from "express";
import {
  bookTicket,
  getTickets,
  getTicketById,
  downloadTicket,
  bulkDownloadTickets,
  bulkCreateTickets,
  cancelTicket,
  getAdminTickets,
  getAdminTicketById,
} from "../controllers/TicketController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import { requireRole } from "../middleware/RoleMiddleware.js";

const ticketRoutes = Router();

ticketRoutes.use(verifyToken);
ticketRoutes.get("/admin/all", requireRole(["super admin", "superadmin", "admin", "administrator", "administration"]), getAdminTickets);
ticketRoutes.get("/admin/:id", requireRole(["super admin", "superadmin", "admin", "administrator", "administration"]), getAdminTicketById);
ticketRoutes.post("/book", bookTicket);
ticketRoutes.post("/bulk-create", bulkCreateTickets);
ticketRoutes.get("/", getTickets);
ticketRoutes.get("/download/:id", downloadTicket);
ticketRoutes.get("/bulk-download/:eventId", bulkDownloadTickets);
ticketRoutes.get("/:id", getTicketById);
ticketRoutes.patch("/:id/cancel", cancelTicket);

export default ticketRoutes;
