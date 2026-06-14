import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: "https://diplom-sn76.onrender.com/api",
  withCredentials: true,
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Что-то пошло не так. Попробуйте снова.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function fileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  
  // Вставьте сюда полный адрес вашего бэкенда на Render
  const API = "https://diplom-sn76.onrender.com/api"; 
  
  return `${API}/files/${path}`;
}