import { useQuery } from '@tanstack/react-query';
import BusinessUnits from '../services/BusinessUnits.js';

const EMPTY_SCHEMA = { leadSchema: [], activityTypes: [], pipelineStages: [] };

const useBusinessUnitSchema = (buId) => {
  return useQuery({
    queryKey: ['bu-schema', buId],
    queryFn: () => BusinessUnits.getSchema(buId),
    enabled: Boolean(buId),
    refetchOnWindowFocus: false,
    retry: 1,
    select: (res) => res?.data ?? EMPTY_SCHEMA,
  });
};

export default useBusinessUnitSchema;
