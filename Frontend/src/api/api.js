import axios from "axios";

// In production the API is served from the same origin as this bundle, so a
// relative baseURL is correct. Local dev points at the uvicorn port; override
// either case with VITE_API_URL (see .env.example).
const baseURL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const API = axios.create({ baseURL });

let authToken = null;
let unauthorizedHandler = null;

/** Set (or clear) the bearer token sent with every subsequent request. */
export function setAuthToken(token) {
  authToken = token || null;
}

/** Register the callback fired when the server rejects our token. */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

API.interceptors.request.use((cfg) => {
  if (authToken) {
    cfg.headers.Authorization = `Bearer ${authToken}`;
  }
  return cfg;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    // A 401 from a protected route means the session is over. Sign-in attempts
    // legitimately return 401 for a wrong password, so they are excluded — the
    // login form shows that message itself.
    if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/google")) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  }
);

export default API;
