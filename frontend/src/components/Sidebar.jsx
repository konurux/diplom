import React from "react";
import { SlidersHorizontal } from "lucide-react";

export const STYLES = [
  { value: "minimalism", label: "Минимализм" },
  { value: "dark", label: "Тёмный" },
  { value: "glassmorphism", label: "Glassmorphism" },
  { value: "neumorphism", label: "Neumorphism" },
  { value: "material", label: "Material Design" },
  { value: "corporate", label: "Корпоративный" },
  { value: "modern", label: "Современный" },
];

export const CATEGORIES = [
  { value: "ui-kit", label: "UI Kit" },
  { value: "mockup", label: "Мокапы" },
  { value: "icons", label: "Иконки" },
  { value: "templates", label: "Шаблоны" },
  { value: "illustrations", label: "Иллюстрации" },
];

export const PRICES = [
  { value: "all", label: "Все" },
  { value: "free", label: "Бесплатные" },
  { value: "paid", label: "Платные" },
];

export const SORTS = [
  { value: "popular", label: "Популярные" },
  { value: "newest", label: "Новые" },
  { value: "rating", label: "По рейтингу" },
  { value: "downloads", label: "По просмотрам" },
];

function Chip({ active, onClick, children, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`text-sm px-3.5 h-9 rounded-full border transition-all ${
        active
          ? "bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white"
          : "bg-transparent border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
      }`}
    >
      {children}
    </button>
  );
}

export default function Sidebar({ filters, onChange }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <aside className="space-y-7" data-testid="filters-sidebar">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        <SlidersHorizontal className="w-4 h-4" />
        Фильтр поиска
      </div>

      <section>
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Стиль</div>
        <div className="flex flex-wrap gap-2">
          <Chip active={!filters.style || filters.style === "all"} onClick={() => set("style", "all")} testid="style-all">
            Все стили
          </Chip>
          {STYLES.map((s) => (
            <Chip
              key={s.value}
              active={filters.style === s.value}
              onClick={() => set("style", s.value)}
              testid={`style-${s.value}`}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Категория</div>
        <div className="flex flex-wrap gap-2">
          <Chip active={!filters.category || filters.category === "all"} onClick={() => set("category", "all")} testid="category-all">
            Все
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              active={filters.category === c.value}
              onClick={() => set("category", c.value)}
              testid={`category-${c.value}`}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Цена</div>
        <div className="flex flex-wrap gap-2">
          {PRICES.map((p) => (
            <Chip
              key={p.value}
              active={(filters.price || "all") === p.value}
              onClick={() => set("price", p.value)}
              testid={`price-${p.value}`}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Сортировка</div>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Chip
              key={s.value}
              active={(filters.sort || "popular") === s.value}
              onClick={() => set("sort", s.value)}
              testid={`sort-${s.value}`}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </section>
    </aside>
  );
}
