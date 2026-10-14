import React, { useEffect, useMemo, useState } from "react";
import useAuthStore from "@/store/authStore";
import * as eventService from "@/api/events.api";
import * as ticketService from "@/api/tickets.api";
import * as attendanceService from "@/api/attendance.api";
import QRScanner from "@/components/ui/QRScanner";
import AppSelect from "@/components/ui/AppSelect";

const ALL_EVENTS_VALUE = "__all_events__";

function getAssignedEventsForUser(allEvents, user) {
  const events = Array.isArray(allEvents) ? allEvents.filter(Boolean) : [];
  const meIds = [user?.id, user?._id, user?.userId].filter(Boolean).map(String);
  const meEmail = String(user?.email || "").toLowerCase();

  return events.filter((ev) => {
    const coordinatorId =
      ev.coordinatorId || ev.coordinator?._id || ev.coordinator_id;
    const coordinatorEmail = String(
      ev.coordinator?.email || ev.coordinator_email || ev.coordinatorEmail || "",
    ).toLowerCase();
    if (meIds.length > 0 && meIds.includes(String(coordinatorId || ""))) return true;
    if (meEmail && coordinatorEmail === meEmail) return true;
    return false;
  });
}

function isRegisteredTicket(ticket) {
  if (!ticket) return false;
  const status = String(ticket.status || "").toLowerCase();
  const paymentStatus = String(ticket.paymentStatus || "").toLowerCase();
  const hasOwner = Boolean(ticket.userId || ticket.attendeeName || ticket.attendeeEmail);
  return hasOwner && (status === "booked" || paymentStatus === "paid");
}

function parseScanValue(input) {
  const value = String(input || "").trim();
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return parsed.ticket_code || parsed.ticketCode || "";
  } catch (err) {
    return value;
  }
}

function formatTime(value) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  } catch (err) {
    return value;
  }
}

function formatMarkedBy(attendance) {
  const marker = attendance?.marked_by || attendance?.markedBy;
  if (!marker) return "—";
  if (typeof marker === "string") return marker;
  return marker.fullName || marker.email || marker.role || "—";
}

function getAttendanceState(attendance) {
  const status = String(attendance?.status || "").toLowerCase();
  if (status === "present") return "present";
  if (status === "absent") return "absent";
  return "not_marked";
}

