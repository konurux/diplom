import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Eye, LayoutGrid, Link2 } from "@/components/icons";
import { toast } from "sonner";
import { api, fileUrl } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";

export default function Portfolio() {
  const { id } = useParams();
  const { user } = useAuth();
  const [author, setAuthor] = useState(null);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const [a, w] = await Promise.all([
          api.get(`/users/${id}`),
          api.get("/designs", { params: { author_id: id, sort: "newest", limit: 100 } }),
        ]);
        setAuthor(a.data);
        setWorks(w.data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="text-center py-20 text-neutral-500">Загрузка...</div>;
  if (notFound || !author) {
    return (
      <div className="text-center py-24">
        <h1 className="font-display text-3xl font-bold">Автор не найден</h1>
        <Link to="/explore"><Button className="mt-6 rounded-full">В галерею</Button></Link>
      </div>
    );
  }

  const isMe = user && user.id === author.id;
  const initial = (author.name || "?").charAt(0).toUpperCase();
  const since = author.created_at ? new Date(author.created_at).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Ссылка на портфолио скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10 md:py-14" data-testid="portfolio-page">
      <div className="flex flex-col items-center text-center mb-12">
        {author.avatar_url ? (
          <img src={fileUrl(author.avatar_url)} alt={author.name} className="w-28 h-28 rounded-full object-cover" />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand to-brand-2 grid place-items-center text-white font-display font-bold text-4xl">
            {initial}
          </div>
        )}
        <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand">Портфолио</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-1">{author.name}</h1>
        {author.bio && <p className="mt-3 text-neutral-600 dark:text-neutral-300 max-w-2xl">{author.bio}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-5 text-sm text-neutral-500">
          <span className="flex items-center gap-1.5"><LayoutGrid className="w-4 h-4" /><b className="text-neutral-900 dark:text-white">{author.designs_count}</b> работ</span>
          <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" /><b className="text-neutral-900 dark:text-white">{author.likes_total}</b> лайков</span>
          <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /><b className="text-neutral-900 dark:text-white">{author.views_total}</b> просмотров</span>
        </div>
        {since && <div className="mt-2 text-xs text-neutral-400">На платформе с {since}</div>}
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={copyLink}><Link2 className="w-4 h-4 mr-2" />Поделиться</Button>
          {isMe && <Link to="/profile"><Button className="rounded-full">Управлять портфолио</Button></Link>}
        </div>
      </div>

      {works.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl">
          <h3 className="font-display text-2xl font-semibold">Опубликованных работ пока нет</h3>
          <p className="mt-2 text-neutral-500">Работы появятся здесь после модерации.</p>
        </div>
      ) : (
        <div className="masonry">
          {works.map((d) => <ProductCard key={d.id} design={d} />)}
        </div>
      )}
    </div>
  );
}
