import mongoose from "mongoose";

const ticketTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image_data_url: {
      type: String,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
      trim: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const TicketTemplate = mongoose.model("TicketTemplate", ticketTemplateSchema);

export default TicketTemplate;
