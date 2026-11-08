import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";
import Masonry from "../components/Masonry";
import useInfiniteDesigns from "../hooks/useInfiniteDesigns";
import { Button } from "../components/ui/button";

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: params.get("category") || "all",
    style: params.get("style") || "all",
    sort: params.get("sort") || "popular",
  });
  const q = params.get("q") || "";
  const query = useMemo(
    () => ({ q: q || undefined, category: filters.category, style: filters.style, sort: filters.sort }),
    [q, filters]
  );
  const { items: designs, total, loading, loadingMore, hasMore, sentinelRef } = useInfiniteDesigns(query);
  const count = total ?? designs.length;

  useEffect(() => {
    const next = new URLSearchParams(params);
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all" && !(k === "sort" && v === "popular")) next.set(k, v);
      else next.delete(k);
    });
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);


  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10 md:py-14" data-testid="explore-page">
      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight" data-testid="explore-title">
          {q ? `Результаты по «${q}»` : "Галерея вдохновения"}
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          {loading ? "Загрузка…" : `${count} ${plural(count, "работа", "работы", "работ")}`}
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8 lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Sidebar filters={filters} onChange={setFilters} />
        </div>
        <div>
          {loading ? (
            <div className="text-center py-20 text-neutral-500" data-testid="loading-state">Загрузка...</div>
          ) : designs.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl" data-testid="empty-state">
              <h3 className="font-display text-2xl font-semibold">Ничего не найдено</h3>
              <p className="mt-2 text-neutral-500">Попробуйте изменить фильтры или поисковый запрос.</p>
              <Link to="/upload"><Button className="mt-6 rounded-full">Опубликовать первый дизайн</Button></Link>
            </div>
          ) : (
            <>
              <Masonry items={designs} renderItem={(d) => <ProductCard design={d} />} />
              <div ref={sentinelRef} aria-hidden="true" />
              <div className="py-10 text-center text-sm text-neutral-500" data-testid="list-footer">
                {loadingMore ? "Загружаем ещё…" : !hasMore && designs.length > 12 ? "Вы посмотрели всё — загляните позже за новыми работами" : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
