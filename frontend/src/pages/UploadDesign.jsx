import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Upload as UploadIcon, X, Image as ImageIcon, Link2, Check } from "lucide-react";
import { api, fileUrl, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { CATEGORIES, STYLES } from "../components/Sidebar";

export default function UploadDesign() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "ui-kit",
    styles: ["minimalism"],
    external_url: "",
    price: 0,
    is_free: true,
    tags: "",
  });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user === false) navigate("/login");
  }, [user, authLoading, navigate]);

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
      toast.success("Изображения загружены");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => setImages(images.filter((_, i) => i !== idx));

  const toggleStyle = (val) => {
    setForm((f) => {
      const has = f.styles.includes(val);
      const next = has ? f.styles.filter((s) => s !== val) : [...f.styles, val];
      return { ...f, styles: next.length ? next : f.styles };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (images.length === 0) { toast.error("Добавьте хотя бы одно изображение"); return; }
    if (form.styles.length === 0) { toast.error("Выберите хотя бы один стиль"); return; }
    if (!/^https?:\/\/.+/i.test(form.external_url.trim())) {
      toast.error("Введите корректную ссылку на дизайн (http:// или https://)");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        category: form.category,
        styles: form.styles,
        external_url: form.external_url.trim(),
        price: form.is_free ? 0 : parseFloat(form.price) || 0,
        is_free: form.is_free,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        images,
      };
      const { data } = await api.post("/designs", body);
      toast.success(data.status === "approved" ? "Дизайн опубликован!" : "Отправлено на модерацию");
      navigate(`/design/${data.id}`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Ошибка публикации");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || user === false) return null;
  const isStaff = user.role === "admin" || user.role === "moderator";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:py-14" data-testid="upload-page">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Опубликовать дизайн</h1>
        <p className="mt-2 text-neutral-500">
          {isStaff
            ? "Ваша работа будет опубликована сразу — у вас права администратора/модератора."
            : "После отправки работа пройдёт модерацию (обычно до 24 часов)."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6" data-testid="upload-form">
        {/* Images */}
        <div>
          <Label>Изображения <span className="text-red-500">*</span></Label>
          <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 group">
                <img src={fileUrl(img)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  data-testid={`remove-image-${i}`}
                  className="absolute top-1.5 right-1.5 w-7 h-7 grid place-items-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 dark:hover:border-neutral-500 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-neutral-500">
              <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} data-testid="image-upload-input" />
              {uploading ? <span className="text-xs">Загрузка...</span> : (
                <>
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-xs">Добавить</span>
                </>
              )}
            </label>
          </div>
          <p className="mt-2 text-xs text-neutral-500">До 8 изображений. Макс. 10MB каждое. JPG, PNG, WEBP.</p>
        </div>

        <div>
          <Label htmlFor="title">Название <span className="text-red-500">*</span></Label>
          <Input
            id="title" required minLength={2}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            data-testid="upload-title-input"
            className="mt-1.5 h-11 rounded-xl"
            placeholder="Например: Финансовое приложение UI Kit"
          />
        </div>

        <div>
          <Label htmlFor="external_url" className="flex items-center gap-1.5">
            <Link2 className="w-4 h-4" />
            Ссылка на дизайн <span className="text-red-500">*</span>
          </Label>
          <Input
            id="external_url" type="url" required
            value={form.external_url}
            onChange={(e) => setForm({ ...form, external_url: e.target.value })}
            data-testid="upload-url-input"
            className="mt-1.5 h-11 rounded-xl"
            placeholder="https://www.figma.com/community/file/... или https://dribbble.com/..."
          />
          <p className="mt-1.5 text-xs text-neutral-500">Ссылка на Figma, Behance, Dribbble или любой другой источник дизайна</p>
        </div>

        <div>
          <Label htmlFor="description">Описание <span className="text-red-500">*</span></Label>
          <Textarea
            id="description" required minLength={10}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            data-testid="upload-description-input"
            className="mt-1.5 min-h-[140px] rounded-xl"
            placeholder="Расскажите о вашем дизайне: какие задачи решает, что входит в комплект..."
          />
        </div>

        <div>
          <Label>Категория</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className="mt-1.5 h-11 rounded-xl" data-testid="upload-category-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Стили (выберите один или несколько) <span className="text-red-500">*</span></Label>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="upload-styles-group">
            {STYLES.map((s) => {
              const active = form.styles.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleStyle(s.value)}
                  data-testid={`upload-style-${s.value}`}
                  className={`flex items-center gap-1.5 text-sm px-3.5 h-9 rounded-full border transition-all ${
                    active
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white"
                      : "bg-transparent border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="tags">Теги (через запятую)</Label>
          <Input
            id="tags"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            data-testid="upload-tags-input"
            className="mt-1.5 h-11 rounded-xl"
            placeholder="dashboard, dark, mobile"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <div>
            <div className="font-medium">Бесплатный дизайн</div>
            <div className="text-xs text-neutral-500">Пользователи смогут открыть без оплаты</div>
          </div>
          <Switch
            checked={form.is_free}
            onCheckedChange={(v) => setForm({ ...form, is_free: v })}
            data-testid="upload-isfree-switch"
          />
        </div>

        {!form.is_free && (
          <div>
            <Label htmlFor="price">Цена, ₽</Label>
            <Input
              id="price" type="number" min="0" step="50"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              data-testid="upload-price-input"
              className="mt-1.5 h-11 rounded-xl max-w-[200px]"
            />
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <Button type="submit" disabled={submitting} className="h-12 px-8 rounded-full text-base gap-2" data-testid="upload-submit-button">
            <UploadIcon className="w-4 h-4" />
            {submitting ? "Публикуем..." : "Опубликовать"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="rounded-full">Отмена</Button>
        </div>
      </form>
    </div>
  );
}
