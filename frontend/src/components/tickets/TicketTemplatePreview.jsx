import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { getTicketTemplate } from "@/api/ticketTemplate.api";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    return value;
  }
}

function paymentLabel(ticket) {
  const ticketStatus = String(ticket?.ticketStatus || ticket?.status || "").toLowerCase();
  if (ticketStatus === "cancelled") return "Cancelled";
  const value = String(ticket?.paymentStatus || ticket?.payment_status || "").toLowerCase();
  if (value === "paid") return "Paid";
  if (Number(ticket?.price || 0) <= 0) return "Free";
  return "Unpaid";
}

export default function TicketTemplatePreview({
  ticket,
  fallbackEventName,
  showTemplateName = true,
  minHeight = 540,
  showQr = true,
}) {
  const [template, setTemplate] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const activeTemplate = await getTicketTemplate();
        if (mounted) setTemplate(activeTemplate);
      } catch (err) {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const qrPayload =
        ticket?.qrCode ||
        ticket?.qr_code ||
        (ticket?.ticketCode
          ? JSON.stringify({
              ticket_code: ticket.ticketCode,
              event_id: ticket.eventId || ticket?.event_id?._id,
              user_id: ticket.userId || ticket?.user_id?._id,
            })
          : "");
      if (!qrPayload) {
        setQrCodeUrl("");
        return;
      }
      try {
        const url = await QRCode.toDataURL(qrPayload);
        if (mounted) setQrCodeUrl(url);
      } catch (err) {
        if (mounted) setQrCodeUrl("");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [ticket]);

  const viewModel = useMemo(() => {
    const eventName =
      ticket?.eventName ||
      ticket?.event_id?.event_name ||
      fallbackEventName ||
      "—";
    const attendeeName =
      ticket?.attendeeName || ticket?.user_id?.fullName || "—";
    const attendeeEmail =
      ticket?.attendeeEmail || ticket?.user_id?.email || "—";
    const eventDate = ticket?.eventDate || ticket?.event_id?.event_date;
    const bookingDate = ticket?.created_at || ticket?.createdAt;
    const price = Number(ticket?.price || 0);
    return {
      eventName,
      attendeeName,
      attendeeEmail,
      eventDate,
      bookingDate,
      payment: paymentLabel(ticket),
      price: Number.isFinite(price) ? price : 0,
      ticketCode: ticket?.ticketCode || ticket?.ticket_code || ticket?.id || ticket?._id || "—",
      status: ticket?.status || "—",
    };
  }, [ticket, fallbackEventName]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="px-6 py-4 bg-gradient-to-r from-[#123386] to-[#0b2a60] text-white">
        <div className="text-xs uppercase tracking-wide opacity-90">ConfNow Entry Pass</div>
        <div className="text-xl font-semibold mt-1">
          {showTemplateName ? template?.name || "Active Ticket Template Preview" : "Ticket Preview"}
        </div>
      </div>

      <div className="p-6">
        <div
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-slate-100 shadow-inner"
          style={
            template?.image_data_url
              ? {
                  minHeight,
                  backgroundImage: `url(${template.image_data_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : { minHeight }
          }
        >
          <div className="absolute inset-0 bg-white/55" />

          <div className="relative z-10 grid min-h-full grid-cols-1 gap-6 p-8 md:grid-cols-[1.2fr_0.8fr]">
            <div className="self-start rounded-2xl bg-white/85 p-6 backdrop-blur-sm">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Ticket ID</span>
                  <span className="font-mono text-sm text-gray-900">{viewModel.ticketCode}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Event</span>
                  <span className="font-medium text-gray-900">{viewModel.eventName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Event Date</span>
                  <span className="font-medium text-gray-900">{formatDate(viewModel.eventDate)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Booking Date</span>
                  <span className="font-medium text-gray-900">{formatDate(viewModel.bookingDate)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Student</span>
                  <span className="font-medium text-gray-900">{viewModel.attendeeName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900">{viewModel.attendeeEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span className="font-medium text-gray-900">{viewModel.payment}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/80 p-6 backdrop-blur-sm">
              {showQr && qrCodeUrl ? (
                <>
                  <img src={qrCodeUrl} alt="Ticket QR" className="w-48 h-48 object-contain rounded-lg bg-white p-3 shadow-sm" />
                  <div className="mt-4 text-xs text-gray-600 text-center">Scan for ticket verification</div>
                </>
              ) : (
                <div className="text-sm text-gray-500">{showQr ? "QR Code not available" : "QR hidden for cancelled tickets"}</div>
              )}
              <div className="mt-4 flex gap-2">
                {String(viewModel.status).toLowerCase() === "cancelled" ? (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                    Cancelled
                  </span>
                ) : (
                  <>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      {viewModel.status}
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {viewModel.payment}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
