import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import AuthService from '../../../services/Auth.js';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import DynamicLeadForm from '../../../components/DynamicLeadForm.jsx';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';
import { getStoredSession } from '../../../lib/session.js';
import {
  buildLeadPayload,
  mapApiLeadToFormState,
  LEAD_STATUSES,
  LEAD_STATUS_VALUES,
  NEXT_ACTION_TYPES,
  ACTIVITY_TYPES,
  getActivityLabel,
} from '../../../lib/leadFormMappers.js';

const legacyEmptyForm = () => ({
  razonSocial: '',
  rutEmpresa: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  status: 'NUEVO',
  observation: '',
  nextContactDate: '',
  nextActionType: '',
  callCount: 0,
  contactSuccessCount: 0,
  followupCount: 0,
  whatsappSentCount: 0,
  emailSentCount: 0,
  quoteSentCount: 0,
  rescheduleCount: 0,
});

const schemaToEmptyForm = (schema) => {
  const base = {
    status: 'NUEVO',
    nextContactDate: '',
    nextActionType: '',
    activityCounts: {},
    callCount: 0,
    contactSuccessCount: 0,
    followupCount: 0,
    whatsappSentCount: 0,
    emailSentCount: 0,
    quoteSentCount: 0,
    rescheduleCount: 0,
  };
  for (const field of schema) {
    base[field.key] = field.type === 'number' ? 0 : field.type === 'multiselect' ? [] : '';
  }
  return base;
};

const EVENT_ICONS = {
  CALL: '📞',
  CONTACT_SUCCESS: '✅',
  FOLLOWUP: '🔄',
  WHATSAPP_SENT: '💬',
  EMAIL_SENT: '✉️',
  QUOTE_SENT: '📄',
  RESCHEDULE: '📅',
  NOTE_ADDED: '📝',
};

