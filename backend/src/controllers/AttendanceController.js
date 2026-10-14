import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Ticket from "../models/Ticket.js";
import Event from "../models/Event.js";
import User from "../models/User.js";

const canCoordinatorAccessEvent = (event, user) => {
  if (!event || !user) return false;
  const userId = user._id?.toString();
  if (!userId) return false;
  return event.coordinator_id && event.coordinator_id.toString() === userId;
};

export const markAttendance = async (req, res) => {
  try {
    const { ticket_code, ticketId, status } = req.body;
    const user = req.user;
    const actorId = user?._id || user?.id || req.userId || null;

    if ((!ticket_code && !ticketId) || !status) {
      return res.status(400).json({
        message: "Ticket code or ticket ID and status are required",
      });
    }

    if (!["present", "absent"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    if (!actorId || !mongoose.Types.ObjectId.isValid(String(actorId))) {
      return res.status(401).json({
        message: "Invalid authenticated user",
      });
    }

    let ticket = null;
    if (ticket_code) {
      ticket = await Ticket.findOne({ ticket_code });
    }
    if (!ticket && ticketId && mongoose.Types.ObjectId.isValid(String(ticketId))) {
      ticket = await Ticket.findById(ticketId);
    }

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    const isValidForAttendance =
      ticket.status === "booked" || ticket.payment_status === "paid";

    if (!isValidForAttendance) {
      return res.status(400).json({
        message: "Ticket is not valid for attendance",
      });
    }

    // Role restriction
    if (user.role === "student") {
      return res.status(403).json({
        message: "Students cannot mark attendance",
      });
    }

    if (user.role === "coordinator") {
      const event = await Event.findById(ticket.event_id);

      if (!event) {
        return res.status(404).json({
          message: "Event not found",
        });
      }

      if (
        !canCoordinatorAccessEvent(event, user)
      ) {
        return res.status(403).json({
          message: "You are not assigned to this event",
        });
      }
    }

    const ticketObjectId = new mongoose.Types.ObjectId(String(ticket._id));
    const eventObjectId = new mongoose.Types.ObjectId(String(ticket.event_id));
    const actorObjectId = new mongoose.Types.ObjectId(String(actorId));
    const attendeeObjectId =
      ticket.user_id && mongoose.Types.ObjectId.isValid(String(ticket.user_id))
        ? new mongoose.Types.ObjectId(String(ticket.user_id))
        : null;

    const existingAttendance = await Attendance.findOne({ ticket_id: ticketObjectId });
    if (
      existingAttendance &&
      existingAttendance.status === "present" &&
      status === "present"
    ) {
      return res.status(400).json({
        message: "Attendance already marked",
      });
    }

    const update = {
      $set: {
        ticket: ticketObjectId,
        status,
        marked_by: actorObjectId,
        marked_at: new Date(),
        event_id: eventObjectId,
        eventId: eventObjectId,
        userId: attendeeObjectId,
      },
      $setOnInsert: {
        ticket_id: ticketObjectId,
      },
    };

    let attendance;
    try {
      attendance = await Attendance.findOneAndUpdate(
        { ticket_id: ticketObjectId },
        update,
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error) {
      if (error?.code !== 11000) throw error;

      // Repair stale/corrupt attendance rows that already exist for this ticket.
      attendance = await Attendance.findOne({ ticket_id: ticketObjectId });
      if (!attendance) throw error;

      attendance.status = status;
      attendance.ticket = ticketObjectId;
      attendance.marked_by = actorObjectId;
      attendance.marked_at = new Date();
      attendance.event_id = eventObjectId;
      attendance.eventId = eventObjectId;
      attendance.userId = attendeeObjectId;
      await attendance.save();
    }

    return res.status(200).json({
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    return res.status(500).json({
      message: error?.message || "Internal server error",
    });
  }
};

export const getAttendanceByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const user = req.user;

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

    // 🔒 Permission Check
    if (user.role === "student") {
      return res.status(403).json({
        message: "Students cannot view event attendance",
      });
    }

    if (user.role === "coordinator") {
      if (
        !canCoordinatorAccessEvent(event, user)
      ) {
        return res.status(403).json({
          message: "You are not assigned to this event",
        });
      }
    }

    const bookedTickets = await Ticket.find({
      event_id: eventId,
      status: "booked",
    })
      .select("_id")
      .lean();

    const ticketIds = bookedTickets.map((ticket) => ticket._id);
    const totalTickets = ticketIds.length;

    // Fetch attendance by ticket ids so stale rows with wrong event_id still appear correctly.
    const attendanceRecords = await Attendance.find({
      ticket_id: { $in: ticketIds },
    })
      .populate("ticket_id")
      .populate("marked_by", "fullName email role")
      .sort({ marked_at: -1 });

    const totalPresent = attendanceRecords.filter(
      (a) => a.status === "present",
    ).length;

    const totalAbsent = totalTickets - totalPresent;

    return res.status(200).json({
      event: {
        id: event._id,
        name: event.event_name,
      },
      summary: {
        totalTickets,
        totalPresent,
        totalAbsent,
      },
      attendance: attendanceRecords,
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const fetchAllAttendance = async (req, res) => {
  try {
    const user = req.user;

    // Students cannot fetch global attendance list
    if (user.role === 'student') {
      return res.status(403).json({ message: 'Students cannot view attendance list' });
    }

    // Determine events user can access
    let events = [];
    if (user.role === 'super admin' || user.role === 'administration') {
      events = await Event.find().select('_id event_name').lean();
    } else if (user.role === 'coordinator') {
      events = await Event.find({ coordinator_id: user._id }).select('_id event_name').lean();
    } else {
      // default: no events
      events = [];
    }

    // For each event compute summary counts
    const summaries = await Promise.all(events.map(async (ev) => {
      const totalTickets = await Ticket.countDocuments({ event_id: ev._id, status: 'booked' });
      const attendanceRecords = await Attendance.find({ event_id: ev._id }).select('status').lean();
      const totalPresent = attendanceRecords.filter(a => a.status === 'present').length;
      const totalAbsent = Math.max(0, totalTickets - totalPresent);
      return {
        event: { id: ev._id, name: ev.event_name },
        summary: { totalTickets, totalPresent, totalAbsent }
      };
    }));

    return res.status(200).json({ count: summaries.length, items: summaries });
  } catch (error) {
    console.error('Fetch all attendance error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const exportAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const user = req.user;

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

    // 🔒 Permission
    if (user.role === "student") {
      return res.status(403).json({
        message: "Students cannot export attendance",
      });
    }

    if (user.role === "coordinator") {
      if (
        !canCoordinatorAccessEvent(event, user)
      ) {
        return res.status(403).json({
          message: "You are not assigned to this event",
        });
      }
    }

    // Get booked tickets
    const tickets = await Ticket.find({
      event_id: eventId,
      status: "booked",
    }).populate("user_id", "fullName email");

    // Get attendance records
    const attendanceMap = {};
    const attendanceRecords = await Attendance.find({
      event_id: eventId,
    });

    attendanceRecords.forEach((a) => {
      attendanceMap[a.ticket_id.toString()] = a;
    });

    // Build CSV
    let csv =
      "Ticket Code,Student Name,Student Email,Status,Marked By,Marked At\n";

    for (const ticket of tickets) {
      const attendance = attendanceMap[ticket._id.toString()];

      const status = attendance ? attendance.status : "absent";
      const markedBy = attendance ? attendance.marked_by : "";
      const markedAt = attendance ? attendance.marked_at : "";

      csv += `${ticket.ticket_code},${ticket.user_id?.fullName || ""},${ticket.user_id?.email || ""},${status},${markedBy},${markedAt}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${event.event_name}.csv`,
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("Export attendance error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const fetchStudentAttendance = async (req, res) => {
  try {
    const user = req.user;
    const { eventId, userId } = req.query;

    if (user.role === 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    let ticketQuery = { status: 'booked' };
    if (eventId) ticketQuery.event_id = eventId;
    if (userId) ticketQuery.user_id = userId;

    const tickets = await Ticket.find(ticketQuery)
      .populate('user_id', 'fullName email')
      .populate('event_id', 'event_name')
      .lean();

    const attendanceMap = {};
    const attendanceRecords = await Attendance.find({
      ticket_id: { $in: tickets.map(t => t._id) }
    })
      .populate("marked_by", "fullName email role")
      .lean();

    attendanceRecords.forEach(a => {
      attendanceMap[a.ticket_id.toString()] = a;
    });

    const rows = tickets.map(ticket => {
      const att = attendanceMap[ticket._id.toString()];
      return {
        id: ticket._id,
        ticketId: ticket.ticket_code,
        ticketCode: ticket.ticket_code,
        eventId: ticket.event_id?._id,
        eventName: ticket.event_id?.event_name,
        studentName: ticket.user_id?.fullName,
        email: ticket.user_id?.email,
        status: att?.status || 'not_marked',
        markedAt: att?.marked_at || null,
        markedBy: att?.marked_by?.fullName || att?.marked_by?.email || att?.marked_by || null,
      };
    });

    return res.status(200).json({ count: rows.length, rows });
  } catch (error) {
    console.error('Fetch student attendance error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
