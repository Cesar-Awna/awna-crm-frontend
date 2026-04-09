import { useQuery } from '@tanstack/react-query';
import Status from '../services/Status.js';

const useStatus = () => {
  return useQuery({
    queryKey: ['status'],
    queryFn: () => Status.getStatus(),
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export default useStatus;