const NewLeadV2 = () => {
  const navigate = useNavigate();
  const { leadId } = useParams();
  const isEdit = Boolean(leadId);

  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!isEdit);
  const [f, setF] = useState(legacyEmptyForm);

  const [schema, setSchema] = useState([]);
  const [buActivityTypes, setBuActivityTypes] = useState([]);
  const [buPipelineStages, setBuPipelineStages] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(true);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [activityType, setActivityType] = useState('CALL');
  const [activityNote, setActivityNote] = useState('');
  const [activityFile, setActivityFile] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [hitoText, setHitoText] = useState('');
  const [hitoLoading, setHitoLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [executives, setExecutives] = useState([]);
  const [assignToUserId, setAssignToUserId] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const evRes = await LeadsService.getEvents(leadId);
        if (!cancelled && evRes?.success) setEvents(evRes.data || []);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    };

    const load = async () => {
      setError('');

      // 1. Current user + executives list (for supervisor/admin)
      const meRes = await AuthService.getMe();
      if (cancelled) return;
      if (meRes?.success && meRes.data) {
        setMe(meRes.data);
        if (meRes.data?.role === 'SUPERVISOR' || meRes.data?.role === 'COMPANY_ADMIN') {
          const exRes = await UsersService.getExecutives();
          if (!cancelled && exRes?.success) {
            const exList = exRes.data || [];
            setExecutives(exList);
            if (meRes.data?.role === 'SUPERVISOR') {
              setAssignToUserId(String(meRes.data.user._id));
            } else if (exList.length > 0) {
              setAssignToUserId(exList[0]._id);
            }
          }
        }
      }

      // 2. BU schema — drives dynamic form fields
      const session = getStoredSession();
      const buId = session?.businessUnitIds?.[0];
      let loadedSchema = [];
      if (buId) {
        try {
          const schemaRes = await BusinessUnitsService.getSchema(buId);
          if (!cancelled && schemaRes?.success) {
            loadedSchema = schemaRes.data.leadSchema || [];
            setSchema(loadedSchema);
            setBuActivityTypes(schemaRes.data.activityTypes || []);
            setBuPipelineStages(schemaRes.data.pipelineStages || []);
          }
        } catch {
          // falls back to legacy hardcoded form
        }
      }
      if (!cancelled) setSchemaLoading(false);

      // 3. New lead + schema → init empty form from schema
      if (!leadId && !cancelled && loadedSchema.length > 0) {
        setF(schemaToEmptyForm(loadedSchema));
      }

      // 4. Edit mode → load lead and map to form
      if (leadId) {
        setInitialLoading(true);
        try {
          const leadRes = await LeadsService.getById(leadId);
          if (cancelled) return;
          if (!leadRes?.success || !leadRes.data) {
            setError(leadRes?.message || 'No se pudo cargar el lead.');
            return;
          }
          const formState = mapApiLeadToFormState(leadRes.data, loadedSchema);
          if (formState) setF(formState);
        } finally {
          if (!cancelled) setInitialLoading(false);
        }
        loadEvents();
      }
    };

    load().catch(() => {});
    return () => { cancelled = true; };
  }, [leadId]);

  const setField = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const handleDeleteLead = async () => {
    setDeleteLoading(true);
    try {
      const res = await LeadsService.deleteLead(leadId);
      if (res?.success) {
        navigate('/leads');
      } else {
        setError(res?.message || 'Error al eliminar el lead.');
        setDeleteConfirm(false);
      }
    } catch (err) {
      setError(err?.message || 'Error al eliminar el lead.');
      setDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (schema.length > 0) {
      const missing = schema
        .filter((field) => field.required && !(f[field.key]?.toString().trim()))
        .map((field) => field.label);
      if (missing.length > 0) return setError(`Campos obligatorios: ${missing.join(', ')}`);
    } else {
      if (!f.razonSocial?.trim()) return setError('Razón Social es obligatoria.');
      if (!f.rutEmpresa?.trim())  return setError('RUT Empresa es obligatorio.');
      if (!f.contactName?.trim()) return setError('Nombre del Contacto es obligatorio.');
      if (f.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail.trim())) {
        return setError('Correo inválido.');
      }
    }

    const payload = buildLeadPayload(f, { me, isEdit, assignToUserId, schema });
    setLoading(true);
    try {
      const res = isEdit
        ? await LeadsService.update(leadId, payload)
        : await LeadsService.create(payload);
      if (res?.success) {
        navigate('/leads');
      } else {
        setError(res?.message || 'Error al guardar lead.');
      }
    } catch (err) {
      setError(err?.message || 'Error al guardar lead.');
    } finally {
      setLoading(false);
    }
  };

  const refreshEvents = async () => {
    const evRes = await LeadsService.getEvents(leadId);
    if (evRes?.success) setEvents(evRes.data || []);
  };

  const handleAddHito = async () => {
    if (!hitoText.trim()) return;
    setHitoLoading(true);
    setError('');
    try {
      const res = await LeadsService.logActivity(leadId, {
        eventType: 'NOTE_ADDED',
        note: hitoText.trim(),
      });
      if (res?.success) {
        setHitoText('');
        await refreshEvents();
      } else {
        setError(res?.message || 'Error al guardar hito.');
      }
    } catch (err) {
      setError(err?.message || 'Error al guardar hito.');
    } finally {
      setHitoLoading(false);
    }
  };

  const handleLogActivity = async () => {
    if (!activityType) return;
    setActivityLoading(true);
    setError('');
    setSuccess('');
    try {
      let res;
      if (activityFile) {
        const fd = new FormData();
        fd.append('eventType', activityType);
        if (activityNote.trim()) fd.append('note', activityNote.trim());
        fd.append('file', activityFile);
        res = await LeadsService.logActivityWithFile(leadId, fd);
      } else {
        res = await LeadsService.logActivity(leadId, {
          eventType: activityType,
          note: activityNote.trim() || undefined,
        });
      }
      if (res?.success) {
        setActivityNote('');
        setActivityFile(null);
        await refreshEvents();
      } else {
        setError(res?.message || 'Error al registrar actividad.');
      }
    } catch (err) {
      setError(err?.message || 'Error al registrar actividad.');
    } finally {
      setActivityLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
        <Sidebar />
        <main className="flex-1 p-8">Cargando lead…</main>
      </div>
    );
  }

  const statusSelect = (
    <div>
      <label className="mb-1 block text-sm text-[var(--muted-fg)]">Estado</label>
      <select
        className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--input-fg)]"
        value={f.status}
        onChange={(e) => setField('status', e.target.value)}
      >
        {(
          // Use dynamic stages only when the BU has stages NOT in the legacy list
          // (i.e. Getnet, future BUs). Equifax stages are a subset of LEAD_STATUSES
          // so it keeps using the hardcoded order — no visible change for Equifax.
          buPipelineStages.length > 0 &&
          buPipelineStages.some((s) => !LEAD_STATUS_VALUES.includes(s.key))
            ? buPipelineStages
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((s) => ({ value: s.key, label: s.label }))
            : LEAD_STATUSES
        ).map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );

  /* ── Sección de campos del formulario ── */
  const formFields = (
    <Card>
      <CardHeader><CardTitle>Datos del lead</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {schemaLoading ? (
          <p className="text-sm text-slate-400">Cargando campos…</p>
        ) : schema.length > 0 ? (
          /* Status se inyecta dentro de la misma grilla, antes de los textareas */
          <DynamicLeadForm
            schema={schema}
            values={f}
            onChange={setField}
            extraFields={statusSelect}
          />
        ) : (
          /* Fallback legacy para BUs sin esquema definido */
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-[var(--muted-fg)]">Razón Social *</label>
                <Input value={f.razonSocial || ''} onChange={(e) => setField('razonSocial', e.target.value)} placeholder="Empresa S.A." />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted-fg)]">RUT Empresa *</label>
                <Input value={f.rutEmpresa || ''} onChange={(e) => setField('rutEmpresa', e.target.value)} placeholder="76.123.456-7" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted-fg)]">Nombre del Contacto *</label>
                <Input value={f.contactName || ''} onChange={(e) => setField('contactName', e.target.value)} placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted-fg)]">Correo</label>
                <Input type="email" value={f.contactEmail || ''} onChange={(e) => setField('contactEmail', e.target.value)} placeholder="contacto@empresa.cl" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted-fg)]">Teléfono</label>
                <Input value={f.contactPhone || ''} onChange={(e) => setField('contactPhone', e.target.value)} placeholder="+56 9 1234 5678" />
              </div>
              {statusSelect}
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted-fg)]">Observación</label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-fg)]"
                value={f.observation || ''}
                onChange={(e) => setField('observation', e.target.value)}
                placeholder="Notas u observaciones opcionales…"
              />
            </div>
          </>
        )}

        {!isEdit && (
          <p className="text-xs text-[var(--muted-fg)]">
            La fecha de ingreso se registra automáticamente al crear el lead.
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">

        <div className="mb-4 flex items-start justify-between">
          <div>
            <Button type="button" variant="ghost" onClick={() => navigate('/leads')} className="mb-2 px-0 text-sm text-[var(--muted-fg)]">
              ← Volver
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEdit ? 'Editar lead' : 'Nuevo lead'}
            </h1>
          </div>
          {isEdit && (
            <div className="pt-6">
              {!deleteConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-rose-400 hover:text-rose-300 border-rose-500/30"
                  onClick={() => setDeleteConfirm(true)}
                >
                  Eliminar lead
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                  <span className="text-sm text-rose-300">¿Confirmas eliminar?</span>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={handleDeleteLead}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Eliminando…' : 'Sí, eliminar'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CREAR: columna simple centrada ── */}
        {!isEdit && (
          <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
            {formFields}

            {(me?.role === 'SUPERVISOR' || executives.length > 0) && (
              <Card>
                <CardHeader><CardTitle>Asignar a</CardTitle></CardHeader>
                <CardContent>
                  <select
                    required
                    className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--input-fg)]"
                    value={assignToUserId}
                    onChange={(e) => setAssignToUserId(e.target.value)}
                  >
                    {me?.role === 'SUPERVISOR' && (
                      <option value={String(me?.user?._id)}>Yo mismo</option>
                    )}
                    {executives.map((u) => (
                      <option key={u._id} value={u._id}>{u.fullName}</option>
                    ))}
                  </select>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando…' : 'Crear lead'}
              </Button>
            </div>
          </form>
        )}

        {/* ── EDITAR: dos columnas ── */}
        {isEdit && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Columna izquierda — datos */}
            <form onSubmit={onSubmit} className="space-y-4">
              {formFields}

              <Card>
                <CardHeader><CardTitle>Próximo seguimiento</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm text-[var(--muted-fg)]">Fecha de próximo contacto</label>
                      <Input type="date" value={f.nextContactDate} onChange={(e) => setField('nextContactDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[var(--muted-fg)]">Tipo de próxima acción</label>
                      <select
                        className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--input-fg)]"
                        value={f.nextActionType}
                        onChange={(e) => setField('nextActionType', e.target.value)}
                      >
                        <option value="">— Sin definir —</option>
                        {NEXT_ACTION_TYPES.map((a) => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[var(--muted-fg)]">Fecha de cierre</label>
                      <Input
                        type="date"
                        value={f.closedAt || ''}
                        onChange={(e) => setField('closedAt', e.target.value)}
                        placeholder="Se registra automáticamente al cerrar"
                      />
                      <p className="mt-1 text-xs text-[var(--muted-fg)]">Se establece automáticamente al cambiar a estado ganado o perdido.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Contadores de actividad</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {buActivityTypes.length > 0
                      ? buActivityTypes.filter((a) => a.key !== 'NOTE_ADDED').map(({ key, label }) => (
                          <div key={key}>
                            <label className="mb-1 block text-sm text-[var(--muted-fg)]">{label}</label>
                            <Input
                              type="number"
                              min="0"
                              value={f.activityCounts?.[key] ?? 0}
                              onChange={(e) => setField('activityCounts', {
                                ...(f.activityCounts || {}),
                                [key]: Math.max(0, parseInt(e.target.value, 10) || 0),
                              })}
                            />
                          </div>
                        ))
                      : [
                          { key: 'callCount',           label: 'Llamadas realizadas'   },
                          { key: 'contactSuccessCount',  label: 'Contactos efectivos'   },
                          { key: 'followupCount',        label: 'Seguimientos'          },
                          { key: 'whatsappSentCount',    label: 'WhatsApp enviados'     },
                          { key: 'emailSentCount',       label: 'Correos enviados'      },
                          { key: 'quoteSentCount',       label: 'Cotizaciones enviadas' },
                          { key: 'rescheduleCount',      label: 'Reagendamientos'       },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="mb-1 block text-sm text-[var(--muted-fg)]">{label}</label>
                            <Input
                              type="number"
                              min="0"
                              value={f[key]}
                              onChange={(e) => setField(key, Math.max(0, parseInt(e.target.value, 10) || 0))}
                            />
                          </div>
                        ))
                    }
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </form>

            {/* Columna derecha — actividad */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Hitos / Observaciones</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <textarea
                      className="min-h-[90px] w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-fg)] placeholder:text-[var(--muted-fg)]"
                      placeholder="Escribe lo que ocurrió…"
                      value={hitoText}
                      onChange={(e) => setHitoText(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button type="button" onClick={handleAddHito} disabled={hitoLoading || !hitoText.trim()}>
                        {hitoLoading ? 'Guardando…' : 'Agregar hito'}
                      </Button>
                    </div>
                  </div>
                  {eventsLoading ? (
                    <p className="text-xs text-[var(--muted-fg)]">Cargando hitos…</p>
                  ) : (
                    <div className="max-h-80 space-y-0 overflow-y-auto">
                      {events.filter((ev) => ev.eventType === 'NOTE_ADDED').length === 0 ? (
                        <p className="text-xs text-[var(--muted-fg)]">Sin hitos registrados aún.</p>
                      ) : (
                        events.filter((ev) => ev.eventType === 'NOTE_ADDED').map((ev, idx, arr) => (
                          <div key={ev._id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs">📝</span>
                              {idx < arr.length - 1 && <div className="w-px flex-1 bg-slate-700" />}
                            </div>
                            <div className="min-w-0 flex-1 pb-4">
                              <p className="text-sm leading-snug text-[var(--app-fg)]">{ev.metadata?.note}</p>
                              <p className="mt-1 text-xs text-[var(--muted-fg)]">
                                {new Date(ev.eventAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Registrar actividad</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                      className="h-10 flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--input-fg)]"
                      value={activityType}
                      onChange={(e) => { setActivityType(e.target.value); setActivityFile(null); }}
                    >
                      {(buActivityTypes.length > 0
                        ? buActivityTypes.filter((a) => a.key !== 'NOTE_ADDED').map((a) => ({ value: a.key, label: a.label }))
                        : ACTIVITY_TYPES.filter((a) => a.value !== 'NOTE_ADDED')
                      ).map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    <Input
                      className="flex-1"
                      placeholder="Nota (opcional)"
                      value={activityNote}
                      onChange={(e) => setActivityNote(e.target.value)}
                    />
                    <Button type="button" onClick={handleLogActivity} disabled={activityLoading}>
                      {activityLoading ? 'Registrando…' : 'Registrar'}
                    </Button>
                  </div>
                  {activityType === 'QUOTE_SENT' && (
                    <div className="rounded-md border border-dashed border-[var(--input-border)] bg-[var(--input-bg)] p-3">
                      <label className="mb-1 block text-xs text-[var(--muted-fg)]">Adjuntar cotización (PDF)</label>
                      <input
                        type="file"
                        accept=".pdf"
                        className="block w-full text-xs text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-emerald-600/20 file:px-3 file:py-1 file:text-xs file:text-emerald-300 hover:file:bg-emerald-600/30"
                        onChange={(e) => setActivityFile(e.target.files?.[0] || null)}
                      />
                      {activityFile && (
                        <p className="mt-1 text-xs text-emerald-400">📎 {activityFile.name}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-[var(--muted-fg)]">Historial</p>
                    {eventsLoading ? (
                      <p className="text-xs text-[var(--muted-fg)]">Cargando historial…</p>
                    ) : events.filter((ev) => ev.eventType !== 'NOTE_ADDED').length === 0 ? (
                      <p className="text-xs text-[var(--muted-fg)]">Sin actividad registrada aún.</p>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto">
                        {events.filter((ev) => ev.eventType !== 'NOTE_ADDED').map((ev) => (
                          <div key={ev._id} className="flex items-start gap-3 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] p-3">
                            <span className="mt-0.5 text-base leading-none">{EVENT_ICONS[ev.eventType] || '•'}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{getActivityLabel(ev.eventType)}</p>
                              {ev.metadata?.note && (
                                <p className="mt-0.5 text-xs text-[var(--muted-fg)]">{ev.metadata.note}</p>
                              )}
                              {ev.metadata?.signedUrl && (
                                <a
                                  href={ev.metadata.signedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                                >
                                  📎 {ev.metadata.attachmentName || 'Ver adjunto'}
                                </a>
                              )}
                              <p className="mt-1 text-xs text-[var(--muted-fg)]">
                                {new Date(ev.eventAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        )}

        {error   && <FloatingAlert variant="error"   onClose={() => setError('')}>{error}</FloatingAlert>}
        {success && <FloatingAlert variant="success" onClose={() => setSuccess('')}>{success}</FloatingAlert>}
      </main>
    </div>
  );
};

export default NewLeadV2;
