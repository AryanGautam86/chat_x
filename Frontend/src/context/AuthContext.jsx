import { useCallback, useEffect, useState } from "react";

import API, { setAuthToken, onUnauthorized } from "../api/api";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "chat_x.auth.token";
const USER_KEY = "chat_x.auth.user";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  // Starts true only when there is a stored token to validate, so a first-time
  // visitor reaches /login with no loading flash.
  const [checking, setChecking] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY))
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const signIn = useCallback(({ access_token, user: nextUser }) => {
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setAuthToken(access_token);
    setToken(access_token);
    setUser(nextUser);
  }, []);

  // Keep axios and the 401 handler in step with the token.
  useEffect(() => {
    setAuthToken(token);
    onUnauthorized(signOut);
  }, [token, signOut]);

  // Validate a token restored from a previous visit: it may have expired, or
  // the account may be gone.
  useEffect(() => {
    if (!token) return; // `checking` is already false in this case.

    let cancelled = false;
    setAuthToken(token);

    API.get("/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      })
      .catch((err) => {
        if (cancelled) return;
        // Only a rejected token means signed-out; a network blip should not
        // throw away a valid session.
        if (err.response?.status === 401) signOut();
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, signOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        checking,
        isAuthenticated: Boolean(token && user),
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
