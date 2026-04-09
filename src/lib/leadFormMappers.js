/** Mapea documento API (metadata.fieldKey) a registro por campo del formulario. */
export function indexDocumentsByFieldKey(documents) {
  const map = {};
  if (!Array.isArray(documents)) return map;
  for (const doc of documents) {
    const key = doc?.metadata?.fieldKey;
    if (!key) continue;
    const prev = map[key];
    const tNew = doc?.createdAt ? new Date(doc.createdAt).getTime() : 0;
    const tOld = prev?.createdAt ? new Date(prev.createdAt).getTime() : 0;
    if (!prev || tNew >= tOld) map[key] = doc;
  }
  return map;
}

/** Lead de API → estado del formulario NewLead / EditLead */
export function mapApiLeadToFormState(lead) {
  if (!lead) return null;

  let segment = '';
  if (lead.segment === 'PEQUENA') segment = 'MICRO';
  else if (lead.segment === 'GRANDE') segment = 'GRANDE_1';
  else if (lead.segment === 'MICRO') segment = 'MICRO';
  else if (lead.segment) segment = lead.segment;

  let claroSegment = '';
  if (lead.claroSegment === 'GRANDE') claroSegment = 'GRANDE_1';
  else if (lead.claroSegment === 'MICRO') claroSegment = 'MICRO';
  else if (lead.claroSegment) claroSegment = lead.claroSegment;

  const quoteDate = lead.quoteDate ? new Date(lead.quoteDate).toISOString().slice(0, 10) : '';
  const activationDate = lead.activationDate
    ? new Date(lead.activationDate).toISOString().slice(0, 10)
    : '';

  const status = lead.status || 'OPEN';
  const substatusOpen =
    lead.status === 'OPEN' &&
    (lead.openSubstatus === 'EN_NEGOCIACION' || lead.openSubstatus === 'OPORTUNIDAD')
      ? lead.openSubstatus
      : 'OPORTUNIDAD';

  return {
    status,
    substatusOpen,
    wonSaleClosed: !!lead.wonSaleClosed || lead.openSubstatus === 'EN_REVISION',
    clientName: lead.clientName || '',
    clientRut: lead.clientRut || '',
    segment,
    quoteDate,
    activationDate,
    sigloFolio: lead.sigloFolio || '',
    mobile: !!lead.mobileEnabled,
    fixed: !!lead.fixedEnabled,
    mobileType: lead.mobileType || '',
    mobileLines: lead.mobileLines != null ? String(lead.mobileLines) : '',
    mobileDonor: lead.donorCompany || '',
    fixedPack: lead.fixedPack || '',
    fixedDuo: Array.isArray(lead.fixedDuoProducts) ? [...lead.fixedDuoProducts] : [],
    fixedSingle: lead.fixedSingle || '',
    fixedCommune: lead.fixedCommune || '',
    fixedAddress: lead.fixedAddress || '',
    fixedMap: lead.fixedMap || '',
    risk: lead.riskGrade || '',
    protesto: lead.riskHasProtesto === 'SI' ? 'SI' : 'NO',
    dicomTotal: lead.riskDicomTotal != null ? String(lead.riskDicomTotal) : '',
    dicomTelco: lead.riskDicomTelco != null ? String(lead.riskDicomTelco) : '',
    deudaClaro: lead.riskDeudaClaro != null ? String(lead.riskDeudaClaro) : '',
    claroSegment,
    lostObservation: status === 'LOST' ? (lead.lostReason || '') : '',
  };
}

/**
 * Estado formulario → cuerpo API (create / update).
 * En update no enviamos source ni ownerUserId (se conservan en servidor).
 */
export function buildLeadPayload(f, options) {
  const {
    currentStageId,
    me,
    supervisor,
    canEditActivationDate,
    isEdit = false,
  } = options;

  const payload = {
    status: f.status,
    currentStageId: currentStageId || undefined,
    clientName: f.clientName.trim(),
    clientRut: f.clientRut.trim(),
    segment: f.segment === 'MICRO' ? 'PEQUENA' : f.segment === 'GRANDE_1' ? 'GRANDE' : f.segment,
    product: f.fixed ? 'FIBRA_OPTICA' : 'PLANES_MOVILES',
    donorCompany: f.mobile ? f.mobileDonor : undefined,
    quoteDate: f.quoteDate ? new Date(f.quoteDate).toISOString() : undefined,
    activationDate: canEditActivationDate && f.activationDate ? new Date(f.activationDate).toISOString() : undefined,
    sigloFolio: f.sigloFolio || undefined,
    altasCount: f.mobile && f.mobileType === 'HABILITACION' ? Number(f.mobileLines) : undefined,
    postpagoPortas: f.mobile && f.mobileType === 'PORTABILIDAD' ? Number(f.mobileLines) : undefined,
    openSubstatus: f.status === 'OPEN' ? f.substatusOpen : f.status === 'WON' ? 'EN_REVISION' : undefined,
    wonSaleClosed: f.status === 'WON' ? !!f.wonSaleClosed : false,
    mobileEnabled: !!f.mobile,
    fixedEnabled: !!f.fixed,
    mobileType: f.mobile ? f.mobileType : undefined,
    mobileLines: f.mobile ? Number(f.mobileLines) : undefined,
    fixedPack: f.fixed ? f.fixedPack : undefined,
    fixedDuoProducts: f.fixed ? f.fixedDuo : undefined,
    fixedSingle: f.fixed ? f.fixedSingle : undefined,
    fixedCommune: f.fixed ? f.fixedCommune : undefined,
    fixedAddress: f.fixed ? f.fixedAddress : undefined,
    fixedMap: f.fixed ? f.fixedMap : undefined,
    riskGrade: f.risk || undefined,
    riskHasProtesto: f.protesto || undefined,
    riskDicomTotal: f.dicomTotal === '' ? undefined : Number(f.dicomTotal),
    riskDicomTelco: f.dicomTelco === '' ? undefined : Number(f.dicomTelco),
    riskDeudaClaro: f.deudaClaro === '' ? undefined : Number(f.deudaClaro),
    claroSegment: f.claroSegment || undefined,
    observation: JSON.stringify({ ...f, summary: isEdit ? 'FORM CALL CENTER EDIT' : 'FORM CALL CENTER UI' }, null, 2),
    lostReason: f.status === 'LOST' ? f.lostObservation : undefined,
    supervisorUserId: supervisor?._id ? String(supervisor._id) : undefined,
  };

  if (!isEdit) {
    payload.source = 'MANUAL';
    if (me?.user?._id) payload.ownerUserId = String(me.user._id);
  }

  return payload;
}
