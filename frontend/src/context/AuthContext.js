import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Incarca userul din token la pornire
  useEffect(() => {
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
