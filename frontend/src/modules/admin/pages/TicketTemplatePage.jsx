import React, { useEffect, useState } from "react";
import * as templateApi from "@/api/ticketTemplate.api";

export default function TicketTemplatePage() {
  const [template, setTemplate] = useState(null);
  const [name, setName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const existing = await templateApi.getTicketTemplate();
        if (!mounted || !existing) return;
        setTemplate(existing);
        setName(existing.name || "");
        setImageDataUrl(existing.image_data_url || "");
        setMimeType(existing.mime_type || "");
      } catch (err) {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      setMessage("Only PNG and JPG template files are supported.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setName(file.name);
      setMimeType(file.type);
      setImageDataUrl(String(reader.result || ""));
      setMessage("");
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!name || !imageDataUrl || !mimeType) {
      setMessage("Upload a PNG/JPG template before saving.");
      return;
    }

    try {
      setSaving(true);
      const saved = await templateApi.saveTicketTemplate({
        name,
        image_data_url: imageDataUrl,
        mime_type: mimeType,
      });
      setTemplate(saved);
      setMessage("Ticket template saved. New downloads will use this format.");
    } catch (err) {
      setMessage(err?.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Ticket Template</h1>
        <p className="text-sm text-gray-500">
          Upload the ID card or ticket background that should be used for every downloaded ticket.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-900">Upload Template</div>
          <div className="mt-4 space-y-4">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#123386] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
            {message ? <div className="text-sm text-[#123386]">{message}</div> : null}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Preview</div>
              <div className="text-xs text-gray-500">
                This background will be used for student and coordinator ticket downloads.
              </div>
            </div>
            {template?.updated_at ? (
              <div className="text-xs text-gray-400">
                Updated {new Date(template.updated_at).toLocaleString()}
              </div>
            ) : null}
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt="Ticket template preview"
                className="mx-auto max-h-[520px] rounded-lg object-contain shadow-sm"
              />
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500">
                No template uploaded yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