export default function CoordinatorAttendancePage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [tickets, setTickets] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [workingTicketId, setWorkingTicketId] = useState(null);
  const [confirmAbsentTicket, setConfirmAbsentTicket] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [manualQrValue, setManualQrValue] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const allEvents = await eventService.getAllEvents();
        const assigned = getAssignedEventsForUser(allEvents, user);
        if (!mounted) return;
        setEvents(assigned);
        setSelectedEventId(assigned.length > 0 ? ALL_EVENTS_VALUE : "");
      } catch (err) {
        if (mounted) {
          setEvents([]);
          setSelectedEventId("");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function loadEventAttendance(eventId) {
    if (!eventId) {
      setTickets([]);
      setAttendanceMap({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (eventId === ALL_EVENTS_VALUE) {
        const responses = await Promise.all(
          events.map((event) =>
            Promise.all([
              ticketService.getCoordinatorEventTickets(event.id),
              attendanceService.getAttendanceByEvent(event.id),
            ]),
          ),
        );

        const ticketMap = {};
        const nextAttendanceMap = {};

        responses.forEach(([ticketRes, attendanceRes]) => {
          const items = Array.isArray(ticketRes?.tickets)
            ? ticketRes.tickets.filter(isRegisteredTicket)
            : [];
          items.forEach((ticket) => {
            if (ticket?.id) ticketMap[String(ticket.id)] = ticket;
          });
          (attendanceRes?.attendance || []).forEach((row) => {
            const ticketId = row?.ticket_id?._id || row?.ticket_id || row?.ticketId;
            if (ticketId) nextAttendanceMap[String(ticketId)] = row;
          });
        });

        setTickets(Object.values(ticketMap));
        setAttendanceMap(nextAttendanceMap);
        return;
      }

      const [ticketRes, attendanceRes] = await Promise.all([
        ticketService.getCoordinatorEventTickets(eventId),
        attendanceService.getAttendanceByEvent(eventId),
      ]);
      const items = Array.isArray(ticketRes?.tickets)
        ? ticketRes.tickets.filter(isRegisteredTicket)
        : [];
      const map = {};
      (attendanceRes?.attendance || []).forEach((row) => {
        const ticketId = row?.ticket_id?._id || row?.ticket_id || row?.ticketId;
        if (ticketId) map[String(ticketId)] = row;
      });
      setTickets(items);
      setAttendanceMap(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEventAttendance(selectedEventId);
  }, [selectedEventId, events]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const attendance = attendanceMap[String(ticket.id)];
      const haystack = [
        ticket.attendeeName,
        ticket.attendeeEmail,
        ticket.ticketCode,
        attendance?.status || "not_marked",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [tickets, attendanceMap, search]);

  async function updateAttendanceStatus(ticket, nextStatus) {
    if (workingTicketId) return;

    setWorkingTicketId(ticket.id);
    setMessage("");
    setMessageType("info");
    try {
      await attendanceService.markAttendance(
        ticket.ticketCode || ticket.ticket_code || "",
        nextStatus,
        ticket.id,
      );
      setMessageType("success");
      setMessage(
        `${ticket.attendeeName || ticket.ticketCode} marked ${nextStatus}.`,
      );
      await loadEventAttendance(selectedEventId);
      window.dispatchEvent(new CustomEvent("attendance:changed"));
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "Failed to mark attendance.");
    } finally {
      setWorkingTicketId(null);
    }
  }

  async function handleToggleAttendance(ticket) {
    const attendance = attendanceMap[String(ticket.id)];
    const currentState = getAttendanceState(attendance);
    const isPresent = currentState === "present";

    if (isPresent) {
      setConfirmAbsentTicket(ticket);
      return;
    }

    await updateAttendanceStatus(ticket, "present");
  }

  async function confirmMarkAbsent() {
    if (!confirmAbsentTicket) return;
    const ticket = confirmAbsentTicket;
    setConfirmAbsentTicket(null);
    await updateAttendanceStatus(ticket, "absent");
  }

  async function handleDetectedQr(rawValue) {
    const ticketCode = parseScanValue(rawValue);
    if (!ticketCode) return;

    const match = tickets.find(
      (ticket) =>
        String(ticket.ticketCode || "").toLowerCase() === ticketCode.toLowerCase(),
    );
    if (!match) {
      setMessage("Ticket not found for the selected event.");
      return;
    }
    await handleToggleAttendance(match);
  }

  async function handleManualQrSubmit() {
    if (!manualQrValue.trim()) return;
    await handleDetectedQr(manualQrValue);
    setManualQrValue("");
    setQrModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b2a60]">
            Coordinator Attendance
          </h1>
          <p className="text-sm text-gray-500">
            Scan QR, search students, and mark attendance for assigned events.
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Select Event
          </div>
          <AppSelect
            value={selectedEventId}
            onChange={setSelectedEventId}
            className="mt-3 w-full"
            placeholder="-- Select Event --"
            options={[
              ...(events.length > 0
                ? [{ value: ALL_EVENTS_VALUE, label: "All Events" }]
                : []),
              ...events.map((event) => ({
                value: event.id,
                label: event.name || event.title || `Event ${event.id}`,
              })),
            ]}
          />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Search Student
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name/email/ticket id"
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
          />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Actions
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setQrModalOpen(true)}
              disabled={!selectedEventId}
              className="rounded-lg bg-[#123386] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Scan QR
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Selected Event Participants</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {rows.length}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-gray-900">Attendance Table</div>
            <div className="text-xs text-gray-500">
              Search student records and mark attendance manually.
            </div>
          </div>
          {message ? (
            <div
              className={`text-xs ${
                messageType === "error"
                  ? "text-red-600"
                  : messageType === "success"
                    ? "text-green-700"
                    : "text-[#0b2a60]"
              }`}
            >
              {message}
            </div>
          ) : null}
        </div>

        {!selectedEventId ? (
          <div className="p-6 text-sm text-gray-500">Select an event to manage attendance.</div>
        ) : loading ? (
          <div className="p-6 text-sm text-gray-500">Loading attendance data...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No registered students found.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ticket ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Marked By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Marked At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((ticket) => {
                  const attendance = attendanceMap[String(ticket.id)];
                  const currentState = getAttendanceState(attendance);
                  const isPresent = currentState === "present";
                  const isAbsent = currentState === "absent";
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{ticket.attendeeName || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{ticket.ticketCode || ticket.id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isPresent
                              ? "bg-green-50 text-green-700"
                              : isAbsent
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isPresent ? "Present" : isAbsent ? "Absent" : "Not Marked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatMarkedBy(attendance)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatTime(attendance?.marked_at || attendance?.markedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleAttendance(ticket)}
                          disabled={String(workingTicketId || "") === String(ticket.id)}
                          className="rounded-md bg-[#123386] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        >
                          {isPresent ? "Mark Absent" : "Mark Present"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </section>

      {confirmAbsentTicket ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setConfirmAbsentTicket(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Mark Absent?</h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmAbsentTicket.attendeeName || confirmAbsentTicket.ticketCode} is already marked present.
              If you continue, this attendance will be changed to absent.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmAbsentTicket(null)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkAbsent}
                className="rounded-md bg-[#123386] px-4 py-2 text-sm font-medium text-white"
              >
                Mark Absent
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {qrModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Scan QR</h3>
              <p className="text-sm text-gray-500">
                Scan the attendee ticket QR to mark attendance for the selected event.
              </p>
            </div>
            <div className="p-4">
              <QRScanner
                onDetected={async (value) => {
                  try {
                    await handleDetectedQr(value)
                    setQrModalOpen(false)
                  } catch (err) {
                    setMessage(err?.message || "Failed to process QR code.")
                  }
                }}
                onClose={() => setQrModalOpen(false)}
              />
              <div className="px-4 pb-4">
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-medium text-gray-900">Paste Ticket Code</div>
                  <div className="mt-1 text-xs text-gray-500">
                    If camera scanning is unavailable, paste the ticket code or QR payload here.
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={manualQrValue}
                      onChange={(e) => setManualQrValue(e.target.value)}
                      placeholder="Paste ticket code or QR payload"
                      className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handleManualQrSubmit}
                      disabled={!manualQrValue.trim()}
                      className="rounded-md bg-[#123386] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  If your browser does not support camera QR scanning, use the paste field above.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
