// sidebar/ui/api.v2.js
export const API_BASE = "https://api.mel-demandscraper.com/api";
export const WEBAPP_LOGIN_URL = "https://app.mel-demandscraper.com/login";
export const ME_URL = `${API_BASE}/extension/auth/validate`;
export const SAVE_CONTACT_URL = `${API_BASE}/extension/linkedin/profile/save-db`;
export const SAVE_COMPANY_URL = `${API_BASE}/extension/linkedin/company/save-db`;
export const CHECK_COMPANY_FRESHNESS_URL = `${API_BASE}/extension/linkedin/company/check-freshness`;

// Fetch Logged in User
export async function fetchMeWithToken(token) {
  const res = await fetch(ME_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || "Unable to validate token");
  }

  return data;
}

// Call Save Contact API
export async function saveContactToDb(payload, token) {
  const res = await fetch(SAVE_CONTACT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Save failed (${res.status})`);
  }

  return data;
}

export async function saveCompanyToDb(payload, token) {
  const res = await fetch(SAVE_COMPANY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Save failed (${res.status})`);
  }

  return data;
}

export async function checkCompanyInDb(payload, token) {
  const res = await fetch(CHECK_COMPANY_FRESHNESS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Company check failed (${res.status})`);
  }

  return data;
}