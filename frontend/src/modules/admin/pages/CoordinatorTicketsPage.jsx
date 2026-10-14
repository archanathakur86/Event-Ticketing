import React, { useEffect, useMemo, useState } from "react";
import useAuthStore from "@/store/authStore";
import * as eventService from "@/api/events.api";
import * as ticketService from "@/api/tickets.api";
import TicketTemplatePreview from "@/components/tickets/TicketTemplatePreview";
import AppSelect from "@/components/ui/AppSelect";

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

function paymentLabel(ticket) {
  const value = String(ticket.paymentStatus || "").toLowerCase();
  if (value === "paid") return "Paid";
  if (Number(ticket.price || 0) <= 0) return "Free";
  if (value) return value.charAt(0).toUpperCase() + value.slice(1);
  return "Pending";
}

function ticketValidity(ticket) {
  return isRegisteredTicket(ticket) ? "Valid" : "Invalid";
}

export default function CoordinatorTicketsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingEvents(true);
        const allEvents = await eventService.getAllEvents();
        const assigned = getAssignedEventsForUser(allEvents, user);
        if (!mounted) return;
        setEvents(assigned);
        setSelectedEventId(assigned[0]?.id ? String(assigned[0].id) : "");
      } catch (err) {
        if (mounted) {
          setEvents([]);
          setSelectedEventId("");
        }
      } finally {
        if (mounted) setLoadingEvents(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedEventId) {
        setTickets([]);
        return;
      }
      try {
        setLoadingTickets(true);
        setMessage("");
        const res = await ticketService.getCoordinatorEventTickets(selectedEventId);
        if (!mounted) return;
        const items = Array.isArray(res?.tickets) ? res.tickets.filter(isRegisteredTicket) : [];
        setTickets(items);
      } catch (err) {
        if (mounted) setTickets([]);
      } finally {
        if (mounted) setLoadingTickets(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedEventId]);

  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const haystack = [
        ticket.ticketCode,
        ticket.attendeeName,
        ticket.attendeeEmail,
        paymentLabel(ticket),
        ticketValidity(ticket),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [tickets, search]);

  const stats = useMemo(() => {
    const registered = tickets.length;
    const paid = tickets.filter((ticket) => paymentLabel(ticket) === "Paid").length;
    const free = tickets.filter((ticket) => paymentLabel(ticket) === "Free").length;
    return { registered, paid, free };
  }, [tickets]);

  const selectedEvent = useMemo(
    () => events.find((event) => String(event.id) === String(selectedEventId)) || null,
    [events, selectedEventId],
  );

  async function handleViewTicket(ticket) {
    try {
      const freshTicket = await ticketService.getTicketById(ticket.id);
      setSelectedTicket(freshTicket || ticket);
    } catch (err) {
      setSelectedTicket(ticket);
    }
  }

  async function handleDownloadTicket(ticket) {
    try {
      const blob = await ticketService.downloadTicketPdf(ticket.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ticket.ticketCode || ticket.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(err?.message || "Failed to download ticket.");
    }
  }

  async function handleBulkDownload() {
    if (!selectedEventId) return;
    try {
      await ticketService.bulkDownloadTickets(selectedEventId);
      setMessage("Ticket list download started.");
    } catch (err) {
      setMessage(err?.message || "Failed to download ticket list.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b2a60]">
            Coordinator Tickets
          </h1>
          <p className="text-sm text-gray-500">
            View registered participants, verify ticket validity, and download ticket lists.
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Select Event
          </div>
          <AppSelect
            value={selectedEventId}
            onChange={setSelectedEventId}
            className="mt-3 w-full"
            placeholder="-- Select Event --"
            disabled={loadingEvents || events.length === 0}
            options={events.map((event) => ({
              value: event.id,
              label: event.name || event.title || `Event ${event.id}`,
            }))}
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
              onClick={handleBulkDownload}
              disabled={!selectedEventId}
              className="rounded-lg bg-[#0b2a60] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Download Bulk Tickets
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Registered Students</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{stats.registered}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Paid Tickets</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{stats.paid}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Free Tickets</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{stats.free}</div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-gray-900">Tickets Table</div>
            <div className="text-xs text-gray-500">
              {selectedEventId ? "Participant list for the selected event" : "Select an event to view tickets"}
            </div>
          </div>
          {message ? <div className="text-xs text-[#0b2a60]">{message}</div> : null}
        </div>

        {!selectedEventId ? (
          <div className="p-6 text-sm text-gray-500">Select an event to view ticket registrations.</div>
        ) : loadingTickets ? (
          <div className="p-6 text-sm text-gray-500">Loading tickets...</div>
        ) : visibleTickets.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No registered students found.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ticket Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ticket Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {visibleTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{ticket.ticketCode || ticket.id}</td>
                    <td className="px-4 py-3 text-gray-800">{ticket.attendeeName || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.attendeeEmail || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{paymentLabel(ticket)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ticketValidity(ticket) === "Valid" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {ticketValidity(ticket)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewTicket(ticket)}
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700"
                        >
                          View Ticket
                        </button>
                        <button
                          onClick={() => handleDownloadTicket(ticket)}
                          className="rounded-md bg-[#123386] px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Download Ticket
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedTicket ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-5xl rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ticket Details</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Review participant and payment details before downloading.
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              <TicketTemplatePreview
                ticket={{
                  ...selectedTicket,
                  paymentStatus: selectedTicket.paymentStatus || selectedTicket.payment_status,
                }}
                fallbackEventName={selectedEvent?.name || selectedEvent?.title}
                showTemplateName={false}
                minHeight={500}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadTicket(selectedTicket)}
                className="rounded-md bg-[#123386] px-4 py-2 text-sm font-medium text-white"
              >
                Download Ticket
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
