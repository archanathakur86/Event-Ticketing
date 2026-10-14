import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    event_name: {
      type: String,
      required: true,
      trim: true,
    },

    event_description: {
      type: String,
      trim: true,
      default: "",
    },

    event_date: {
      type: Date,
      required: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    booked_count: {
      type: Number,
      min: 0,
      default: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      trim: true,
      enum: ["Draft", "Published", "Upcoming", "Cancelled"],
      default: "Draft",
    },

    isActive: {
      type: Boolean,
      default: true,
    },


    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coordinator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
