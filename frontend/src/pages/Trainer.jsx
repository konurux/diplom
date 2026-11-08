import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Target, CheckCircle2, Sparkles, Eye } from "@/components/icons";
import { toast } from "sonner";
import { api, fileUrl, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { CATEGORIES } from "../components/Sidebar";
import { Button } from "../components/ui/button";

const RESULT_TEXT = {
  agreed: {
    title: "Совпало с большинством",
    text: "Ваш выбор совпал с мнением других дизайнеров.",
    className: "bg-lime text-neutral-950",
  },
  disagreed: {
    title: "Большинство выбрало другую работу",
    text: "Сравните внимательнее: композиция, типографика, цвет, читаемость.",
    className: "bg-neutral-900 text-white dark:bg-neutral-800",
  },
  first: {
    title: "Вы первым оценили эту пару",
    text: "Мнение большинства появится, когда проголосуют другие.",
    className: "bg-brand text-white",
  },
};

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function Choice({ design, side, result, onPick, disabled }) {
  const chosen = result?.choice === design.id;
  const share = result ? percent(result.votes[design.id] || 0, result.total_votes) : null;
  const cover = design.images?.[0];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onPick(design.id)}
        disabled={disabled}
        data-testid={`trainer-choice-${side}`}
        aria-label={result ? `${design.title}: ${share}% голосов` : `Выбрать работу ${side === "left" ? "слева" : "справа"}`}
        className={`group relative block w-full aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900 border transition-all ${
          chosen
            ? "border-brand ring-4 ring-brand/30"
            : "border-neutral-200 dark:border-neutral-800 enabled:hover:border-brand enabled:hover:-translate-y-1"
        } disabled:cursor-default`}
      >
        {cover && (
          <img
            src={fileUrl(cover, 1280)}
            alt={result ? design.title : "Работа для сравнения"}
            className="absolute inset-0 w-full h-full object-contain"
            decoding="async"
          />
        )}
        {!result && (
          <span className="absolute top-3 left-3 grid place-items-center w-9 h-9 rounded-full glass-light text-sm font-semibold">
            {side === "left" ? "1" : "2"}
          </span>
        )}
        {result && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 via-black/40 to-transparent text-white text-left">
            <div className="flex items-end justify-between gap-3">
              <span className="font-display text-4xl md:text-5xl font-bold tabular-nums">{share}%</span>
              {chosen && (
                <span className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-white text-neutral-950 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-brand" weight="fill" />
                  Ваш выбор
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${share}%` }} />
            </div>
          </div>
        )}
      </button>
      <div className="min-h-[44px]">
        {result ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display font-semibold truncate">{design.title}</div>
              <div className="text-sm text-neutral-500 truncate">{design.author?.name || "Аноним"}</div>
            </div>
            <Link to={`/design/${design.id}`} className="shrink-0 text-sm text-brand hover:underline flex items-center gap-1">
              <Eye className="w-4 h-4" />Открыть
            </Link>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Автор и название откроются после выбора</div>
        )}
      </div>
    </div>
  );
}

export default function Trainer() {
  const { user, loading: authLoading } = useAuth();
  const [category, setCategory] = useState("all");
  const [pair, setPair] = useState(null);
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [emptyText, setEmptyText] = useState(null);

  const loadPair = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setEmptyText(null);
    try {
      const { data } = await api.get("/trainer/pair", { params: { category } });
      setPair(data.pair);
      setStats(data.stats);
    } catch (err) {
      setPair(null);
      if (err.response?.status === 404) setEmptyText(formatApiErrorDetail(err.response.data?.detail));
      else toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    if (user) loadPair();
  }, [user, loadPair]);

  const vote = useCallback(async (winnerId) => {
    if (!pair || result || voting) return;
    const loser = pair.find((d) => d.id !== winnerId);
    setVoting(true);
    try {
      const { data } = await api.post("/trainer/vote", { winner_id: winnerId, loser_id: loser.id });
      setResult({ ...data, choice: winnerId });
      setStats(data.stats);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
      if (err.response?.status === 409) loadPair();
    } finally {
      setVoting(false);
    }
  }, [pair, result, voting, loadPair]);

  // Клавиатура: ← / 1 и → / 2 — выбор, Enter или пробел — следующая пара
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, [contenteditable]")) return;
      if (!pair) return;
      if (!result && (e.key === "ArrowLeft" || e.key === "1")) vote(pair[0].id);
      else if (!result && (e.key === "ArrowRight" || e.key === "2")) vote(pair[1].id);
      else if (result && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        loadPair();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pair, result, vote, loadPair]);

  if (authLoading) return <div className="text-center py-20 text-neutral-500">Загрузка...</div>;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center" data-testid="trainer-guest">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-soft text-brand grid place-items-center">
          <Target className="w-8 h-8" />
        </div>
        <h1 className="mt-6 font-display text-4xl md:text-5xl font-bold tracking-tight">Тренажёр насмотренности</h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300">
          Две работы — один выбор. Решите, какая сильнее, и узнайте, совпало ли ваше мнение с другими дизайнерами.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login"><Button className="rounded-full">Войти</Button></Link>
          <Link to="/register"><Button variant="outline" className="rounded-full">Регистрация</Button></Link>
        </div>
      </div>
    );
  }

  const resultKind = result ? (result.agreed === true ? "agreed" : result.agreed === false ? "disagreed" : "first") : null;
  const agreeRate = stats?.compared ? percent(stats.agreed, stats.compared) : null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-10 md:py-14" data-testid="trainer-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Тренажёр насмотренности</div>
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-bold tracking-tight">Какая работа сильнее?</h1>
          <p className="mt-2 text-neutral-500">Нажмите на работу или используйте клавиши ← и →.</p>
        </div>
        {stats && (
          <div className="flex gap-3" data-testid="trainer-stats">
            <div className="px-5 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="text-xs text-neutral-500">Оценено пар</div>
              <div className="font-display text-2xl font-bold tabular-nums">{stats.total}</div>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="text-xs text-neutral-500">Совпадений с большинством</div>
              <div className="font-display text-2xl font-bold tabular-nums">
                {stats.agreed} <span className="text-base font-medium text-neutral-500">из {stats.compared}{agreeRate !== null ? ` · ${agreeRate}%` : ""}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Категория">
        {[{ value: "all", label: "Все" }, ...CATEGORIES].map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            aria-pressed={category === c.value}
            className={`px-4 h-9 rounded-full text-sm border transition-colors ${
              category === c.value
                ? "bg-brand text-white border-brand"
                : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[0, 1].map((i) => <div key={i} className="aspect-[4/3] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />)}
          </div>
        ) : emptyText ? (
          <div className="text-center py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl" data-testid="trainer-empty">
            <Sparkles className="w-8 h-8 mx-auto text-brand" />
            <h3 className="mt-4 font-display text-2xl font-semibold">Пар для сравнения нет</h3>
            <p className="mt-2 text-neutral-500 max-w-md mx-auto">{emptyText}</p>
            <div className="mt-6 flex justify-center gap-3">
              {category !== "all" && <Button variant="outline" className="rounded-full" onClick={() => setCategory("all")}>Все категории</Button>}
              <Link to="/explore"><Button className="rounded-full">Открыть галерею</Button></Link>
            </div>
          </div>
        ) : pair ? (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <Choice design={pair[0]} side="left" result={result} onPick={vote} disabled={!!result || voting} />
              <Choice design={pair[1]} side="right" result={result} onPick={vote} disabled={!!result || voting} />
            </div>
            {result && (
              <div
                className={`mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl ${RESULT_TEXT[resultKind].className}`}
                data-testid="trainer-result"
                role="status"
              >
                <div>
                  <div className="font-display text-xl font-bold">{RESULT_TEXT[resultKind].title}</div>
                  <div className="text-sm opacity-80">
                    {RESULT_TEXT[resultKind].text} Всего голосов за эту пару: {result.total_votes}.
                  </div>
                </div>
                <Button onClick={loadPair} className="rounded-full shrink-0 bg-white text-neutral-950 hover:bg-neutral-100" data-testid="trainer-next">
                  Следующая пара <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
