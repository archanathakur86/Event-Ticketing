import { Router } from "express";
import {
  createEvent,
  getEvents,
  getAdminEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controllers/EventController.js";
import { verifyAdmin } from "../middleware/AdminAuthMiddleware.js";
import { optionalAuth, verifyToken } from "../middleware/AuthMiddleware.js";
import { requireRole } from "../middleware/RoleMiddleware.js";

const eventRoutes = Router();

eventRoutes.post("/", verifyToken, requireRole(["super admin", "administration", "coordinator"]), createEvent);
// Public endpoints: allow unauthenticated users to read events
eventRoutes.get("/", optionalAuth, getEvents);
eventRoutes.get("/admin/all", verifyToken, requireRole(["super admin", "administration"]), getAdminEvents);
eventRoutes.get("/:id", optionalAuth, getEventById);
eventRoutes.put("/:id", verifyToken, requireRole(["super admin", "administration", "coordinator"]), updateEvent);
eventRoutes.delete("/:id", verifyAdmin, deleteEvent);
export default eventRoutes;
