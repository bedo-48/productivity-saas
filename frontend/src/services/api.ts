import axios from "axios";

// ✅ création de l'instance axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});


// ==============================
// ✅ REQUEST INTERCEPTOR
// ajoute automatiquement le token
// ==============================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


// ==============================
// ✅ RESPONSE INTERCEPTOR
// logout automatique si token invalide
// ==============================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token expiré ou invalide
      localStorage.removeItem("token");

      // redirection vers login
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;