import mongoose from "mongoose";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendEmail } from "../../scripts/emailService.js";

export const sendNotification = async (req, res) => {
  try {
    const { eventId, subject, message } = req.body;
    const user = req.user;

    if (!subject || !message) {
      return res.status(400).json({
        message: "Subject and message are required",
      });
    }

    // 1️⃣ Save notification in DB
    const notification = await Notification.create({
      event_id: eventId || null,
      sent_by: user._id,
      subject: subject.trim(),
      message_body: message.trim(),
    });

    let emails = [];
    let recipientUsers = [];

    // 2️⃣ GLOBAL notification → send to all active students
    if (!eventId) {
      const users = await User.find({
        role: "student",
        status: "active",
      }).select("_id email");

      emails = users.map((u) => u.email);
      recipientUsers = users.map((u) => String(u._id));
    }

    // 3️⃣ EVENT notification → send only to ticket holders
    if (eventId) {
      const tickets = await Ticket.find({
        event_id: eventId,
        status: "booked",
      }).populate("user_id", "_id email status");

      const validRecipients = tickets
        .map((ticket) => ticket.user_id)
        .filter((recipient) => recipient && recipient.status === "active");

      emails = validRecipients.map((recipient) => recipient.email);
      recipientUsers = validRecipients.map((recipient) => String(recipient._id));
    }

    // 4️⃣ Remove duplicate emails
    emails = [...new Set(emails)];
    recipientUsers = [...new Set(recipientUsers)];

    if (eventId && recipientUsers.length > 0) {
      await Notification.insertMany(
        recipientUsers.map((recipientId) => ({
          event_id: eventId,
          sent_by: user._id,
          recipient_user: recipientId,
          subject: subject.trim(),
          message_body: message.trim(),
        })),
      );
    }

    // // 5️⃣ Send emails
    // await Promise.all(
    //   emails.map((email) =>
    //     sendEmail(
    //       email,
    //       subject,
    //       `<h2>${subject}</h2>
    //       <p>${message}</p>`,
    //     ),
    //   ),
    // );

    return res.status(201).json({
      message: eventId
        ? "Event notification sent successfully"
        : "Global notification sent successfully",
      notification,
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return res.status(500).json({
      message: "Error sending notification",
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const user = req.user;
    let filter = {};

    // Normalize role for consistent comparison
    const userRole = String(user.role || "")
      .toLowerCase()
      .replace(/\s+/g, "");

    // 🔴 Super Admin → see everything
    if (userRole === "superadmin") {
    const notifications = await Notification.find({ recipient_user: null })
        .populate("sent_by", "fullName email role")
        .populate("event_id", "event_name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        count: notifications.length,
        notifications,
      });
    }

    // 🟡 Coordinator
    if (userRole === "coordinator") {
      const assignedEvents = await Event.find({
        coordinator_id: user._id,
      }).select("_id");

      const eventIds = assignedEvents.map((e) => e._id);

      filter = {
        $or: [
          { event_id: null }, // global
          { recipient_user: user._id }, // directly targeted
          { event_id: { $in: eventIds }, recipient_user: null },
        ],
      };
    }

    // 🔵 Student
    if (userRole === "student") {
      const tickets = await Ticket.find({
        user_id: user._id,
        status: "booked",
      }).select("event_id");

      const eventIds = tickets.map((t) => t.event_id);

      filter = {
        $or: [
          { event_id: null }, // global
          { recipient_user: user._id }, // directly targeted
        ],
      };
    }

    if (userRole !== "coordinator" && userRole !== "student" && userRole !== "superadmin") {
      filter = {
        $or: [
          { event_id: null },
          { recipient_user: user._id },
        ],
      };
    }

    const notifications = await Notification.find(filter)
      .populate("sent_by", "fullName email role")
      .populate("event_id", "event_name")
      .sort({
        createdAt: -1,
      });

    const visibleNotifications = notifications;

    // Add isRead flag for each notification
    const notificationsWithReadStatus = visibleNotifications.map((n) => ({
      ...n.toObject(),
      isRead: n.read_by.includes(user._id),
    }));

    return res.status(200).json({
      count: visibleNotifications.length,
      unreadCount: visibleNotifications.filter((n) => !n.read_by.includes(user._id))
        .length,
      notifications: notificationsWithReadStatus,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      message: "Error fetching notifications",
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Add user to read_by array if not already present
    if (!notification.read_by.includes(user._id)) {
      notification.read_by.push(user._id);
      await notification.save();
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      message: "Error marking notification as read",
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const user = req.user;
    const userRole = String(user.role || "")
      .toLowerCase()
      .replace(/\s+/g, "");

    let filter = {};

    // Apply same filter logic as getNotifications
    if (userRole === "coordinator") {
      const assignedEvents = await Event.find({
        coordinator_id: user._id,
      }).select("_id");
      const eventIds = assignedEvents.map((e) => e._id);
      filter = {
        $or: [
          { event_id: null },
          { recipient_user: user._id },
          { event_id: { $in: eventIds }, recipient_user: null },
        ],
      };
    } else if (userRole === "student") {
      const tickets = await Ticket.find({
        user_id: user._id,
        status: "booked",
      }).select("event_id");
      const eventIds = tickets.map((t) => t.event_id);
      filter = {
        $or: [
          { event_id: null },
          { recipient_user: user._id },
        ],
      };
    } else if (userRole !== "superadmin") {
      filter = {
        $or: [{ event_id: null }, { recipient_user: user._id }],
      };
    }

    // Mark all relevant notifications as read
    await Notification.updateMany(
      { ...filter, read_by: { $ne: user._id } },
      { $addToSet: { read_by: user._id } },
    );

    return res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      message: "Error marking notifications as read",
    });
  }
};
