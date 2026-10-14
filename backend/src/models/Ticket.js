import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    ticket_type: {
      type: String,
      enum: ["regular", "vip", "early_bird"],
      default: "regular",
    },

    ticket_code: {
      type: String,
      required: true,
      unique: true,
    },

    qr_code: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "booked", "cancelled"],
      default: "pending",
    },

    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    price: {
      type: Number,
      min: 0,
      default: 0,
    },

    is_assigned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Compound index to prevent duplicate bookings (only for assigned tickets)
ticketSchema.index(
  { user_id: 1, event_id: 1 },
  { unique: true, partialFilterExpression: { user_id: { $ne: null } } }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
