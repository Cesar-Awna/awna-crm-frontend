import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import FunnelStagesService from '../../../services/FunnelStages.js';
import AuthService from '../../../services/Auth.js';
import TeamsService from '../../../services/Teams.js';
import LeadDocumentsService from '../../../services/LeadDocuments.js';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';
import {
  buildLeadPayload,
  indexDocumentsByFieldKey,
  mapApiLeadToFormState,
} from '../../../lib/leadFormMappers.js';

const DONORS = ['Entel', 'Movistar', 'GTD', 'WOM', 'Mundo', 'Línea nueva'];
const SEGMENTS = ['MICRO', 'PEQUENA', 'MEDIANA', 'GRANDE_1'];
const DOC_LIMIT_BYTES = 200 * 1024 * 1024;

/** Títulos legibles para el bloque de documentación */
const DOC_LABELS = {
  autentikar: 'Autentikar',
  escritura: 'Escritura',
  carnetRepresentanteLegal: 'Carnet representante legal',
  riesgoConvergente: 'Riesgo convergente',
  aceptaSimple: 'Acepta simple',
  excepciones: 'Excepciones',
  cotizadorEvaluador: 'Cotizador / evaluador',
  solicitudPortabilidad: 'Solicitud portabilidad',
  traspasoLineas: 'Traspaso de líneas',
  facturaCompetencia: 'Factura competencia',
  ciRrlAmbosLados: 'CI RRL (ambos lados)',
  estatutoExtracto: 'Estatuto / extracto',
  vigenciaCi: 'Vigencia CI',
  situacionTributariaSii: 'Situación tributaria SII',
};

const docFieldTitle = (k) =>
  DOC_LABELS[k] ||
  k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const emptyForm = () => ({
  status: 'OPEN',
  substatusOpen: 'OPORTUNIDAD',
  wonSaleClosed: false,
  clientName: '',
  clientRut: '',
  segment: '',
  quoteDate: '',
  activationDate: '',
  sigloFolio: '',
  mobile: false,
  fixed: false,
  mobileType: '',
  mobileLines: '',
  mobileDonor: '',
  fixedPack: '',
  fixedDuo: [],
  fixedSingle: '',
  fixedCommune: '',
  fixedAddress: '',
  fixedMap: '',
  risk: '',
  protesto: 'NO',
  dicomTotal: '',
  dicomTelco: '',
  deudaClaro: '',
  claroSegment: '',
  lostObservation: '',
});

