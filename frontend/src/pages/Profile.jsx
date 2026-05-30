import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { api, fileUrl } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Upload as UploadIcon } from "lucide-react";

export default function Profile() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [myDesigns, setMyDesigns] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState({ name: "", bio: "", avatar_url: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user === false) { navigate("/login"); return; }
    setForm({ name: user.name || "", bio: user.bio || "", avatar_url: user.avatar_url || "" });
    (async () => {
      const [mine, p] = await Promise.all([
        api.get("/designs", { params: { author_id: user.id, status: "all", limit: 100 } }),
        api.get("/purchases"),
      ]);
      setMyDesigns(mine.data);
      setPurchases(p.data);
    })();
  }, [user, authLoading, navigate]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch("/users/me", form);
      await refreshUser();
      toast.success("Профиль обновлён");
    } catch (err) {
      toast.error("Ошибка сохранения");
    } finally {
      setSavingProfile(false);
    }
  };

  const onAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, avatar_url: `${process.env.REACT_APP_BACKEND_URL}${data.url}` });
    } catch {
      toast.error("Не удалось загрузить");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading || !user || user === false) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10" data-testid="profile-page">
      <div className="flex items-center gap-5 mb-10">
        <Avatar className="w-20 h-20">
          <AvatarImage src={form.avatar_url || undefined} />
          <AvatarFallback className="bg-neutral-900 text-white dark:bg-white dark:text-black text-2xl font-semibold">
            {user.name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight" data-testid="profile-name">{user.name}</h1>
          <p className="text-neutral-500">{user.email} · <span className="capitalize">{user.role === "admin" ? "Администратор" : user.role === "moderator" ? "Модератор" : "Пользователь"}</span></p>
        </div>
      </div>

      <Tabs defaultValue="works" className="w-full">
        <TabsList className="rounded-full" data-testid="profile-tabs">
          <TabsTrigger value="works" className="rounded-full" data-testid="tab-works">Мои работы</TabsTrigger>
          <TabsTrigger value="purchases" className="rounded-full" data-testid="tab-purchases">История покупок</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full" data-testid="tab-settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="works" className="mt-8">
          {myDesigns.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl">
              <h3 className="font-display text-2xl font-semibold">Пока нет работ</h3>
              <p className="mt-2 text-neutral-500">Опубликуйте свой первый дизайн.</p>
              <Button onClick={() => navigate("/upload")} className="mt-6 rounded-full">Опубликовать</Button>
            </div>
          ) : (
            <div className="masonry">
              {myDesigns.map((d) => <ProductCard key={d.id} design={d} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="mt-8">
          {purchases.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl">
              <h3 className="font-display text-2xl font-semibold">Покупок пока нет</h3>
              <p className="mt-2 text-neutral-500">Все ваши покупки появятся здесь.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((p) => (
                <div key={p.id} className="flex gap-4 items-center p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800" data-testid={`purchase-${p.id}`}>
                  <img src={p.images?.[0] ? fileUrl(p.images[0]) : ""} alt="" className="w-20 h-20 object-cover rounded-xl bg-neutral-100" />
                  <div className="flex-1">
                    <div className="font-display font-semibold">{p.title}</div>
                    <div className="text-sm text-neutral-500">{new Date(p.purchase?.created_at).toLocaleDateString("ru-RU")}</div>
                  </div>
                  <div className="font-display font-semibold">{Number(p.purchase?.amount).toFixed(0)} ₽</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-8">
          <form onSubmit={saveProfile} className="max-w-xl space-y-4" data-testid="profile-settings-form">
            <div>
              <Label>Аватар</Label>
              <div className="mt-2 flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={form.avatar_url || undefined} />
                  <AvatarFallback>{form.name?.[0]}</AvatarFallback>
                </Avatar>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} data-testid="avatar-upload-input" />
                  <span className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sm">
                    <UploadIcon className="w-4 h-4" /> {uploadingAvatar ? "Загрузка..." : "Загрузить"}
                  </span>
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl" data-testid="settings-name-input" />
            </div>
            <div>
              <Label htmlFor="bio">О себе</Label>
              <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1.5 rounded-xl min-h-[100px]" data-testid="settings-bio-input" />
            </div>
            <Button type="submit" disabled={savingProfile} className="rounded-full" data-testid="settings-save-button">
              {savingProfile ? "Сохраняем..." : "Сохранить"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
