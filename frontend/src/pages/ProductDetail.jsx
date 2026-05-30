import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, Bookmark, ExternalLink, Star, Tag, Edit3, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import ProductCard from "../components/ProductCard";
import EditDesignDialog from "../components/EditDesignDialog";
import { STYLES } from "../components/Sidebar";

const styleLabel = (val) => STYLES.find((s) => s.value === val)?.label || val;

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [related, setRelated] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        api.get(`/designs/${id}`),
        api.get(`/designs/${id}/comments`),
      ]);
      setDesign(d.data);
      setComments(c.data);
      setActiveImg(0);
      const rel = await api.get("/designs", {
        params: { category: d.data.category, sort: "popular", limit: 8 },
      });
      setRelated(rel.data.filter((x) => x.id !== id).slice(0, 6));
    } catch (e) {
      toast.error("Дизайн не найден");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="text-center py-32 text-neutral-500">Загрузка...</div>;
  if (!design) return <div className="text-center py-32">Не найдено</div>;

  const canEdit = user && user !== false && (user.id === design.author?.id || user.role === "admin" || user.role === "moderator");
  const cover = design.images.length ? fileUrl(design.images[activeImg]) : "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200";

  const handleLike = async () => {
    if (!user || user === false) { navigate("/login"); return; }
    const { data } = await api.post(`/designs/${id}/like`);
    setDesign({ ...design, liked_by_me: data.liked, likes_count: design.likes_count + (data.liked ? 1 : -1) });
  };

  const handleSave = async () => {
    if (!user || user === false) { navigate("/login"); return; }
    const { data } = await api.post(`/designs/${id}/favorite`);
    setDesign({ ...design, saved_by_me: data.saved });
    toast.success(data.saved ? "Сохранено" : "Удалено из избранного");
  };

  const handleView = () => {
    if (!design.external_url) {
      toast.error("Автор не указал ссылку");
      return;
    }
    window.open(design.external_url, "_blank", "noopener,noreferrer");
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user || user === false) { navigate("/login"); return; }
    if (!commentText.trim()) return;
    const { data } = await api.post(`/designs/${id}/comments`, { text: commentText });
    setComments([data, ...comments]);
    setCommentText("");
  };

  const handleDelete = async () => {
    if (!window.confirm("Удалить дизайн?")) return;
    await api.delete(`/designs/${id}`);
    toast.success("Удалено");
    navigate("/explore");
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10" data-testid="product-detail-page">
      <div className="grid lg:grid-cols-[1fr_400px] gap-10">
        {/* Gallery */}
        <div>
          <div className="rounded-3xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 soft-shadow">
            <img src={cover} alt={design.title} className="w-full h-auto object-cover" data-testid="design-cover-image" />
          </div>
          {design.images.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-3" data-testid="thumbnail-grid">
              {design.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  data-testid={`thumbnail-${i}`}
                  className={`rounded-2xl overflow-hidden border-2 transition-all ${i === activeImg ? "border-neutral-900 dark:border-white" : "border-transparent"}`}
                >
                  <img src={fileUrl(img)} alt="" className="w-full aspect-square object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
          {design.status !== "approved" && (
            <div className="px-4 py-3 rounded-2xl bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm border border-yellow-200 dark:border-yellow-800" data-testid="status-banner">
              Статус: {design.status === "pending" ? "На модерации" : "Отклонён"}
            </div>
          )}

          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight" data-testid="design-title">{design.title}</h1>
            <div className="mt-3 flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={design.author?.avatar_url || undefined} />
                <AvatarFallback className="bg-neutral-900 text-white dark:bg-white dark:text-black">
                  {(design.author?.name || "?").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm" data-testid="author-name">{design.author?.name}</div>
                <div className="text-xs text-neutral-500 capitalize">{design.author?.role === "admin" ? "Администратор" : design.author?.role === "moderator" ? "Модератор" : "Автор"}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {design.likes_count}</span>
            <span className="flex items-center gap-1"><ExternalLink className="w-4 h-4" /> {design.views_count}</span>
            {design.rating > 0 && (
              <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {design.rating.toFixed(1)}</span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            {design.is_free ? (
              <span className="font-display text-3xl font-bold text-emerald-500">Бесплатно</span>
            ) : (
              <span className="font-display text-3xl font-bold">{Number(design.price).toFixed(0)} ₽</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleView} className="h-12 rounded-full text-base gap-2" data-testid="view-cta">
              <ExternalLink className="w-5 h-5" /> Перейти к дизайну
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleLike} variant="outline" className="flex-1 h-11 rounded-full gap-2" data-testid="like-cta">
                <Heart className={`w-4 h-4 ${design.liked_by_me ? "fill-red-500 text-red-500" : ""}`} /> Лайк
              </Button>
              <Button onClick={handleSave} variant="outline" className="flex-1 h-11 rounded-full gap-2" data-testid="save-cta">
                <Bookmark className={`w-4 h-4 ${design.saved_by_me ? "fill-orange-500 text-orange-500" : ""}`} /> Сохранить
              </Button>
            </div>
            {canEdit && (
              <div className="flex gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 mt-2">
                <Button onClick={() => setEditOpen(true)} variant="ghost" className="flex-1 rounded-full gap-2" data-testid="edit-cta">
                  <Edit3 className="w-4 h-4" /> Редактировать
                </Button>
                <Button onClick={handleDelete} variant="ghost" className="flex-1 rounded-full gap-2 text-red-500 hover:text-red-600" data-testid="delete-cta">
                  <Trash2 className="w-4 h-4" /> Удалить
                </Button>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Описание</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="design-description">{design.description}</p>
          </div>

          {design.external_url && (
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 break-words">
              <div className="text-xs text-neutral-500 mb-1">Источник</div>
              <a
                href={design.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-orange-500 hover:underline break-all"
                data-testid="external-source-link"
              >
                {design.external_url}
              </a>
            </div>
          )}

          {design.tags && design.tags.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Теги</div>
              <div className="flex flex-wrap gap-2">
                {design.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
              <div className="text-xs text-neutral-500">Категория</div>
              <div className="font-medium capitalize">{design.category}</div>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
              <div className="text-xs text-neutral-500">Стили</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(design.styles || []).map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 text-xs font-medium">{styleLabel(s)}</span>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Comments */}
      <section className="mt-16" data-testid="comments-section">
        <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" /> Комментарии ({comments.length})
        </h2>
        {user && user !== false ? (
          <form onSubmit={handleComment} className="mb-6 flex gap-3" data-testid="comment-form">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-neutral-900 text-white dark:bg-white dark:text-black">{user.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex flex-col gap-2">
              <Textarea
                placeholder="Оставьте комментарий..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                data-testid="comment-input"
                className="min-h-[80px] rounded-2xl"
              />
              <div className="flex justify-end">
                <Button type="submit" className="rounded-full" data-testid="comment-submit">Отправить</Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-sm text-neutral-500">
            <Link to="/login" className="font-semibold text-neutral-900 dark:text-white">Войдите</Link>, чтобы оставить комментарий
          </div>
        )}

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3" data-testid={`comment-${c.id}`}>
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={c.author?.avatar_url || undefined} />
                <AvatarFallback className="bg-neutral-200 dark:bg-neutral-800">{c.author?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{c.author?.name}</span>
                  <span className="text-xs text-neutral-500">{new Date(c.created_at).toLocaleDateString("ru-RU")}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="text-center text-neutral-500 py-8">Будьте первым, кто прокомментирует</div>
          )}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16" data-testid="related-section">
          <h2 className="font-display text-2xl font-bold mb-6">Похожие дизайны</h2>
          <div className="masonry">
            {related.map((d) => <ProductCard key={d.id} design={d} />)}
          </div>
        </section>
      )}

      <EditDesignDialog open={editOpen} onClose={() => setEditOpen(false)} design={design} onSaved={load} />
    </div>
  );
}
