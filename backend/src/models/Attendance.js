import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  ticket_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket",
    required: true,
    unique: true, // one attendance record per ticket
  },

  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket",
    default: null,
  },

  // Legacy fields retained for compatibility with older DB indexes/data.
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    default: null,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
    index: true, // for faster event-wise queries
  },

  status: {
    type: String,
    enum: ["present", "absent"],
    required: true,
  },

  marked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  marked_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Attendance", attendanceSchema);
