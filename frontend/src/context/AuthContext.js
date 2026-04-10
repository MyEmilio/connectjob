import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Incarca userul din token la pornire
  // CRITICAL: If returning from OAuth callback, skip the /me check.
  // AuthCallback will exchange the session_id and establish the session first.
  useEffect(() => {
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("jc_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then(res => { setUser(res.data); connectSocket(token); })
      .catch(() => localStorage.removeItem("jc_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("jc_token", res.data.token);
    setUser(res.data.user);
    connectSocket(res.data.token);
    return res.data;
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    const res = await api.post("/auth/register", { name, email, password, role });
    localStorage.setItem("jc_token", res.data.token);
    setUser(res.data.user);
    connectSocket(res.data.token);
    return res.data;
  }, []);

  // Emergent Auth — exchange session_id for JWT
  const loginWithGoogleSession = useCallback(async (sessionId) => {
    const res = await api.post("/auth/google/session", { session_id: sessionId });
    localStorage.setItem("jc_token", res.data.token);
    setUser(res.data.user);
    connectSocket(res.data.token);
    return res.data;
  }, []);

  // Legacy Google OAuth (credential-based)
  const loginWithGoogle = useCallback(async (credential) => {
    const res = await api.post("/auth/google", { credential });
    localStorage.setItem("jc_token", res.data.token);
    setUser(res.data.user);
    connectSocket(res.data.token);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("jc_token");
    setUser(null);
    disconnectSocket();
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get("/auth/me");
    setUser(res.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, loginWithGoogleSession, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
