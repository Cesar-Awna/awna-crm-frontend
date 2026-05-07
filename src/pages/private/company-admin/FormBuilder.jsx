import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { getStoredSession } from '../../../lib/session.js';
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text',     label: 'Texto' },
  { value: 'number',   label: 'Número' },
  { value: 'email',    label: 'Email' },
  { value: 'phone',    label: 'Teléfono' },
  { value: 'select',   label: 'Selección' },
  { value: 'date',     label: 'Fecha' },
  { value: 'textarea', label: 'Área de texto' },
];

const DEFAULT_ACTIVITY_TYPES = [
  { key: 'CALL',            label: 'Llamada',             pointValue: 1, dailyCap: 10 },
  { key: 'CONTACT_SUCCESS', label: 'Contacto efectivo',   pointValue: 2, dailyCap: 5  },
  { key: 'FOLLOWUP',        label: 'Seguimiento',         pointValue: 1, dailyCap: 10 },
  { key: 'WHATSAPP_SENT',   label: 'WhatsApp enviado',    pointValue: 1, dailyCap: 10 },
  { key: 'EMAIL_SENT',      label: 'Correo enviado',      pointValue: 1, dailyCap: 5  },
  { key: 'QUOTE_SENT',      label: 'Cotización enviada',  pointValue: 3, dailyCap: 3  },
  { key: 'RESCHEDULE',      label: 'Reagendamiento',      pointValue: 1, dailyCap: 5  },
  { key: 'NOTE_ADDED',      label: 'Nota/hito',           pointValue: 0, dailyCap: 0  },
];

const TABS = ['Formulario', 'Actividades', 'Etapas del pipeline'];

const inputClass =
  'w-full rounded-md border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

