import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { CATEGORIES } from "../components/Sidebar";

export default function Home() {
  const [designs, setDesigns] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [latest, trend] = await Promise.all([
          api.get("/designs", { params: { sort: "newest", limit: 16 } }),
          api.get("/designs/trending"),
        ]);
        setDesigns(latest.data);
        setTrending(trend.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 left-1/4 w-[500px] h-[500px] hero-blob rounded-full" />
          <div className="absolute top-40 right-10 w-[400px] h-[400px] hero-blob rounded-full" />
        </div>
        <div className="max-w-[1440px] mx-auto px-6 md:px-8 pt-16 md:pt-28 pb-12 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 h-9 rounded-full glass-light text-xs font-medium mb-6 fade-up">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Маркетплейс цифровых ресурсов для дизайнеров
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05] max-w-4xl mx-auto fade-up" data-testid="hero-title">
            Найдите идеальный <br />
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 bg-clip-text text-transparent">
              дизайн-ресурс
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto fade-up" data-testid="hero-subtitle">
            Откройте UI-киты, мокапы, иконки и шаблоны от лучших авторов. Скачивайте, вдохновляйтесь и публикуйте свои работы.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : "/explore");
            }}
            className="mt-10 max-w-2xl mx-auto fade-up"
            data-testid="hero-search-form"
          >
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Введите запрос: «dashboard», «иконки», «мокап iPhone»..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                data-testid="hero-search-input"
                className="w-full h-16 pl-14 pr-36 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-base placeholder:text-neutral-400 soft-shadow"
              />
              <button
                type="submit"
                data-testid="hero-explore-button"
                className="absolute right-2 top-2 bottom-2 px-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                Найти
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Category pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.value}
                to={`/explore?category=${c.value}`}
                data-testid={`hero-cat-${c.value}`}
                className="px-4 h-9 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex items-center"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TRENDING */}
      {trending.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 md:px-8 py-12 md:py-20" data-testid="trending-section">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-500">В тренде</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Популярное сейчас</h2>
            </div>
            <Link to="/trending">
              <Button variant="ghost" className="rounded-full gap-2" data-testid="trending-see-all">
                Смотреть всё <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="masonry">
            {trending.map((d) => (
              <ProductCard key={d.id} design={d} />
            ))}
          </div>
        </section>
      )}

      {/* LATEST */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-8 py-12 md:py-20" data-testid="latest-section">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-violet-500">Новинки</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Свежие публикации</h2>
          </div>
          <Link to="/explore">
            <Button variant="ghost" className="rounded-full gap-2" data-testid="latest-see-all">
              Каталог <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-neutral-500" data-testid="loading-state">Загрузка...</div>
        ) : designs.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl" data-testid="empty-state">
            <h3 className="font-display text-2xl font-semibold">Пока пусто</h3>
            <p className="mt-2 text-neutral-500">Будьте первым, кто опубликует дизайн!</p>
            <Link to="/upload">
              <Button className="mt-6 rounded-full" data-testid="empty-upload-cta">Опубликовать дизайн</Button>
            </Link>
          </div>
        ) : (
          <div className="masonry">
            {designs.map((d) => (
              <ProductCard key={d.id} design={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
