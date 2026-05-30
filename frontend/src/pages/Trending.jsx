import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { Flame } from "lucide-react";

export default function Trending() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/designs", { params: { sort: "popular", limit: 80 } });
        setDesigns(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10 md:py-14" data-testid="trending-page">
      <div className="mb-10 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-orange-500 grid place-items-center text-white">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">В тренде</h1>
          <p className="mt-1 text-neutral-500">Самые популярные работы сообщества</p>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-20 text-neutral-500">Загрузка...</div>
      ) : designs.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl">
          <h3 className="font-display text-2xl font-semibold">Пока тихо</h3>
          <p className="mt-2 text-neutral-500">Когда появятся первые публикации — они окажутся здесь.</p>
        </div>
      ) : (
        <div className="masonry">
          {designs.map((d) => <ProductCard key={d.id} design={d} />)}
        </div>
      )}
    </div>
  );
}
