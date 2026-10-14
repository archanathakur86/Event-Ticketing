import TicketTemplate from "../models/TicketTemplate.js";

export const getTicketTemplate = async (req, res) => {
  try {
    const template = await TicketTemplate.findOne()
      .sort({ updated_at: -1 })
      .populate("updated_by", "fullName email role");

    if (!template) {
      return res.status(200).json({ template: null });
    }

    return res.status(200).json({ template });
  } catch (error) {
    console.error("Get Ticket Template Error:", error);
    return res.status(500).json({ message: "Failed to fetch ticket template" });
  }
};

export const upsertTicketTemplate = async (req, res) => {
  try {
    const { name, image_data_url, mime_type } = req.body;
    if (!name || !image_data_url || !mime_type) {
      return res.status(400).json({
        message: "Template name, image, and mime type are required",
      });
    }

    if (!/^data:image\/(png|jpeg|jpg);base64,/i.test(String(image_data_url))) {
      return res.status(400).json({
        message: "Only PNG and JPG template images are supported",
      });
    }

    const existing = await TicketTemplate.findOne().sort({ updated_at: -1 });
    let template;

    if (existing) {
      existing.name = name.trim();
      existing.image_data_url = image_data_url;
      existing.mime_type = mime_type.trim();
      existing.updated_by = req.user._id;
      template = await existing.save();
    } else {
      template = await TicketTemplate.create({
        name: name.trim(),
        image_data_url,
        mime_type: mime_type.trim(),
        updated_by: req.user._id,
      });
    }

    return res.status(200).json({
      message: "Ticket template saved successfully",
      template,
    });
  } catch (error) {
    console.error("Upsert Ticket Template Error:", error);
    return res.status(500).json({ message: "Failed to save ticket template" });
  }
};
