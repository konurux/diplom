import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Image as ImageIcon, Link2, Check } from "lucide-react";
import { api, fileUrl, formatApiErrorDetail } from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CATEGORIES, STYLES } from "./Sidebar";

export default function EditDesignDialog({ open, onClose, design, onSaved, adminMode = false }) {
  const [form, setForm] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (design) {
      const styles = design.styles && design.styles.length
        ? design.styles
        : (design.style ? [design.style] : ["minimalism"]);
      setForm({
        title: design.title || "",
        description: design.description || "",
        category: design.category || "ui-kit",
        styles,
        external_url: design.external_url || "",
        price: design.price || 0,
        is_free: design.is_free !== false,
        tags: (design.tags || []).join(", "),
        status: design.status || "pending",
      });
      setImages(design.images || []);
    }
  }, [design]);

  if (!design || !form) return null;

  const onUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setImages((prev) => [...prev, data.path]);
      }
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const toggleStyle = (val) => {
    setForm((f) => {
      const has = f.styles.includes(val);
      const next = has ? f.styles.filter((s) => s !== val) : [...f.styles, val];
      return { ...f, styles: next.length ? next : f.styles };
    });
  };

  const save = async () => {
    if (form.styles.length === 0) { toast.error("Выберите хотя бы один стиль"); return; }
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        category: form.category,
        styles: form.styles,
        external_url: form.external_url,
        price: form.is_free ? 0 : parseFloat(form.price) || 0,
        is_free: form.is_free,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        images,
      };
      if (adminMode) body.status = form.status;
      await api.patch(`/designs/${design.id}`, body);
      toast.success("Сохранено");
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-design-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Редактировать дизайн</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Изображения</Label>
            <div className="mt-2 grid grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 group">
                  <img src={fileUrl(img)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100"
                    data-testid={`edit-remove-image-${i}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 flex flex-col items-center justify-center gap-1 cursor-pointer text-neutral-500 text-xs">
                <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} data-testid="edit-image-upload" />
                <ImageIcon className="w-5 h-5" />
                {uploading ? "..." : "Добавить"}
              </label>
            </div>
          </div>

          <div>
            <Label>Название</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 rounded-xl" data-testid="edit-title-input" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Link2 className="w-4 h-4" /> Ссылка на дизайн</Label>
            <Input
              type="url" value={form.external_url}
              onChange={(e) => setForm({ ...form, external_url: e.target.value })}
              className="mt-1.5 rounded-xl"
              data-testid="edit-url-input"
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl min-h-[100px]" data-testid="edit-description-input" />
          </div>
          <div>
            <Label>Категория</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Стили (несколько)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {STYLES.map((s) => {
                const active = form.styles.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleStyle(s.value)}
                    data-testid={`edit-style-${s.value}`}
                    className={`flex items-center gap-1 text-xs px-3 h-8 rounded-full border transition-all ${
                      active
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white"
                        : "bg-transparent border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Теги</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="mt-1.5 rounded-xl" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900">
            <div className="text-sm font-medium">Бесплатный</div>
            <Switch checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} data-testid="edit-isfree-switch" />
          </div>
          {!form.is_free && (
            <div>
              <Label>Цена, ₽</Label>
              <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5 rounded-xl max-w-[200px]" />
            </div>
          )}
          {adminMode && (
            <div>
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl" data-testid="edit-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">На модерации</SelectItem>
                  <SelectItem value="approved">Одобрено</SelectItem>
                  <SelectItem value="rejected">Отклонено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="rounded-full">Отмена</Button>
            <Button onClick={save} disabled={saving} className="rounded-full" data-testid="edit-save-button">
              {saving ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
