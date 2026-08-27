import LeadsService from '../services/Leads.js';

const CHUNK = 300;

const fmt = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const dd = String(x.getDate()).padStart(2, '0');
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const yy = String(x.getFullYear()).slice(-2);
  const hh = String(x.getHours()).padStart(2, '0');
  const mi = String(x.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yy} ${hh}:${mi}`;
};

// Devuelve { [leadId]: "dd-mm-yy HH:mm — texto | dd-mm-yy HH:mm — texto" } en una sola línea por lead.
// Nunca lanza: ante cualquier error devuelve {} para no bloquear la exportación.
export const fetchHitosColumn = async (leads) => {
  const ids = (leads || []).map((l) => String(l._id)).filter(Boolean);
  const result = {};
  try {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const res = await LeadsService.getNotesBulk(ids.slice(i, i + CHUNK));
      const data = res?.success ? (res.data || {}) : {};
      for (const [leadId, notes] of Object.entries(data)) {
        result[leadId] = (notes || [])
          .map((n) => `${fmt(n.at)} — ${String(n.note || '').replace(/\s*[\r\n]+\s*/g, ' ').trim()}`)
          .join(' | ');
      }
    }
  } catch (e) {
    console.error('Error cargando hitos para exportar:', e);
  }
  return result;
};
