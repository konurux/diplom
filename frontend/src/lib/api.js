import axios from "axios";

const RENDER_URL = "https://diplom-sn76.onrender.com";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || RENDER_URL;
const IS_LOCAL = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

/**
 * В продакшене API идёт через тот же домен (/api проксируется Vercel на Render,
 * см. vercel.json). Так cookie входа становятся «своими» для сайта и браузеры
 * (Safari, Chrome в инкогнито) их не блокируют. Локально — напрямую на бэкенд.
 */
export const API = IS_LOCAL ? `${BACKEND_URL}/api` : "/api";

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Access-токен живёт 12 часов: при 401 один раз обновляем его по refresh-cookie
// и повторяем запрос, чтобы пользователя не выбрасывало из аккаунта.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const cfg = error.config;
    const url = cfg?.url || "";
    if (error.response?.status !== 401 || !cfg || cfg._retried || /\/auth\/(login|register|refresh|logout)/.test(url)) {
      return Promise.reject(error);
    }
    cfg._retried = true;
    try {
      refreshing = refreshing || api.post("/auth/refresh").finally(() => { refreshing = null; });
      await refreshing;
    } catch {
      return Promise.reject(error);
    }
    return api(cfg);
  }
);

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

// Картинки грузим напрямую с бэкенда: им не нужны cookie, а прокси лишь добавил бы задержку.
const FILES_API = `${BACKEND_URL}/api/files`;

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