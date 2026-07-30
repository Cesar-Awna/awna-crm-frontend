import axios from 'axios';

const createInstance = (baseURL) => {
  const instance = axios.create({
    headers: { 'Content-Type': 'application/json' },
    baseURL,
  });

  // ── Request: attach token + BU header ────────────────────────────────────
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

          const businessUnitIds = session?.businessUnitIds || stored?.businessUnitIds;
          // Only auto-set header when user has exactly one BU.
          // Multi-BU supervisors omit the header so the backend resolves scope
          // using { $in: [...all their BUs] } automatically.
          if (Array.isArray(businessUnitIds) && businessUnitIds.length === 1) {
            config.headers['x-business-unit-id'] = businessUnitIds[0];
          }

          if (!config.headers['x-business-unit-id'] && Array.isArray(businessUnitIds) && businessUnitIds.length <= 1) {
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

  // ── Response: auto-refresh on 401 ────────────────────────────────────────
  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
    failedQueue = [];
  };

  const redirectToLogin = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('activeBuId');
    window.location.href = '/login';
  };

  instance.interceptors.response.use(
    (res) => res.data,
    (error) => {
      const originalRequest = error.config;

      // Only handle 401; skip if already retried or if this is the refresh call itself
      if (
        error.response?.status !== 401 ||
        originalRequest._retry ||
        originalRequest.url?.includes('/api/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return instance(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        try {
          const raw = localStorage.getItem('user');
          if (!raw) { redirectToLogin(); return reject(error); }

          const stored = JSON.parse(raw);
          const refreshToken =
            stored?.data?.refreshToken ||
            stored?.refreshToken ||
            stored?.data?.session?.refreshToken;

          if (!refreshToken) { redirectToLogin(); return reject(error); }

          axios
            .post(`${baseURL}/api/auth/refresh`, { refreshToken })
            .then((res) => {
              const newToken = res.data?.data?.accessToken;
              if (!newToken) throw new Error('No token in refresh response');

              // Update stored token
              if (stored.data) stored.data.accessToken = newToken;
              else stored.accessToken = newToken;
              localStorage.setItem('user', JSON.stringify(stored));

              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              processQueue(null, newToken);
              resolve(instance(originalRequest));
            })
            .catch((refreshErr) => {
              processQueue(refreshErr, null);
              redirectToLogin();
              reject(refreshErr);
            })
            .finally(() => {
              isRefreshing = false;
            });
        } catch {
          isRefreshing = false;
          redirectToLogin();
          reject(error);
        }
      });
    }
  );

  return instance;
};

export default createInstance;
