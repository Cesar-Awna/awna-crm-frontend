import axios from 'axios';

const createInstance = (baseURL) => {
  const instance = axios.create({
    headers: { 'Content-Type': 'application/json' },
    baseURL,
  });

  instance.interceptors.request.use(
    (config) => {
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const stored = JSON.parse(raw);
          const token = stored?.accessToken || stored?.data?.accessToken || stored?.data?.session?.accessToken;
          const session = stored?.data?.session || stored?.session || stored;

          config.headers = config.headers || {};

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }

          // Send business unit ID for executives/supervisors
          const businessUnitIds = session?.businessUnitIds || stored?.businessUnitIds;
          if (Array.isArray(businessUnitIds) && businessUnitIds.length > 0) {
            config.headers['x-business-unit-id'] = businessUnitIds[0];
          }

          // COMPANY_ADMIN has empty businessUnitIds — use the BU switcher selection
          if (!config.headers['x-business-unit-id']) {
            const activeBuId = localStorage.getItem('activeBuId');
            if (activeBuId) config.headers['x-business-unit-id'] = activeBuId;
          }
        }
      } catch {
        // ignore parse errors
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (res) => res.data,
    (error) => {
      throw error;
    }
  );

  return instance;
};

export default createInstance;


