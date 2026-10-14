import React, { useState, useEffect } from "react";
import { sendNotification, getNotifications } from "@/api/notifications.api";
import * as eventService from "@/api/events.api";
import { showToast } from "@/components/ui/Toast";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    event: "",
    subject: "",
    message_body: "",
  });

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadEvents();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);

      const res = await getNotifications();
      setNotifications(res);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      showToast({
        title: "Error",
        message: "Failed to load notifications",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents() {
    try {
      const res = await eventService.getAllEvents();
      setEvents(res);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  }

  function resetForm() {
    setForm({
      event: "",
      subject: "",
      message_body: "",
    });
  }

  async function handleSend() {
    if (!form.subject.trim() || !form.message_body.trim()) {
      showToast({
        title: "Error",
        message: "Subject and message are required",
        type: "error",
      });
      return;
    }

    try {
      setSending(true);

      await sendNotification({
        eventId: form.event || null,
        subject: form.subject.trim(),
        message: form.message_body.trim(),
      });

      showToast({
        title: "Success",
        message: "Notification sent successfully",
        type: "success",
      });

      setIsModalOpen(false);
      resetForm();
      await loadNotifications();

      window.dispatchEvent(new CustomEvent("notifications:changed"));
    } catch (err) {
      console.error("Failed to send notification:", err);

      showToast({
        title: "Error",
        message: err?.message || "Failed to send notification",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Notifications
          </h1>
          <p className="text-sm text-gray-500">
            Send updates to registered attendees
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Compose Notification
        </button>
      </header>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            setIsModalOpen(false);
            resetForm();
          }}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">
                Compose Notification
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Create a message to send to attendees
              </p>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {/* Event Dropdown */}
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Event</label>

                <select
                  value={form.event}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, event: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Global</option>

                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title || event.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Subject</label>

                <input
                  value={form.subject}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, subject: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Notification subject"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Message Body</label>

                <textarea
                  rows={6}
                  value={form.message_body}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, message_body: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Write your message here"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-md text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">
          Notification History
        </h2>

        <div className="text-sm text-gray-500">
          {loading ? "Loading..." : `${notifications.length} entries`}
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No notifications sent yet.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Subject
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Sent By
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Event
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Sent Date
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Message Preview
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <tr key={n._id}>
                  <td className="px-4 py-3 font-medium">{n.subject}</td>

                  <td className="px-4 py-3 text-gray-600">
                    <div>{n.senderName || 'System'}</div>
                    <div className="text-xs text-gray-400">{n.senderRole || '—'}</div>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {n.eventName || n.event?.event_name || "Global"}
                  </td>

                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(n.createdAt || n.created_at).toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-gray-600 truncate">
                    {n.message_body}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
