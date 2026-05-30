import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: params.get("category") || "all",
    style: params.get("style") || "all",
    price: params.get("price") || "all",
    sort: params.get("sort") || "popular",
  });
  const q = params.get("q") || "";
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const next = new URLSearchParams(params);
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all" && !(k === "sort" && v === "popular")) next.set(k, v);
      else next.delete(k);
    });
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/designs", {
          params: {
            q: q || undefined,
            category: filters.category,
            style: filters.style,
            price: filters.price,
            sort: filters.sort,
            limit: 80,
          },
        });
        setDesigns(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, filters]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10 md:py-14" data-testid="explore-page">
      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight" data-testid="explore-title">
          {q ? `Результаты по «${q}»` : "Каталог дизайнов"}
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          {designs.length} {designs.length === 1 ? "дизайн" : "дизайнов"} найдено
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
            <div className="masonry">
              {designs.map((d) => (
                <ProductCard key={d.id} design={d} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
