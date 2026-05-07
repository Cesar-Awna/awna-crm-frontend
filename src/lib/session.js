export function getStoredSession() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.data?.session ?? data?.session ?? null;
  } catch {
    return null;
  }
}

export function getStoredRole() {
  return getStoredSession()?.roleName?.toUpperCase() ?? null;
}

export function getStoredToken() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.data?.accessToken ?? data?.accessToken ?? null;
  } catch {
    return null;
  }
}
