import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // Reference to ticket (optional - created after payment success when flag is true)
    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: false,
      default: null,
    },

    // Product info containing ticket details for PayU and ticket creation
    productinfo: {
      description: {
        type: String,
        default: null,
      },
      ticket_type: {
        type: String,
        enum: ["regular", "vip", "early_bird"],
        default: "regular",
      },
      event_name: {
        type: String,
        default: null,
      },
      price: {
        type: Number,
        default: 0,
      },
    },

    // Reference to user
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Reference to event
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // PayU transaction ID
    txnid: {
      type: String,
      required: true,
      unique: true,
    },

    // Payment amount
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // User details (stored for payment record)
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      default: null,
    },

    // Payment status
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },

    // PayU response fields
    mihpayid: {
      type: String,
      default: null,
    },

    mode: {
      type: String,
      default: null,
    },

    bank_ref_num: {
      type: String,
      default: null,
    },

    bankcode: {
      type: String,
      default: null,
    },

    // Full PayU response for debugging
    payu_response: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Payment date (set on success)
    payment_date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