const FormBuilder = () => {
  const session = getStoredSession();
  const buId = session?.businessUnitIds?.[0];

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);

  const [leadSchema,     setLeadSchema]     = useState([]);
  const [activityTypes,  setActivityTypes]  = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);

  useEffect(() => {
    if (!buId) { setLoading(false); return; }
    BusinessUnitsService.getSchema(buId)
      .then((res) => {
        if (res?.success) {
          setLeadSchema(res.data.leadSchema || []);
          setActivityTypes(
            res.data.activityTypes?.length
              ? res.data.activityTypes
              : DEFAULT_ACTIVITY_TYPES
          );
          setPipelineStages(res.data.pipelineStages || []);
        }
      })
      .finally(() => setLoading(false));
  }, [buId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await BusinessUnitsService.updateSchema(buId, {
        leadSchema,
        activityTypes,
        pipelineStages,
      });
      if (res?.success) {
        setAlert({ type: 'success', text: 'Esquema guardado correctamente.' });
      } else {
        setAlert({ type: 'error', text: res?.message || 'Error al guardar.' });
      }
    } catch {
      setAlert({ type: 'error', text: 'Error inesperado al guardar.' });
    } finally {
      setSaving(false);
    }
  };

  /* ── Lead schema actions ── */
  const addField = () =>
    setLeadSchema((prev) => [
      ...prev,
      { key: '', label: '', type: 'text', required: false, options: [], placeholder: '', order: prev.length },
    ]);

  const updateField = (idx, patch) =>
    setLeadSchema((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const removeField = (idx) =>
    setLeadSchema((prev) =>
      prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i }))
    );

  const moveField = (idx, dir) =>
    setLeadSchema((prev) => {
      const next = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[idx], next[to]] = [next[to], next[idx]];
      return next.map((f, i) => ({ ...f, order: i }));
    });

  /* ── Activity type actions ── */
  const addActivity = () =>
    setActivityTypes((prev) => [
      ...prev,
      { key: '', label: '', pointValue: 1, dailyCap: 5 },
    ]);

  const updateActivity = (idx, patch) =>
    setActivityTypes((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));

  const removeActivity = (idx) =>
    setActivityTypes((prev) => prev.filter((_, i) => i !== idx));

  /* ── Pipeline stage actions ── */
  const addStage = () =>
    setPipelineStages((prev) => [
      ...prev,
      { key: '', label: '', order: prev.length, color: '#6366f1' },
    ]);

  const updateStage = (idx, patch) =>
    setPipelineStages((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const removeStage = (idx) =>
    setPipelineStages((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }))
    );

  const moveStage = (idx, dir) =>
    setPipelineStages((prev) => {
      const next = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[idx], next[to]] = [next[to], next[idx]];
      return next.map((s, i) => ({ ...s, order: i }));
    });

  return (
    <div className="flex min-h-screen bg-[var(--main-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {alert && (
          <FloatingAlert
            type={alert.type}
            message={alert.text}
            onClose={() => setAlert(null)}
          />
        )}

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-50">Constructor de Formulario</h1>
          <Button onClick={save} disabled={saving || !buId}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>

        {!buId ? (
          <p className="text-slate-400">No se encontró unidad de negocio en la sesión.</p>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex gap-6 border-b border-[var(--border-color)] pb-3">
                {TABS.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === i
                        ? 'border-emerald-400 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-400">Cargando esquema…</p>
              ) : (
                <>
                  {/* ── TAB 0: Formulario ── */}
                  {activeTab === 0 && (
                    <div className="space-y-3">
                      {leadSchema.length === 0 && (
                        <p className="text-sm text-slate-500 italic">
                          Sin campos aún. Agrega el primero.
                        </p>
                      )}
                      {leadSchema.map((field, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-lg border border-[var(--border-color)] bg-slate-800/40 p-3"
                        >
                          <div className="flex flex-col gap-1 pt-5">
                            <button
                              onClick={() => moveField(idx, -1)}
                              disabled={idx === 0}
                              className="text-slate-400 hover:text-slate-200 disabled:opacity-25"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => moveField(idx, 1)}
                              disabled={idx === leadSchema.length - 1}
                              className="text-slate-400 hover:text-slate-200 disabled:opacity-25"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Clave (key)</p>
                              <input
                                value={field.key}
                                onChange={(e) => updateField(idx, { key: e.target.value })}
                                placeholder="ej: razonSocial"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Etiqueta</p>
                              <input
                                value={field.label}
                                onChange={(e) => updateField(idx, { label: e.target.value })}
                                placeholder="ej: Razón Social"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Tipo</p>
                              <select
                                value={field.type}
                                onChange={(e) => updateField(idx, { type: e.target.value })}
                                className={`${inputClass} cursor-pointer`}
                              >
                                {FIELD_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end pb-1.5">
                              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => updateField(idx, { required: e.target.checked })}
                                  className="accent-emerald-500"
                                />
                                Requerido
                              </label>
                            </div>

                            {field.type === 'select' && (
                              <div className="col-span-2 sm:col-span-4">
                                <p className="mb-1 text-xs text-slate-500">
                                  Opciones (separadas por coma)
                                </p>
                                <input
                                  value={(field.options || []).join(', ')}
                                  onChange={(e) =>
                                    updateField(idx, {
                                      options: e.target.value
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  placeholder="ej: Opción A, Opción B"
                                  className={inputClass}
                                />
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => removeField(idx)}
                            className="mt-5 text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}

                      <Button variant="outline" size="sm" onClick={addField} className="gap-1.5">
                        <Plus size={14} /> Agregar campo
                      </Button>
                    </div>
                  )}

                  {/* ── TAB 1: Actividades ── */}
                  {activeTab === 1 && (
                    <div className="space-y-3">
                      {activityTypes.map((act, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-slate-800/40 p-3"
                        >
                          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Clave (key)</p>
                              <input
                                value={act.key}
                                onChange={(e) => updateActivity(idx, { key: e.target.value })}
                                placeholder="ej: CALL"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Etiqueta</p>
                              <input
                                value={act.label}
                                onChange={(e) => updateActivity(idx, { label: e.target.value })}
                                placeholder="ej: Llamada"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Puntos por actividad</p>
                              <input
                                type="number"
                                min={0}
                                value={act.pointValue}
                                onChange={(e) =>
                                  updateActivity(idx, { pointValue: Number(e.target.value) })
                                }
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Tope diario</p>
                              <input
                                type="number"
                                min={0}
                                value={act.dailyCap}
                                onChange={(e) =>
                                  updateActivity(idx, { dailyCap: Number(e.target.value) })
                                }
                                className={inputClass}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removeActivity(idx)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addActivity}
                        className="gap-1.5"
                      >
                        <Plus size={14} /> Agregar actividad
                      </Button>
                    </div>
                  )}

                  {/* ── TAB 2: Etapas ── */}
                  {activeTab === 2 && (
                    <div className="space-y-3">
                      {pipelineStages.length === 0 && (
                        <p className="text-sm text-slate-500 italic">
                          Sin etapas aún. Agrega la primera.
                        </p>
                      )}
                      {pipelineStages.map((stage, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-lg border border-[var(--border-color)] bg-slate-800/40 p-3"
                        >
                          <div className="flex flex-col gap-1 pt-5">
                            <button
                              onClick={() => moveStage(idx, -1)}
                              disabled={idx === 0}
                              className="text-slate-400 hover:text-slate-200 disabled:opacity-25"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => moveStage(idx, 1)}
                              disabled={idx === pipelineStages.length - 1}
                              className="text-slate-400 hover:text-slate-200 disabled:opacity-25"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Clave (key)</p>
                              <input
                                value={stage.key}
                                onChange={(e) => updateStage(idx, { key: e.target.value })}
                                placeholder="ej: NUEVO"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Etiqueta</p>
                              <input
                                value={stage.label}
                                onChange={(e) => updateStage(idx, { label: e.target.value })}
                                placeholder="ej: Nuevo"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Color</p>
                              <input
                                type="color"
                                value={stage.color || '#6366f1'}
                                onChange={(e) => updateStage(idx, { color: e.target.value })}
                                className="h-9 w-full cursor-pointer rounded-md border border-[var(--border-color)] bg-transparent"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => removeStage(idx)}
                            className="mt-5 text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addStage}
                        className="gap-1.5"
                      >
                        <Plus size={14} /> Agregar etapa
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default FormBuilder;
