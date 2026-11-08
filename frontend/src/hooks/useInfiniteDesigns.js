import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

/**
 * Постраничная загрузка /designs с подгрузкой при прокрутке.
 * params — фильтры запроса; при их изменении список загружается заново.
 * Возвращает sentinelRef: повесьте его на элемент в конце списка.
 */
export default function useInfiniteDesigns(params, { pageSize = 24, enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const key = JSON.stringify(params);
  const state = useRef({ key, skip: 0, done: false, busy: false });
  const sentinelRef = useRef(null);

  const fetchPage = useCallback(async (reset) => {
    const s = state.current;
    if (s.busy || (!reset && s.done)) return;
    s.busy = true;
    const requestKey = s.key;
    const skip = reset ? 0 : s.skip;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await api.get("/designs", { params: { ...JSON.parse(requestKey), limit: pageSize, skip } });
      if (state.current.key !== requestKey) return; // фильтры поменялись, ответ устарел
      const page = res.data;
      const totalHeader = Number(res.headers["x-total-count"]);
      const nextTotal = Number.isFinite(totalHeader) ? totalHeader : null;
      s.skip = skip + page.length;
      s.done = page.length < pageSize || (nextTotal !== null && s.skip >= nextTotal);
      setItems((prev) => (reset ? page : [...prev, ...page.filter((d) => !prev.some((p) => p.id === d.id))]));
      setTotal(nextTotal);
      setError(null);
    } catch (e) {
      if (state.current.key === requestKey) setError(e);
    } finally {
      if (state.current.key === requestKey) {
        s.busy = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [pageSize]);

  // Первая страница — при монтировании и смене фильтров
  useEffect(() => {
    if (!enabled) return;
    state.current = { key, skip: 0, done: false, busy: false };
    setItems([]);
    setTotal(null);
    fetchPage(true);
  }, [key, enabled, fetchPage]);

  // Подгрузка, когда низ списка появляется в зоне видимости
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !enabled) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchPage(false);
    }, { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [fetchPage, enabled, loading]);

  const hasMore = !state.current.done;
  const reload = useCallback(() => {
    state.current = { key: state.current.key, skip: 0, done: false, busy: false };
    fetchPage(true);
  }, [fetchPage]);

  return { items, total, loading, loadingMore, hasMore, error, sentinelRef, reload, loadMore: () => fetchPage(false) };
}
