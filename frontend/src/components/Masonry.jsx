import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * Masonry-сетка: карточки раскладываются по колонкам слева направо
 * (элемент i → колонка i % n). При подгрузке новых элементов уже
 * показанные карточки не перескакивают — в отличие от CSS columns.
 */
export default function Masonry({ items, renderItem, getKey = (it) => it.id, minColumnWidth = 260, maxColumns = 6, gap = 16, className = "" }) {
  const ref = useRef(null);
  const [columns, setColumns] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const width = el.clientWidth;
      const n = Math.max(1, Math.min(maxColumns, Math.floor((width + gap) / (minColumnWidth + gap))));
      setColumns((prev) => (prev === n ? prev : n));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minColumnWidth, maxColumns, gap]);

  const cols = Array.from({ length: columns }, () => []);
  items.forEach((item, i) => cols[i % columns].push(item));

  return (
    <div ref={ref} className={`flex items-start ${className}`} style={{ gap }} data-testid="masonry">
      {cols.map((col, ci) => (
        <div key={ci} className="flex-1 min-w-0 flex flex-col" style={{ gap }}>
          {col.map((item) => (
            <React.Fragment key={getKey(item)}>{renderItem(item)}</React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
