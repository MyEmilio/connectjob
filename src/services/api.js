import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Adauga token-ul JWT la fiecare request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect la login daca token expirat
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("jc_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
