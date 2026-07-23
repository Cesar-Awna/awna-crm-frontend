import { useState, useEffect } from 'react';
import BusinessUnitsService from '../services/BusinessUnits.js';
import { getStoredSession } from '../lib/session.js';
import { useBU } from '../contexts/BUContext.jsx';

// Module-level cache: buId → schema data. Persists across re-renders and
// component mounts so the same BU schema is never fetched twice per session.
const schemaCache = {};

/**
 * Returns the schema (activityTypes, pipelineStages, leadSchema) for the
 * currently active business unit.
 *
 * - For executives/supervisors: reads businessUnitIds[0] from session.
 * - For COMPANY_ADMIN: reads activeBuId from BUContext (the sidebar switcher).
 * - Results are cached by BU ID — no duplicate requests.
 */
const useBUSchema = () => {
  const { activeBuId } = useBU();
  const session = getStoredSession();
  // Admin uses the switcher selection; everyone else uses their session BU.
  const buId = activeBuId || session?.businessUnitIds?.[0] || '';

  const [schema, setSchema] = useState({
    activityTypes:  [],
    pipelineStages: [],
    leadSchema:     [],
    loading:        true,
  });

  useEffect(() => {
    if (!buId) {
      setSchema((s) => ({ ...s, loading: false }));
      return;
    }

    if (schemaCache[buId]) {
      setSchema({ ...schemaCache[buId], loading: false });
      return;
    }

    let cancelled = false;
    BusinessUnitsService.getSchema(buId)
      .then((res) => {
        if (cancelled || !res?.success) return;
        const data = {
          activityTypes:  res.data.activityTypes  || [],
          pipelineStages: res.data.pipelineStages || [],
          leadSchema:     res.data.leadSchema      || [],
        };
        schemaCache[buId] = data;
        setSchema({ ...data, loading: false });
      })
      .catch(() => {
        if (!cancelled) setSchema((s) => ({ ...s, loading: false }));
      });

    return () => { cancelled = true; };
  }, [buId]);

  return schema;
};

export default useBUSchema;
