import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // ticket_id: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Ticket",
    //   required: true,
    // },

    order_id : {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    payment_gateway: {
      type: String,
      enum: ["PayU", "Razorpay", "Stripe", "Manual"],
      default: "PayU",
    },

    transaction_id: {
      type: String,
      unique: true,
      sparse: true,
    },

    payu_txnid: {
      type: String,
      unique: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    payment_status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },

    payment_response: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    payment_date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
