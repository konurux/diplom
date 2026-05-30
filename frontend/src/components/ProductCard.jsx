import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Bookmark, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import { fileUrl, api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&q=80",
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80",
];

export default function ProductCard({ design, onChange }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = useState(!!design.liked_by_me);
  const [saved, setSaved] = useState(!!design.saved_by_me);
  const [likeCount, setLikeCount] = useState(design.likes_count || 0);

  const cover = design.images && design.images.length > 0 ? fileUrl(design.images[0]) : PLACEHOLDERS[design.id?.charCodeAt(0) % 2 || 0];

  const requireAuth = () => {
    if (!user || user === false) {
      toast.error("Войдите, чтобы продолжить");
      navigate("/login");
      return false;
    }
    return true;
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!requireAuth()) return;
    try {
      const { data } = await api.post(`/designs/${design.id}/like`);
      setLiked(data.liked);
      setLikeCount((c) => c + (data.liked ? 1 : -1));
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!requireAuth()) return;
    try {
      const { data } = await api.post(`/designs/${design.id}/favorite`);
      setSaved(data.saved);
      toast.success(data.saved ? "Добавлено в избранное" : "Удалено из избранного");
      if (onChange) onChange();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const handleView = (e) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/design/${design.id}`);
  };

  return (
    <Link
      to={`/design/${design.id}`}
      data-testid={`product-card-${design.id}`}
      className="group block card-hover relative overflow-hidden rounded-xl bg-white dark:bg-neutral-900 soft-shadow border border-neutral-100 dark:border-neutral-800"
    >
      <div className="relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        <img
          src={cover}
          alt={design.title}
          className="card-img w-full h-auto object-cover"
          loading="lazy"
          onError={(e) => { e.target.src = PLACEHOLDERS[0]; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={handleSave}
            data-testid={`save-button-${design.id}`}
            aria-label="Сохранить"
            className="w-8 h-8 grid place-items-center rounded-full glass-light hover:bg-white dark:hover:bg-black transition-colors opacity-0 group-hover:opacity-100"
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current text-orange-500" : ""}`} />
          </button>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <button
            onClick={handleLike}
            data-testid={`like-button-${design.id}`}
            className="flex items-center gap-1 px-2.5 h-8 rounded-full glass-light text-xs font-medium"
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            {likeCount}
          </button>
          <button
            onClick={handleView}
            data-testid={`view-button-${design.id}`}
            className="flex items-center gap-1 px-2.5 h-8 rounded-full bg-white text-black hover:bg-neutral-100 text-xs font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Просмотр
          </button>
        </div>

        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${design.is_free ? "bg-emerald-500 text-white" : "bg-white text-black"}`}>
            {design.is_free ? "Бесплатно" : `${Number(design.price).toFixed(0)} ₽`}
          </span>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-display font-semibold text-sm truncate group-hover:text-orange-500 transition-colors">
          {design.title}
        </h3>
        <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span className="truncate">{design.author?.name || "Аноним"}</span>
          <span className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {likeCount}</span>
            {design.rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {Number(design.rating).toFixed(1)}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
