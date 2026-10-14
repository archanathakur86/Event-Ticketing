import mongoose from "mongoose";
import Event from "../models/Event.js";
import EventStatusLog from "../models/EventStatusLog.js";
import Notification from "../models/Notification.js";
import Ticket from "../models/Ticket.js";

async function attachAvailability(events) {
  const list = Array.isArray(events) ? events.filter(Boolean) : events ? [events] : [];
  if (list.length === 0) return Array.isArray(events) ? [] : null;

  const eventIds = list
    .map((event) => event?._id)
    .filter(Boolean);

  const bookedCounts = await Ticket.aggregate([
    {
      $match: {
        event_id: { $in: eventIds },
        status: "booked",
        payment_status: { $in: ["paid", "pending"] },
      },
    },
    {
      $group: {
        _id: "$event_id",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map(
    bookedCounts.map((item) => [String(item._id), Number(item.count || 0)]),
  );

  const mapped = list.map((eventDoc) => {
    const event = typeof eventDoc.toObject === "function" ? eventDoc.toObject() : { ...eventDoc };
    const bookedCount = countMap.get(String(event._id)) ?? Number(event.booked_count || 0);
    const capacity = Number(event.capacity || 0);
    return {
      ...event,
      booked_count: bookedCount,
      available_seats: Math.max(0, capacity - bookedCount),
    };
  });

  return Array.isArray(events) ? mapped : mapped[0] || null;
}

async function createCoordinatorAssignmentNotification({
  actorId,
  event,
  previousCoordinatorId = null,
}) {
  const coordinatorId = event?.coordinator_id;
  if (!actorId || !event?._id || !coordinatorId) return;

  const previousId = previousCoordinatorId ? String(previousCoordinatorId) : null;
  const currentId = String(coordinatorId);
  if (previousId && previousId === currentId) return;

  const subject = previousId
    ? `Event reassigned: ${event.event_name}`
    : `New event assigned: ${event.event_name}`;

  const dateText = event.event_date
    ? new Date(event.event_date).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "Date not set";

  const message = previousId
    ? `You have been assigned as coordinator for "${event.event_name}" scheduled on ${dateText} at ${event.location}.`
    : `A new event "${event.event_name}" has been assigned to you. It is scheduled on ${dateText} at ${event.location}.`;

  try {
    await Notification.create({
      event_id: event._id,
      sent_by: actorId,
      recipient_user: coordinatorId,
      subject,
      message_body: message,
    });
  } catch (error) {
    console.warn("Failed to create coordinator assignment notification:", error);
  }
}

export const createEvent = async (req, res) => {
  try {
    const {
      event_name,
      event_description,
      event_date,
      location,
      capacity,
      price = 0,
    } = req.body;

    // validation
    if (
      !event_name ||
      !event_description ||
      !event_date ||
      !location ||
      !capacity
    ) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    const role = String(req.user?.role || "").toLowerCase();
    const coordinatorId =
      req.body.coordinator_id ||
      req.body.coordinatorId ||
      (role === "coordinator" ? req.user._id : null);

    const event = await Event.create({
      event_name,
      event_description,
      event_date,
      location,
      capacity,
      price: parseFloat(price) || 0,
      status: req.body.status !== undefined ? req.body.status : undefined,
      isActive: req.body.isActive !== undefined ? req.body.isActive : undefined,
      created_by: req.user._id,
      coordinator_id: coordinatorId,
    });

    await createCoordinatorAssignmentNotification({
      actorId: req.user._id,
      event,
    });

    return res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Create Event Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getEvents = async (req, res) => {
  try {
    const user = req.user || null;
    let filter = {};

    // 🟡 Coordinator → assigned events OR events created by this coordinator
    if (String(user?.role || "").toLowerCase() === "coordinator") {
      filter = {
        coordinator_id: user._id,
      };
    }

    if (String(user?.role || "").toLowerCase() === "student") {
      filter.status = { $in: ["Published", "published"] };
    }
    // 🔴 Super admin → no filter (see all)
    // 🔵 Student → no filter (see all)

    const events = await Event.find(filter)
      .sort({ created_at: -1 })
      .populate("created_by", "fullName email role")
      .select(
        "event_name event_description event_date location capacity price created_at coordinator_id booked_count",
      );

    const hydratedEvents = await attachAvailability(events);

    return res.status(200).json({
      count: events.length,
      events: hydratedEvents,
    });
  } catch (error) {
    console.error("Get Events Error:", error);
    return res.status(500).json({
      message: "Failed to fetch events",
    });
  }
};

// Public events: only published and active
export const getPublicEvents = async (req, res) => {
  try {
    const events = await Event.find({
      status: { $in: ["Published", "published"] },
      isActive: true,
    })
      .sort({ event_date: 1 })
      .select('event_name event_description event_date location capacity price created_at booked_count')

    const hydratedEvents = await attachAvailability(events);

    return res.status(200).json({ count: events.length, events: hydratedEvents })
  } catch (error) {
    console.error("Get Public Events Error:", error);
    return res.status(500).json({ message: "Failed to fetch public events" });
  }
};

// Admin events: return everything (admins only middleware should protect this)
export const getAdminEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ created_at: -1 })
      .populate("created_by", "fullName email role")
    const hydratedEvents = await attachAvailability(events)
    return res.status(200).json({ count: events.length, events: hydratedEvents })
  } catch (error) {
    console.error("Get Admin Events Error:", error);
    return res.status(500).json({ message: "Failed to fetch admin events" });
  }
};

// Coordinator: return events assigned to the logged-in coordinator
export const getCoordinatorEvents = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId)
      return res.status(401).json({ message: "Authentication required" });
    const events = await Event.find({
      $or: [
        { coordinator_id: userId },
      ],
    }).sort({ event_date: 1 })
    const hydratedEvents = await attachAvailability(events)
    return res.status(200).json({ count: events.length, events: hydratedEvents })
  } catch (error) {
    console.error("Get Coordinator Events Error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch coordinator events" });
  }
};

