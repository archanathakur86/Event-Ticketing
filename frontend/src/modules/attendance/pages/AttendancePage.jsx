import React, { useState, useEffect } from "react";
import {
  fetchStudentAttendance,
  markAttendance,
} from "@/api/attendance.api";
import { showToast } from "../../../components/ui/Toast";
import useAuthStore from "@/store/authStore";
import { getAllEvents } from "@/api/events.api";
import QRScanner from "../../../components/ui/QRScanner";
import * as ticketService from "@/api/tickets.api";

function formatTimestamp(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d)) return ts;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return ts;
  }
}

function downloadCSV(rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")];
  for (const r of rows) {
    csv.push(headers.map((h) => '"' + String(r[h] ?? "") + '"').join(","));
  }
  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "attendance.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const { user: authUser } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showScanNext, setShowScanNext] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [rows, evs] = await Promise.all([
          fetchStudentAttendance(),
          getAllEvents(),
        ]);
        if (!mounted) return;
        setAttendance(Array.isArray(rows) ? rows : []);
        setEvents(Array.isArray(evs) ? evs : []);
      } catch (e) {
        if (!mounted) return;
        setAttendance([]);
        setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEvent, search, statusFilter, itemsPerPage]);

  async function handleToggle(id) {
    if (updatingIds.has(id)) return;
    setUpdatingIds((prev) => new Set(prev).add(id));
    try {
      const existing = attendance.find((r) => String(r.id) === String(id));
      if (!existing) throw new Error("Record not found");
      const newStatus =
        String(existing.status || "").toLowerCase() === "present"
          ? "absent"
          : "present";
      setAttendance((a) =>
        a.map((r) =>
          r.id === id
            ? {
                ...r,
                status: newStatus,
                markedAt: new Date().toISOString(),
                markedBy: (authUser && (authUser.fullName || authUser.name || authUser.email)) || "System",
              }
            : r,
        ),
      );
      const updated = await markAttendance(existing.ticketCode || existing.ticketId, newStatus, id);
      if (updated) {
        setAttendance((a) =>
          a.map((r) =>
            String(r.id) === String(id)
              ? {
                  ...r,
                  status: updated?.attendance?.status || newStatus,
                  markedAt: updated?.attendance?.marked_at || new Date().toISOString(),
                  markedBy:
                    updated?.attendance?.marked_by?.fullName ||
                    updated?.attendance?.marked_by?.email ||
                    (authUser && (authUser.fullName || authUser.name || authUser.email)) ||
                    "System",
                }
              : r,
          ),
        );
        showToast({
          title: "Updated",
          message: `Marked ${existing.studentName || "attendee"} as ${newStatus}`,
          type: "success",
        });
      } else {
        setAttendance((a) =>
          a.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: existing.status,
                  markedAt: existing.markedAt,
                  markedBy: existing.markedBy,
                }
              : r,
          ),
        );
        showToast({
          title: "Error",
          message: "Failed to update attendance",
          type: "error",
        });
      }
    } catch (e) {
      const existing = attendance.find((r) => String(r.id) === String(id));
      if (existing)
        setAttendance((a) =>
          a.map((r) => (r.id === id ? { ...r, status: existing.status } : r)),
        );
      showToast({
        title: "Error",
        message: e?.message || "Failed to update attendance",
        type: "error",
      });
    } finally {
      setUpdatingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
    }
  }

  async function handleScan(value) {
    try {
      let ticket_code = value;

      // handle JSON QR
      try {
        const parsed = JSON.parse(value);
        ticket_code = parsed.ticket_code;
      } catch {}

      await markAttendance(ticket_code, "present");

      const rows = await fetchStudentAttendance(
        selectedEvent === "all" ? undefined : selectedEvent,
      );
      setAttendance(Array.isArray(rows) ? rows : []);

      showToast({
        title: "Success",
        message: `Attendance marked for ${ticket_code}`,
        type: "success",
      });
    } catch (err) {
      showToast({
        title: "Error",
        message: "Failed to mark attendance",
        type: "error",
      });
    } finally {
      setQrModalOpen(false);
      setShowScanNext(true);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  function selectAllVisible(visibleRows) {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      const allSelected = visibleRows.every((r) => copy.has(r.id));
      if (allSelected) {
        visibleRows.forEach((r) => copy.delete(r.id));
      } else {
        visibleRows.forEach((r) => copy.add(r.id));
      }
      return copy;
    });
  }

  function confirmBulk(action) {
    if (!selectedIds.size) return;
    setBulkAction(action);
    setBulkModalOpen(true);
  }

  async function performBulk() {
    if (bulkUpdating) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const prev = attendance;
    try {
      const nextStatus = String(bulkAction || "").toLowerCase();
      const selectedRows = attendance.filter((row) => selectedIds.has(row.id));
      for (const row of selectedRows) {
        await markAttendance(row.ticketCode || row.ticketId, nextStatus, row.id);
      }
      const rows = await fetchStudentAttendance(
        selectedEvent === "all" ? undefined : selectedEvent,
      );
      setAttendance(Array.isArray(rows) ? rows : []);
      showToast({
        title: "Updated",
        message: `Marked ${ids.length} attendee(s) as ${nextStatus}`,
        type: "success",
      });
      setSelectedIds(new Set());
    } catch (e) {
      setAttendance(prev);
      showToast({
        title: "Error",
        message: e?.message || "Bulk update failed",
        type: "error",
      });
    } finally {
      setBulkUpdating(false);
      setBulkModalOpen(false);
    }
  }

  const filteredByEvent =
    selectedEvent === "all"
      ? attendance
      : attendance.filter((a) => String(a.eventId) === String(selectedEvent));
  const q = String(search || "")
    .trim()
    .toLowerCase();
  const filtered = filteredByEvent.filter((r) => {
    if (statusFilter) {
      if (
        String(r.status || "").toLowerCase() !==
        String(statusFilter).toLowerCase()
      )
        return false;
    }
    if (q) {
      const name = String(r.studentName || "").toLowerCase();
      const email = String(r.email || "").toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  const totalRegistered = filtered.length;
  const presentCount = filtered.filter(
    (r) => String(r.status || "").toLowerCase() === "present",
  ).length;
  const absentCount = filtered.filter(
    (r) => String(r.status || "").toLowerCase() === "absent",
  ).length;
  const attendanceRate =
    totalRegistered > 0
      ? Math.round((presentCount / totalRegistered) * 100)
      : 0;

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  if (currentPage > totalPages) setCurrentPage(totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Attendance Management
          </h1>
          <p className="text-sm text-gray-500">
            Monitor and manage event participation
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <select
            value={selectedEvent}
            onChange={(e) => {
              setSelectedEvent(e.target.value);
              setSearch("");
              setStatusFilter("");
            }}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name || `Event ${ev.id}`}
              </option>
            ))}
          </select>

          <input
            type="search"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm w-full sm:w-64"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>

          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
          </select>
          <button
            onClick={() => {
              setQrModalOpen(true);
              setShowScanNext(false);
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
          >
            Scan QR
          </button>
          <button
            onClick={() => downloadCSV(attendance)}
            className="ml-2 px-3 py-2 bg-gray-100 text-gray-800 rounded-md text-sm"
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-medium text-gray-900">Attendance</h2>
            <div className="text-sm text-gray-500">
              {filtered.length} records
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Total Registered</div>
              <div className="text-lg font-semibold text-gray-900">
                {loading ? "—" : totalRegistered}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Present</div>
              <div className="text-lg font-semibold text-gray-900">
                {loading ? "—" : presentCount}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Absent</div>
              <div className="text-lg font-semibold text-gray-900">
                {loading ? "—" : absentCount}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Attendance Rate</div>
              <div className="text-lg font-semibold text-gray-900">
                {loading ? "—" : `${attendanceRate}%`}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  <input
                    type="checkbox"
                    onChange={() => selectAllVisible(paginated)}
                    checked={
                      paginated.length > 0 &&
                      paginated.every((r) => selectedIds.has(r.id))
                    }
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Student Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Event Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Ticket ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Marked By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Marked At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Mark Attendance
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      aria-label={`Select ${r.studentName}`}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                    {r.studentName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {r.email}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {r.eventName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {r.ticketId}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {r.markedBy || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {formatTimestamp(r.markedAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        String(r.status).toLowerCase() === "present"
                          ? "bg-green-50 text-green-700"
                          : String(r.status).toLowerCase() === "absent"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {String(r.status).toLowerCase() === "present"
                        ? "Present"
                        : String(r.status).toLowerCase() === "absent"
                          ? "Absent"
                          : "Not Marked"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleToggle(r.id)}
                      disabled={updatingIds.has(r.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm border ${
                        String(r.status).toLowerCase() === "present"
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-red-50 border-red-200 text-red-700"
                      } ${updatingIds.has(r.id) ? "opacity-70 pointer-events-none" : "hover:opacity-90"}`}
                    >
                      {updatingIds.has(r.id) ? (
                        <span className="text-xs">Saving...</span>
                      ) : (
                        <span className="text-xs">
                          {String(r.status).toLowerCase() === "present"
                            ? "Mark Absent"
                            : "Mark Present"}
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedIds.size > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-700">
                {selectedIds.size} selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => confirmBulk("Present")}
                  disabled={bulkUpdating}
                  className="px-3 py-2 bg-green-600 text-white rounded-md text-sm"
                >
                  Mark Present
                </button>
                <button
                  onClick={() => confirmBulk("Absent")}
                  disabled={bulkUpdating}
                  className="px-3 py-2 bg-red-600 text-white rounded-md text-sm"
                >
                  Mark Absent
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  disabled={bulkUpdating}
                  className="px-3 py-2 bg-white border rounded-md text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              Showing {filtered.length ? startIndex + 1 : 0} to{" "}
              {Math.min(startIndex + paginated.length, filtered.length)} of{" "}
              {filtered.length} records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`px-3 py-1 border rounded-md text-sm ${currentPage <= 1 ? "opacity-50 pointer-events-none bg-gray-50" : "bg-white hover:bg-gray-50"}`}
              >
                Prev
              </button>
              <div className="hidden sm:flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const maxButtons = 5;
                  let start = Math.max(
                    1,
                    currentPage - Math.floor(maxButtons / 2),
                  );
                  let end = start + maxButtons - 1;
                  if (end > totalPages) {
                    end = totalPages;
                    start = Math.max(1, end - maxButtons + 1);
                  }
                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1 border rounded-md text-sm ${i === currentPage ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"}`}
                      >
                        {i}
                      </button>,
                    );
                  }
                  return pages;
                })()}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 border rounded-md text-sm ${currentPage >= totalPages ? "opacity-50 pointer-events-none bg-gray-50" : "bg-white hover:bg-gray-50"}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* QR Modal */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Scan QR</h3>
              <p className="text-sm text-gray-500">
                Use your device camera to scan a ticket QR code.
              </p>
            </div>
            <div className="p-4">
              <QRScanner
                onDetected={handleScan}
                onClose={() => setQrModalOpen(false)}
              />
            </div>
            {showScanNext && (
              <button
                onClick={() => {
                  setQrModalOpen(true);
                  setShowScanNext(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md"
              >
                Scan Next
              </button>
            )}
          </div>
        </div>
      )}
      {bulkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setBulkModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Bulk Update
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to mark {selectedIds.size} selected
                attendee(s) as <span className="font-medium">{bulkAction}</span>
                ?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 rounded-md text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={performBulk}
                disabled={bulkUpdating}
                className={`px-4 py-2 rounded-md text-sm ${bulkAction === "Present" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white ${bulkUpdating ? "opacity-60 pointer-events-none" : ""}`}
              >
                {bulkUpdating
                  ? "Updating..."
                  : bulkAction === "Present"
                    ? "Mark Present"
                    : "Mark Absent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
