export const NEXT_ACTION_TYPES = [
  { value: 'LLAMADA',    label: 'Llamar' },
  { value: 'ENVIAR_INFO', label: 'Enviar info' },
  { value: 'REUNION',    label: 'Reunión' },
  { value: 'NOTA',       label: 'Nota/bitácora' },
];

export const ACTIVITY_TYPES = [
  { value: 'CALL',            label: 'Llamada realizada' },
  { value: 'EMAIL_SENT',      label: 'Correo enviado' },
  { value: 'MEETING',         label: 'Reunión' },
  { value: 'NOTE_ADDED',      label: 'Nota' },
];

export const getActivityLabel = (value) =>
  ACTIVITY_TYPES.find((a) => a.value === value)?.label || value || '';

export const LEAD_STATUSES = [
  { value: 'NUEVO',              label: 'Nuevo' },
  { value: 'DATO_ERRADO',        label: 'Dato errado' },
  { value: 'CONTACTADO',         label: 'Contactado' },
  { value: 'INTERESADO',         label: 'Interesado' },
  { value: 'COTIZACION_ENVIADA', label: 'Cotización enviada' },
  { value: 'EN_SEGUIMIENTO',     label: 'En seguimiento' },
  { value: 'CERRADO_GANADO',     label: 'Cerrado ganado' },
  { value: 'CLIENTE',            label: 'Cliente' },
  { value: 'CERRADO_PERDIDO',    label: 'Cerrado perdido' },
  { value: 'NO_INTERESADO',      label: 'No interesado' },
];

export const LEAD_STATUS_VALUES = LEAD_STATUSES.map((s) => s.value);

export const getStatusLabel = (value) =>
  LEAD_STATUSES.find((s) => s.value === value)?.label || value || '';

/**
 * Converts an API lead document to a flat form state object.
 * When a schema is provided, reads dynamic fields from lead.fields (with
 * fallback to top-level properties for backward compatibility).
 */
export function mapApiLeadToFormState(lead, schema = []) {
  if (!lead) return null;

  const base = {
    status:              lead.status             || 'NUEVO',
    nextContactDate:     lead.nextContactDate ? lead.nextContactDate.slice(0, 10) : '',
    nextActionType:      lead.nextActionType      || '',
    closedAt:            lead.closedAt ? lead.closedAt.slice(0, 10) : '',
    activityCounts:      lead.activityCounts      || {},
    callCount:           lead.callCount           ?? 0,
    contactSuccessCount: lead.contactSuccessCount ?? 0,
    followupCount:       lead.followupCount       ?? 0,
    whatsappSentCount:   lead.whatsappSentCount   ?? 0,
    emailSentCount:      lead.emailSentCount      ?? 0,
    quoteSentCount:      lead.quoteSentCount       ?? 0,
    rescheduleCount:     lead.rescheduleCount     ?? 0,
    closureCount:        lead.closureCount        ?? 0,
  };

  if (schema.length > 0) {
    for (const field of schema) {
      // Prefer fields map, fall back to top-level property for existing leads
      base[field.key] = lead.fields?.[field.key] ?? lead[field.key] ?? '';
    }
  } else {
    // Legacy hardcoded fields
    base.razonSocial  = lead.razonSocial  || '';
    base.rutEmpresa   = lead.rutEmpresa   || '';
    base.contactName  = lead.contactName  || '';
    base.contactEmail = lead.contactEmail || '';
    base.contactPhone = lead.contactPhone || '';
    base.observation  = lead.observation  || '';
  }

  return base;
}

/**
 * Builds the API payload from form state.
 * When a schema is provided, wraps custom fields in a `fields` map.
 * Keeps backward-compatible flat payload when no schema is available.
 */
export function buildLeadPayload(f, options = {}) {
  const { me, isEdit = false, assignToUserId, schema = [] } = options;

  const payload = {
    status: f.status || 'NUEVO',
  };

  if (schema.length > 0) {
    payload.fields = {};
    for (const field of schema) {
      const val = f[field.key];
      if (val !== undefined && val !== '') {
        payload.fields[field.key] = val;
      }
    }
  } else {
    // Legacy flat fields
    payload.razonSocial  = (f.razonSocial  || '').trim();
    payload.rutEmpresa   = (f.rutEmpresa   || '').trim();
    payload.contactName  = (f.contactName  || '').trim();
    if (f.contactEmail) payload.contactEmail = f.contactEmail.trim();
    if (f.contactPhone) payload.contactPhone = f.contactPhone.trim();
    if (f.observation)  payload.observation  = f.observation;
  }

  // Common fields for both edit and create
  if (f.nextContactDate) payload.nextContactDate = f.nextContactDate;
  if (f.nextActionType) payload.nextActionType = f.nextActionType;

  if (isEdit) {
    if (f.closedAt) payload.closedAt = f.closedAt;
    if (f.activityCounts && Object.keys(f.activityCounts).length > 0) {
      payload.activityCounts = f.activityCounts;
    }
    payload.callCount           = Number(f.callCount           ?? 0);
    payload.contactSuccessCount = Number(f.contactSuccessCount ?? 0);
    payload.followupCount       = Number(f.followupCount       ?? 0);
    payload.whatsappSentCount   = Number(f.whatsappSentCount   ?? 0);
    payload.emailSentCount      = Number(f.emailSentCount      ?? 0);
    payload.quoteSentCount      = Number(f.quoteSentCount      ?? 0);
    payload.rescheduleCount     = Number(f.rescheduleCount     ?? 0);
    payload.closureCount        = Number(f.closureCount        ?? 0);
  }

  if (!isEdit) {
    if (assignToUserId) {
      payload.ownerUserId = String(assignToUserId);
    } else if (me?.user?._id) {
      payload.ownerUserId = String(me.user._id);
    }
  }

  return payload;
}
