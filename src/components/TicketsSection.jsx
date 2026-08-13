import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import TicketsService from '../services/Tickets.js';

export const TICKET_TYPE_LABELS = {
  ERROR_SISTEMA: 'Error del sistema',
  DUDA_USO: 'Duda de uso',
  SUGERENCIA: 'Sugerencia de mejora',
  PROBLEMA_LEADS: 'Problema con mis leads',
  PROBLEMA_ACCESO: 'Problema de acceso',
};

export const TICKET_STATUS_META = {
  ABIERTO: { label: 'Abierto', className: 'bg-amber-500/20 text-amber-400' },
  EN_REVISION: { label: 'En revisión', className: 'bg-blue-500/20 text-blue-400' },
  RESUELTO: { label: 'Resuelto', className: 'bg-emerald-500/20 text-emerald-400' },
};

const EMPTY_FORM = { type: '', title: '', description: '', evidenceUrl: '' };

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TicketsSection = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showResolved, setShowResolved] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await TicketsService.getMine();
      if (res?.success && Array.isArray(res.data)) {
        setTickets(res.data);
      } else {
        setTickets([]);
      }
    } catch (e) {
      console.error('Error loading tickets:', e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!form.type) {
      setFeedback({ type: 'error', text: 'Selecciona el tipo de ticket.' });
      return;
    }
    if (!form.title.trim()) {
      setFeedback({ type: 'error', text: 'Escribe un título para el ticket.' });
      return;
    }

    if (imageFile && imageFile.size > 8 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'La imagen supera el máximo de 8MB.' });
      return;
    }

    setSending(true);
    try {
      let payload;
      if (imageFile) {
        payload = new FormData();
        payload.append('type', form.type);
        payload.append('title', form.title.trim());
        payload.append('description', form.description.trim());
        payload.append('evidenceUrl', form.evidenceUrl.trim());
        payload.append('image', imageFile);
      } else {
        payload = {
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim(),
          evidenceUrl: form.evidenceUrl.trim(),
        };
      }
      const res = await TicketsService.create(payload);
      if (res?.success) {
        setForm(EMPTY_FORM);
        setImageFile(null);
        setFeedback({ type: 'success', text: 'Ticket enviado. Te avisaremos cuando sea resuelto.' });
        await loadTickets();
      } else {
        setFeedback({ type: 'error', text: res?.message || 'No se pudo enviar el ticket.' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err?.response?.data?.message || 'No se pudo enviar el ticket.',
      });
    } finally {
      setSending(false);
    }
  };

  const visibleTickets = showResolved
    ? tickets
    : tickets.filter((t) => t.status !== 'RESUELTO');
  const resolvedCount = tickets.filter((t) => t.status === 'RESUELTO').length;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Soporte — Reportar un problema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-(--muted-fg)">Tipo de ticket *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-md border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--input-fg)"
              >
                <option value="">Selecciona un tipo…</option>
                {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-(--muted-fg)">Título *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Resumen corto del problema"
                maxLength={120}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-(--muted-fg)">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Cuéntanos qué pasó: qué estabas haciendo, qué esperabas que ocurriera y qué ocurrió."
                rows={4}
                className="w-full rounded-md border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--input-fg) placeholder:text-(--muted-fg)"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-(--muted-fg)">
                Captura de pantalla (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full cursor-pointer rounded-md border border-(--input-border) bg-(--input-bg) px-3 py-2 text-sm text-(--muted-fg) file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-(--hover-bg) file:px-3 file:py-1 file:text-xs file:text-(--muted-fg-2)"
              />
              {imageFile && (
                <p className="mt-1 flex items-center gap-2 text-xs text-(--muted-fg)">
                  📎 {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="text-red-400 underline hover:text-red-300"
                  >
                    quitar
                  </button>
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-(--muted-fg)">
                Link de video (opcional)
              </label>
              <Input
                value={form.evidenceUrl}
                onChange={(e) => setForm((f) => ({ ...f, evidenceUrl: e.target.value }))}
                placeholder="https://… (Loom, Drive, etc.)"
              />
            </div>

            {feedback && (
              <p
                className={`text-sm ${
                  feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {feedback.text}
              </p>
            )}

            <Button type="submit" disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar ticket'}
            </Button>
            <p className="text-xs text-(--muted-fg)">
              La fecha, hora, tu usuario y unidad de negocio se registran automáticamente.
            </p>
          </form>

          {/* Active tickets list */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-(--muted-fg-2)">
                {showResolved ? 'Todos mis tickets' : 'Mis tickets activos'}
              </p>
              {resolvedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowResolved((v) => !v)}
                  className="text-xs text-(--muted-fg) underline hover:text-(--app-fg)"
                >
                  {showResolved ? 'Ocultar resueltos' : `Ver resueltos (${resolvedCount})`}
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-(--muted-fg)">Cargando tickets…</p>
            ) : visibleTickets.length === 0 ? (
              <p className="text-sm text-(--muted-fg)">
                No tienes tickets {showResolved ? '' : 'activos '}por ahora.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {visibleTickets.map((t) => {
                  const statusMeta = TICKET_STATUS_META[t.status] || TICKET_STATUS_META.ABIERTO;
                  return (
                    <div
                      key={t._id}
                      className="rounded-lg border border-(--border-color) bg-(--input-bg) p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-(--app-fg)">{t.title}</p>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-(--muted-fg)">
                        {TICKET_TYPE_LABELS[t.type] || t.type} · {formatDateTime(t.createdAt)}
                      </p>
                      {t.response && (
                        <p className="mt-2 rounded bg-(--hover-bg) px-2 py-1 text-xs text-(--muted-fg-2)">
                          <span className="text-(--muted-fg)">Respuesta: </span>
                          {t.response}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketsSection;
