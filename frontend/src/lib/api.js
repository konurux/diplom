import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL || "https://diplom-sn76.onrender.com"}/api`,
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

const FILES_API = `${process.env.REACT_APP_BACKEND_URL || "https://diplom-sn76.onrender.com"}/api/files`;

/**
 * URL загруженного файла. width (320 | 640 | 1280) — уменьшенная WebP-копия,
 * которую бэкенд создаёт и кеширует при первом запросе.
 */
export function fileUrl(path, width) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return width ? `${FILES_API}/${path}?w=${width}` : `${FILES_API}/${path}`;
}

/** srcSet для адаптивных картинок (обычные и retina-экраны). */
export function fileSrcSet(path) {
  if (!path || path.startsWith("http")) return undefined;
  return [320, 640, 1280].map((w) => `${fileUrl(path, w)} ${w}w`).join(", ");
}