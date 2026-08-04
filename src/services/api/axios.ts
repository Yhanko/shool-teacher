import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});

// Inject the JWT token on every request
api.interceptors.request.use((config) => {
  const token = Cookies.get("yhanko_teacher_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → auto logout
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      Cookies.remove("yhanko_teacher_token", { path: '/' });
      Cookies.remove("yhanko_teacher_user", { path: '/' });
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
export { AxiosError };