import mongoose from "mongoose";
import Event from "../models/Event.js";

export const checkNotificationPermission = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Normalize role to lowercase and remove spaces for consistent comparison
    const userRole = String(user.role || "").toLowerCase().replace(/\s+/g, "");

    // 🚫 Students cannot send notifications
    if (userRole === "student") {
      return res.status(403).json({
        message: "Students are not allowed to send notifications",
      });
    }

    // 🔴 Super Admin / Administration
    if (userRole === "superadmin" || userRole === "administration") {
      // Global notification (no eventId)
      if (!eventId) {
        return next();
      }

      // Event-specific → validate event exists
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ message: "Invalid event ID format" });
      }

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      req.event = event;
      return next();
    }

    // 🟡 Coordinator
    if (userRole === "coordinator") {
      if (!eventId) {
        return res.status(400).json({
          message: "Event ID is required for coordinators",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ message: "Invalid event ID format" });
      }

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!event.coordinator_id) {
        return res.status(403).json({
          message: "No coordinator assigned to this event",
        });
      }

      if (event.coordinator_id.toString() !== user._id.toString()) {
        return res.status(403).json({
          message: "You are not assigned to this event",
        });
      }

      req.event = event;
      return next();
    }

    return res.status(403).json({ message: "Insufficient permissions" });
  } catch (error) {
    console.error("Notification permission error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