const NewLeadV2 = () => {
  const navigate = useNavigate();
  const { leadId } = useParams();
  const isEdit = Boolean(leadId);

  const [currentStageId, setCurrentStageId] = useState('');
  const [me, setMe] = useState(null);
  const [supervisor, setSupervisor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!isEdit);
  const [existingDocsByField, setExistingDocsByField] = useState({});
  const [blobUrls, setBlobUrls] = useState({});
  const [preview, setPreview] = useState({ fieldKey: null, url: null, source: null });
  const [previewLoading, setPreviewLoading] = useState(false);

  const [f, setF] = useState(emptyForm);

  const docs = useMemo(
    () => ({
      mobile: ['autentikar', 'escritura', 'carnetRepresentanteLegal', 'riesgoConvergente', 'aceptaSimple', 'excepciones', 'cotizadorEvaluador', 'solicitudPortabilidad', 'traspasoLineas', 'facturaCompetencia'],
      fixed: ['ciRrlAmbosLados', 'estatutoExtracto', 'aceptaSimple', 'autentikar', 'vigenciaCi', 'situacionTributariaSii'],
    }),
    []
  );
  const [files, setFiles] = useState({});

  const executiveLabel = useMemo(() => {
    if (!me?.user) return '—';
    return `${me.user.fullName || ''}${me.user.email ? ` (${me.user.email})` : ''}`.trim();
  }, [me]);

  const canEditActivationDate = me?.role === 'SUPERVISOR' || me?.role === 'COMPANY_ADMIN';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError('');
      const [stagesRes, meRes] = await Promise.all([FunnelStagesService.getAll(), AuthService.getMe()]);
      if (cancelled) return;

      if (meRes?.success && meRes.data) {
        setMe(meRes.data);
        const teamId = meRes.data.user?.teamId;
        if (teamId) {
          const membersRes = await TeamsService.getMembers(teamId);
          if (!cancelled && membersRes?.success && Array.isArray(membersRes.data)) {
            setSupervisor(membersRes.data.find((u) => u.roleName === 'SUPERVISOR') || null);
          }
        }
      }

      if (leadId) {
        setInitialLoading(true);
        try {
          const [leadRes, docsRes] = await Promise.all([
            LeadsService.getById(leadId),
            LeadDocumentsService.getByLeadId(leadId),
          ]);
          if (cancelled) return;
          if (!leadRes?.success || !leadRes.data) {
            setError(leadRes?.message || 'No se pudo cargar el lead.');
            return;
          }
          const lead = leadRes.data;
          setCurrentStageId(lead.currentStageId ? String(lead.currentStageId) : '');
          const formState = mapApiLeadToFormState(lead);
          if (formState) setF(formState);
          if (docsRes?.success && Array.isArray(docsRes.data)) {
            setExistingDocsByField(indexDocumentsByFieldKey(docsRes.data));
          } else {
            setExistingDocsByField({});
          }
        } finally {
          if (!cancelled) setInitialLoading(false);
        }
      } else if (stagesRes?.success && stagesRes.data?.[0]?._id) {
        setCurrentStageId(String(stagesRes.data[0]._id));
      }
    };

    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  useEffect(() => {
    return () => {
      Object.values(blobUrls).forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [blobUrls]);

  const setField = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const handleDocFileChange = (fieldKey, e) => {
    const file = e.target.files?.[0] || null;
    setFiles((p) => ({ ...p, [fieldKey]: file }));
    setBlobUrls((prev) => {
      const next = { ...prev };
      if (next[fieldKey]) {
        URL.revokeObjectURL(next[fieldKey]);
        delete next[fieldKey];
      }
      if (file) next[fieldKey] = URL.createObjectURL(file);
      return next;
    });
    setPreview((p) => (p.fieldKey === fieldKey ? { fieldKey: null, url: null, source: null } : p));
  };

  const validatePdfFile = (file, label) => {
    if (!file) return `${label} es obligatorio.`;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return `${label} debe ser PDF.`;
    if (file.size > DOC_LIMIT_BYTES) return `${label} supera 200MB.`;
    return '';
  };

  const openExistingPdfTab = async (docMongoId) => {
    setError('');
    try {
      const res = await LeadDocumentsService.getSignedUrl(docMongoId, { expiresIn: 600 });
      const url = res?.data?.url;
      if (res?.success && url) window.open(url, '_blank', 'noopener,noreferrer');
      else setError(res?.message || 'No se pudo obtener el enlace de descarga.');
    } catch {
      setError('Error al abrir el documento.');
    }
  };

  const toggleServerPreview = async (fieldKey, docMongoId) => {
    setError('');
    if (preview.fieldKey === fieldKey && preview.source === 'cloudinary') {
      setPreview({ fieldKey: null, url: null, source: null });
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await LeadDocumentsService.getSignedUrl(docMongoId, { expiresIn: 3600 });
      const url = res?.data?.url;
      if (res?.success && url) setPreview({ fieldKey, url, source: 'cloudinary' });
      else {
        setError(res?.message || 'No se pudo cargar la vista previa.');
        setPreview({ fieldKey: null, url: null, source: null });
      }
    } catch {
      setError('Error al cargar la vista previa.');
      setPreview({ fieldKey: null, url: null, source: null });
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleBlobPreview = (fieldKey) => {
    const url = blobUrls[fieldKey];
    if (!url) {
      setError('Selecciona un PDF primero.');
      return;
    }
    if (preview.fieldKey === fieldKey && preview.source === 'blob') {
      setPreview({ fieldKey: null, url: null, source: null });
      return;
    }
    setPreview({ fieldKey, url, source: 'blob' });
  };

  const deleteDocumentForField = async (fieldKey, docId) => {
    setError('');
    try {
      const res = await LeadDocumentsService.delete(docId);
      if (res?.success) {
        setExistingDocsByField((prev) => {
          const next = { ...prev };
          if (next[fieldKey]?._id === docId) delete next[fieldKey];
          return next;
        });
        setFiles((p) => ({ ...p, [fieldKey]: null }));
        setBlobUrls((prev) => {
          const next = { ...prev };
          if (next[fieldKey]) {
            URL.revokeObjectURL(next[fieldKey]);
            delete next[fieldKey];
          }
          return next;
        });
        setPreview((p) => (p.fieldKey === fieldKey ? { fieldKey: null, url: null, source: null } : p));
      } else setError(res?.message || 'No se pudo eliminar el documento.');
    } catch {
      setError('Error al eliminar el documento.');
    }
  };

  const uploadNewDocuments = async (id) => {
    const requiredDocs = [...(f.mobile ? docs.mobile : []), ...(f.fixed ? docs.fixed : [])];
    for (const key of requiredDocs) {
      const file = files[key];
      if (!file) continue;
      const prev = existingDocsByField[key];
      const uploadRes = await LeadDocumentsService.upload({
        leadId: id,
        file,
        docType: 'OTHER',
        metadata: { fieldKey: key },
      });
      if (!uploadRes?.success) {
        throw new Error(uploadRes?.message || `Error al subir documento (${key}).`);
      }
      if (prev?._id) {
        const delRes = await LeadDocumentsService.delete(prev._id);
        if (!delRes?.success) {
          console.warn('Documento nuevo subido pero no se pudo borrar el anterior en sistema:', delRes?.message);
        }
      }
    }
  };

  const renderDocField = (k) => {
      const existing = existingDocsByField[k];
      const hasExisting = Boolean(existing?._id);
      const showFrame = preview.fieldKey === k && preview.url;
      const inputId = `lead-doc-file-${k}`;
      const fileName =
        files[k]?.name ||
        (hasExisting && !files[k] ? 'Archivo guardado en sistema' : null);

      return (
        <div
          key={k}
          className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)]/80 p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="text-sm font-medium tracking-tight text-[var(--input-fg)]">
                {docFieldTitle(k)}
              </h4>
              {hasExisting ? (
                <span className="inline-flex w-fit items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  En sistema
                </span>
              ) : files[k] ? (
                <span className="inline-flex w-fit items-center rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-400">
                  Listo para subir
                </span>
              ) : (
                <span className="inline-flex w-fit items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                  Falta PDF
                </span>
              )}
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
              {hasExisting ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleServerPreview(k, existing._id)}
                    disabled={previewLoading}
                  >
                    {showFrame && preview.source === 'cloudinary'
                      ? 'Ocultar vista'
                      : 'Vista previa'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openExistingPdfTab(existing._id)}
                  >
                    Nueva pestaña
                  </Button>
                  {isEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-950/30 hover:text-red-300"
                      onClick={() => deleteDocumentForField(k, existing._id)}
                    >
                      Eliminar
                    </Button>
                  )}
                </>
              ) : null}
              {files[k] ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBlobPreview(k)}
                >
                  {showFrame && preview.source === 'blob'
                    ? 'Ocultar borrador'
                    : 'Vista previa borrador'}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="relative">
            <label htmlFor={inputId} className="sr-only">
              Archivo PDF para {docFieldTitle(k)}
            </label>
            <input
              id={inputId}
              type="file"
              accept=".pdf,application/pdf"
              className="absolute inset-0 z-10 h-full min-h-[2.5rem] w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              onChange={(e) => handleDocFileChange(k, e)}
              disabled={previewLoading}
            />
            <div
              className="pointer-events-none flex min-h-10 items-center gap-3 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              aria-hidden
            >
              <span className="shrink-0 rounded bg-[var(--hover-bg)] px-2 py-1 text-xs font-medium text-[var(--muted-fg-2)]">
                PDF
              </span>
              <span className="min-w-0 flex-1 truncate text-[var(--muted-fg)]">
                {fileName || 'Ningún archivo seleccionado · máx. 200MB'}
              </span>
            </div>
          </div>

          {hasExisting && (
            <p className="text-xs leading-relaxed text-[var(--muted-fg)]">
              Reemplazar: elige otro PDF y guarda; el anterior se elimina del almacenamiento.
            </p>
          )}
          {showFrame ? (
            <div className="overflow-hidden rounded-lg border border-[var(--input-border)] bg-[var(--app-bg)] shadow-inner">
              <iframe
                title={`Vista previa ${docFieldTitle(k)}`}
                src={preview.url}
                className="h-[min(70vh,520px)] w-full"
              />
            </div>
          ) : null}
        </div>
      );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.clientName.trim() || !f.clientRut.trim()) return setError('Nombre y RUT son obligatorios.');
    if (!f.segment) return setError('Segmento es obligatorio.');
    if (!f.mobile && !f.fixed) return setError('Debes marcar móvil y/o fijo.');
    if (f.status === 'LOST' && !f.lostObservation.trim()) return setError('Perdido requiere observación.');
    if (f.mobile && (!f.mobileType || !f.mobileDonor || Number(f.mobileLines) <= 0)) return setError('Completa datos de móvil.');
    if (f.fixed && (!f.fixedPack || !f.fixedAddress.trim() || !f.fixedCommune.trim())) return setError('Completa datos de fijo.');
    if (f.fixedPack === 'DUO' && f.fixedDuo.length !== 2) return setError('Dúo requiere 2 productos.');
    if (f.fixedPack === 'INDIVIDUAL' && !f.fixedSingle) return setError('Individual requiere producto.');
    if (!f.risk || !f.claroSegment) return setError('Completa Riesgo y Segmentación Claro.');

    const requiredDocs = [...(f.mobile ? docs.mobile : []), ...(f.fixed ? docs.fixed : [])];
    for (const key of requiredDocs) {
      if (files[key]) {
        const msg = validatePdfFile(files[key], `Documento ${key}`);
        if (msg) return setError(msg);
      } else if (!existingDocsByField[key]) {
        return setError(`Documento ${key} es obligatorio.`);
      }
    }

    const payloadOpts = {
      currentStageId,
      me,
      supervisor,
      canEditActivationDate,
      isEdit,
    };
    const payload = buildLeadPayload(f, payloadOpts);

    setLoading(true);
    try {
      if (isEdit) {
        const res = await LeadsService.update(leadId, payload);
        if (res?.success) {
          await uploadNewDocuments(leadId);
          navigate('/leads');
        } else setError(res?.message || 'Error al actualizar lead.');
      } else {
        const res = await LeadsService.create(payload);
        if (res?.success) {
          const newId = res?.data?._id;
          if (newId) await uploadNewDocuments(newId);
          navigate('/leads');
        } else setError(res?.message || 'Error al crear lead.');
      }
    } catch (e) {
      setError(e?.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <FloatingAlert message={error} onDismiss={() => setError('')} variant="error" />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => navigate(isEdit ? '/leads' : -1)}
            aria-label={isEdit ? 'Volver al listado de leads' : 'Volver atrás'}
          >
            ←
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEdit ? 'Editar lead' : 'Nuevo lead'}
            </h1>
            <p className="text-xs text-slate-400">
              Formulario call center · {isEdit ? `ID ${leadId?.slice(-8)}` : 'Alta manual'}
            </p>
          </div>
        </header>

        {initialLoading ? (
          <p className="text-sm text-slate-400">Cargando lead…</p>
        ) : (
          <form onSubmit={onSubmit} className="max-w-5xl space-y-6">
            <Card><CardHeader><CardTitle>Lead y estado</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-xs">Estado</label><select value={f.status} onChange={(e) => setField('status', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="OPEN">Abierto</option><option value="WON">Ganado</option><option value="LOST">Perdido</option></select></div>
              {f.status === 'OPEN' && <div><label className="text-xs">Subestado</label><select value={f.substatusOpen} onChange={(e) => setField('substatusOpen', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="OPORTUNIDAD">Oportunidad</option><option value="EN_NEGOCIACION">Negociación</option></select></div>}
              {f.status === 'WON' && <div className="pt-6"><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={f.wonSaleClosed} onChange={(e) => setField('wonSaleClosed', e.target.checked)} className="accent-emerald-500" />Venta cerrada (subestado En revisión)</label></div>}
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Cliente / Fechas / Asignación</CardTitle></CardHeader><CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs">Nombre</label><Input value={f.clientName} onChange={(e) => setField('clientName', e.target.value)} /></div>
                <div><label className="text-xs">RUT</label><Input value={f.clientRut} onChange={(e) => setField('clientRut', e.target.value)} /></div>
                <div><label className="text-xs">Segmento</label><select value={f.segment} onChange={(e) => setField('segment', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="">Selecciona…</option>{SEGMENTS.map((s) => <option key={s} value={s}>{s === 'GRANDE_1' ? 'Grande' : s === 'PEQUENA' ? 'Pequeña' : s === 'MEDIANA' ? 'Mediana' : 'Micro'}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs">Fecha cotización</label><Input type="date" value={f.quoteDate} onChange={(e) => setField('quoteDate', e.target.value)} /></div>
                <div><label className="text-xs">Fecha activación</label><Input type="date" disabled={!canEditActivationDate} value={f.activationDate} onChange={(e) => setField('activationDate', e.target.value)} /></div>
                <div><label className="text-xs">Folio</label><Input value={f.sigloFolio} onChange={(e) => setField('sigloFolio', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs">Usuario</label><Input value={executiveLabel} readOnly className="bg-slate-900/80 text-slate-400" /></div>
                <div><label className="text-xs">Supervisor</label><Input value={supervisor ? `${supervisor.fullName} (${supervisor.email})` : 'Sin supervisor'} readOnly className="bg-slate-900/80 text-slate-400" /></div>
              </div>
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Servicios</CardTitle></CardHeader><CardContent className="space-y-4">
              <div className="flex gap-6">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={f.mobile} onChange={(e) => setField('mobile', e.target.checked)} className="accent-emerald-500" />Móvil</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={f.fixed} onChange={(e) => setField('fixed', e.target.checked)} className="accent-emerald-500" />Fijo</label>
              </div>
              {f.mobile && <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="text-xs">Tipo</label><select value={f.mobileType} onChange={(e) => setField('mobileType', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="">Selecciona…</option><option value="HABILITACION">Habilitación</option><option value="PORTABILIDAD">Portabilidad</option></select></div><div><label className="text-xs">Cantidad líneas</label><Input type="number" min={1} value={f.mobileLines} onChange={(e) => setField('mobileLines', e.target.value)} /></div><div><label className="text-xs">Donante</label><select value={f.mobileDonor} onChange={(e) => setField('mobileDonor', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="">Selecciona…</option>{DONORS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div></div>}
              {f.fixed && <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="text-xs">Paquete</label><select value={f.fixedPack} onChange={(e) => setField('fixedPack', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="">Selecciona…</option><option value="TRIO">Trío</option><option value="DUO">Dúo</option><option value="INDIVIDUAL">Individual</option></select></div><div><label className="text-xs">Comuna</label><Input value={f.fixedCommune} onChange={(e) => setField('fixedCommune', e.target.value)} /></div><div><label className="text-xs">Mapa Google URL</label><Input value={f.fixedMap} onChange={(e) => setField('fixedMap', e.target.value)} /></div></div><div><label className="text-xs">Dirección</label><Input value={f.fixedAddress} onChange={(e) => setField('fixedAddress', e.target.value)} /></div>{f.fixedPack === 'DUO' && <div className="flex gap-4">{['INTERNET', 'TV', 'TELEFONO'].map((p) => <label key={p} className="inline-flex items-center gap-2"><input type="checkbox" checked={f.fixedDuo.includes(p)} onChange={() => setField('fixedDuo', f.fixedDuo.includes(p) ? f.fixedDuo.filter((x) => x !== p) : [...f.fixedDuo, p])} className="accent-emerald-500" />{p}</label>)}</div>}{f.fixedPack === 'INDIVIDUAL' && <div><label className="text-xs">Producto individual</label><select value={f.fixedSingle} onChange={(e) => setField('fixedSingle', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="">Selecciona…</option><option value="INTERNET">Internet</option><option value="TV">TV</option><option value="TELEFONO">Teléfono</option></select></div>}</div>}
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Portales Claro</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4"><div><label className="text-xs">Riesgo A-G</label><select value={f.risk} onChange={(e) => setField('risk', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="">Selecciona…</option>{['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((g) => <option key={g} value={g}>{g}</option>)}</select></div><div><label className="text-xs">Protesto</label><select value={f.protesto} onChange={(e) => setField('protesto', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="NO">No</option><option value="SI">Sí</option></select></div><div><label className="text-xs">DICOM total</label><Input type="number" min={0} value={f.dicomTotal} onChange={(e) => setField('dicomTotal', e.target.value)} /></div><div><label className="text-xs">DICOM TELCO</label><Input type="number" min={0} value={f.dicomTelco} onChange={(e) => setField('dicomTelco', e.target.value)} /></div><div><label className="text-xs">Deuda Claro</label><Input type="number" min={0} value={f.deudaClaro} onChange={(e) => setField('deudaClaro', e.target.value)} /></div><div className="md:col-span-2"><label className="text-xs">Segmentación</label><select value={f.claroSegment} onChange={(e) => setField('claroSegment', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"><option value="">Selecciona…</option>{SEGMENTS.map((s) => <option key={s} value={s}>{s === 'GRANDE_1' ? 'Grande' : s === 'PEQUENA' ? 'Pequeña' : s === 'MEDIANA' ? 'Mediana' : 'Micro'}</option>)}</select></div></CardContent></Card>

            <Card><CardHeader><CardTitle>Documentación (PDF, máximo 200MB)</CardTitle></CardHeader><CardContent className="space-y-4">
              <p className="text-xs text-slate-400">
                Vista previa embebida, descarga en nueva pestaña, eliminar (Cloudinary + base de datos) y reemplazo al guardar
                si subes otro archivo en el mismo campo.
              </p>
              {f.mobile && docs.mobile.map((k) => renderDocField(k))}
              {f.fixed && docs.fixed.map((k) => renderDocField(k))}
            </CardContent></Card>

            {f.status === 'LOST' && <Card><CardHeader><CardTitle>Observación pérdida</CardTitle></CardHeader><CardContent><textarea rows={4} value={f.lostObservation} onChange={(e) => setField('lostObservation', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" /></CardContent></Card>}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear lead'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(isEdit ? '/leads' : -1)}>
                {isEdit ? 'Volver al listado' : 'Cancelar'}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default NewLeadV2;
