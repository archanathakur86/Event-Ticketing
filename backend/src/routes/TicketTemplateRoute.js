import { Router } from "express";
import {
  getTicketTemplate,
  upsertTicketTemplate,
} from "../controllers/TicketTemplateController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import { requireRole } from "../middleware/RoleMiddleware.js";

const ticketTemplateRoutes = Router();

ticketTemplateRoutes.get("/", verifyToken, getTicketTemplate);
ticketTemplateRoutes.put(
  "/",
  verifyToken,
  requireRole(["super admin", "administration"]),
  upsertTicketTemplate,
);

export default ticketTemplateRoutes;
