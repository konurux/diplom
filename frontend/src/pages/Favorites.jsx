import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark } from "@/components/icons";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import Masonry from "../components/Masonry";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";

export default function Favorites() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/favorites");
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user === false) {
      navigate("/login");
      return;
    }
    refresh();
  }, [user, authLoading, navigate]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10 md:py-14" data-testid="favorites-page">
      <div className="mb-10 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand grid place-items-center">
          <Bookmark weight="duotone" className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Мудборд</h1>
          <p className="mt-1 text-neutral-500">Референсы и работы, которые вас вдохновили</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-neutral-500">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl">
          <h3 className="font-display text-2xl font-semibold">Пока ничего не сохранено</h3>
          <p className="mt-2 text-neutral-500">Сохраняйте работы, которые вдохновляют, — так растёт насмотренность.</p>
          <Link to="/explore"><Button className="mt-6 rounded-full">Открыть галерею</Button></Link>
        </div>
      ) : (
        <Masonry items={items} renderItem={(d) => <ProductCard design={d} onChange={refresh} />} />
      )}
    </div>
  );
}