// Patch event status (admin/administrator only)
export const patchEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (typeof isActive !== "undefined") updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid status or isActive provided" });
    }

    const before = await Event.findById(id).lean();
    if (!before) return res.status(404).json({ message: "Event not found" });

    const updated = await Event.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: "Event not found" });

    // Log the status change
    try {
      const actor = req.user && req.user._id;
      const oldStatus = before.status;
      const newStatus =
        updates.status !== undefined ? updates.status : before.status;
      const log = new EventStatusLog({
        eventId: id,
        oldStatus,
        newStatus,
        updatedBy: actor,
      });
      await log.save();
      console.log("Event status changed", {
        eventId: id,
        oldStatus,
        newStatus,
        updatedBy: actor,
      });
    } catch (logErr) {
      console.warn("Failed to save status log", logErr);
    }

    return res
      .status(200)
      .json({ message: "Event status updated", event: updated });
  } catch (error) {
    console.error("Patch Event Status Error:", error);
    return res.status(500).json({ message: "Failed to update event status" });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || null;

    if (!id) {
      return res.status(400).json({
        message: "Event ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID format",
      });
    }

    const event = await Event.findById(id)
      .populate("created_by", "fullName email role")
      .populate("coordinator_id", "fullName email role")
      .select(
        "event_name event_description event_date location capacity price status isActive created_at coordinator_id created_by booked_count",
      );

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // 🟡 Coordinator restriction
    if (String(user?.role || "").toLowerCase() === "coordinator") {
      const isAssigned =
        event.coordinator_id &&
        event.coordinator_id.toString() === user._id.toString();
      const isCreator =
        event.created_by &&
        event.created_by.toString() === user._id.toString();

      if (!isAssigned && !isCreator) {
        return res.status(403).json({
          message: "You cannot access this event",
        });
      }
    }

    const hydratedEvent = await attachAvailability(event);

    return res.status(200).json({
      event: hydratedEvent,
    });
  } catch (error) {
    console.error("Get Event By ID Error:", error);
    return res.status(500).json({
      message: "Failed to fetch event",
    });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || null;

    // 1️⃣ validate id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID format",
      });
    }

    // 2️⃣ whitelist allowed fields
    const allowedFields = [
      "event_name",
      "event_description",
      "event_date",
      "location",
      "capacity",
      "price",
      "status",
      "isActive",
      "coordinator_id",
    ];

    const updates = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // 3️⃣ reject empty update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    const existingEvent = await Event.findById(id).select("coordinator_id created_by");
    if (!existingEvent) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (String(user?.role || "").toLowerCase() === "coordinator") {
      const isCreator =
        existingEvent.created_by &&
        existingEvent.created_by.toString() === user._id.toString();

      if (!isCreator) {
        return res.status(403).json({
          message: "You cant edit admin created event",
        });
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("created_by", "fullName email role")
      .populate("coordinator_id", "fullName email role")
      .select(
        "event_name event_description event_date location capacity price status isActive created_at coordinator_id created_by",
      );

    if (!updatedEvent) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    await createCoordinatorAssignmentNotification({
      actorId: req.user._id,
      event: updatedEvent,
      previousCoordinatorId: existingEvent.coordinator_id,
    });

    return res.status(200).json({
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Update Event Error:", error);
    return res.status(500).json({
      message: "Failed to update event",
    });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ validate id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID format",
      });
    }

    console.log(
      "Delete event requested for id:",
      id,
      "by user:",
      req.user?._id,
    );
    // 2️⃣ delete event
    const deletedEvent = await Event.findByIdAndDelete(id).select(
      "event_name event_date location capacity created_at",
    );

    console.log("Delete event result:", deletedEvent);
    if (!deletedEvent) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    return res.status(200).json({
      message: "Event deleted successfully",
      event: deletedEvent,
    });
  } catch (error) {
    console.error("Delete Event Error:", error);
    return res.status(500).json({
      message: "Failed to delete event",
    });
  }
};
