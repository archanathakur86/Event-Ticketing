import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // If event_id is null → global notification (visible to all)
    // If event_id is set → event-specific (visible to ticket holders only)
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },

    // Who sent the notification
    sent_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional direct recipient for user-targeted notifications
    recipient_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message_body: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Track who has read this notification
    read_by: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
