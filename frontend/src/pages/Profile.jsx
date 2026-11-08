import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Pencil, Trash2, Upload, Bookmark, LayoutGrid, Settings, Eye } from "@/components/icons";
import { toast } from "sonner";
import { api, fileUrl, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import ProductCard from "../components/ProductCard";
import EditDesignDialog from "../components/EditDesignDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";

const STATUS_LABEL = {
  approved: { text: "Одобрен", variant: "default" },
  pending: { text: "На модерации", variant: "secondary" },
  rejected: { text: "Отклонён", variant: "destructive" },
};

function Avatar({ user, size = "w-24 h-24 text-3xl" }) {
  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();
  return user?.avatar_url ? (
    <img src={fileUrl(user.avatar_url)} alt={user.name} className={`${size} rounded-full object-cover`} />
  ) : (
    <div className={`${size} rounded-full bg-gradient-to-br from-brand to-brand-2 grid place-items-center text-white font-display font-bold`}>
      {initial}
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="text-center py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-2 text-neutral-500">{text}</p>
      {action}
    </div>
  );
}

export default function Profile() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [works, setWorks] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async (uid) => {
    setLoading(true);
    try {
      const [w, p] = await Promise.all([
        api.get("/designs", { params: { author_id: uid, status: "all", sort: "newest", limit: 100 } }),
        api.get("/favorites"),
      ]);
      setWorks(w.data);
      setSaved(p.data);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setName(user.name || "");
    setBio(user.bio || "");
    setAvatar(user.avatar_url || null);
    load(user.id);
  }, [user, authLoading, navigate, load]);

  if (authLoading || !user) {
    return <div className="text-center py-20 text-neutral-500">Загрузка...</div>;
  }

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd);
      setAvatar(data.path);
      toast.success("Аватар загружен — не забудьте сохранить");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/users/me", { name: name.trim(), bio, avatar_url: avatar });
      await refreshUser();
      toast.success("Профиль сохранён");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Удалить «${d.title}»?`)) return;
    try {
      await api.delete(`/designs/${d.id}`);
      toast.success("Работа удалена");
      load(user.id);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const approvedCount = works.filter((d) => d.status === "approved").length;

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10 md:py-14" data-testid="profile-page">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6 mb-10">
        <Avatar user={{ ...user, avatar_url: user.avatar_url }} />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight truncate">{user.name}</h1>
          <p className="mt-1 text-neutral-500 truncate">{user.email}</p>
          {user.bio && <p className="mt-2 text-neutral-600 dark:text-neutral-300 max-w-2xl">{user.bio}</p>}
          <div className="mt-3 flex gap-4 text-sm text-neutral-500">
            <span><b className="text-neutral-900 dark:text-white">{works.length}</b> работ</span>
            <span><b className="text-neutral-900 dark:text-white">{approvedCount}</b> опубликовано</span>
            <span><b className="text-neutral-900 dark:text-white">{saved.length}</b> в мудборде</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/u/${user.id}`}>
            <Button variant="outline" className="rounded-full" data-testid="profile-public-link"><Eye className="w-4 h-4 mr-2" />Публичное портфолио</Button>
          </Link>
          <Link to="/upload">
            <Button className="rounded-full"><Upload className="w-4 h-4 mr-2" />Добавить работу</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="works">
        <TabsList className="mb-8">
          <TabsTrigger value="works" data-testid="profile-tab-works"><LayoutGrid className="w-4 h-4 mr-2" />Портфолио</TabsTrigger>
          <TabsTrigger value="saved" data-testid="profile-tab-saved"><Bookmark className="w-4 h-4 mr-2" />Мудборд</TabsTrigger>
          <TabsTrigger value="settings" data-testid="profile-tab-settings"><Settings className="w-4 h-4 mr-2" />Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="works">
          {loading ? (
            <div className="text-center py-20 text-neutral-500">Загрузка...</div>
          ) : works.length === 0 ? (
            <EmptyState
              title="Портфолио пока пустое"
              text="Добавьте первый проект — он будет храниться здесь и появится в вашем публичном портфолио."
              action={<Link to="/upload"><Button className="mt-6 rounded-full">Добавить работу</Button></Link>}
            />
          ) : (
            <div className="masonry">
              {works.map((d) => {
                const st = STATUS_LABEL[d.status] || STATUS_LABEL.pending;
                return (
                  <div key={d.id} className="relative">
                    <ProductCard design={d} onChange={() => load(user.id)} />
                    <div className="mt-2 mb-4 flex items-center justify-between gap-2">
                      <Badge variant={st.variant} className="rounded-full">{st.text}</Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditTarget(d)} data-testid={`profile-edit-${d.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(d)} data-testid={`profile-delete-${d.id}`}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved">
          {loading ? (
            <div className="text-center py-20 text-neutral-500">Загрузка...</div>
          ) : saved.length === 0 ? (
            <EmptyState
              title="Мудборд пока пуст"
              text="Сохраняйте работы, которые вас вдохновляют, — так растёт насмотренность."
              action={<Link to="/explore"><Button className="mt-6 rounded-full">Открыть галерею</Button></Link>}
            />
          ) : (
            <div className="masonry">
              {saved.map((d) => <ProductCard key={d.id} design={d} onChange={() => load(user.id)} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <form onSubmit={handleSave} className="max-w-xl space-y-6" data-testid="profile-settings-form">
            <div className="flex items-center gap-5">
              <Avatar user={{ ...user, avatar_url: avatar }} size="w-20 h-20 text-2xl" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="rounded-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-2" />{uploading ? "Загрузка..." : "Сменить аватар"}
                </Button>
                {avatar && (
                  <Button type="button" variant="ghost" className="rounded-full" onClick={() => setAvatar("")}>Убрать</Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Имя</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-bio">О себе</Label>
              <Textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <Button type="submit" className="rounded-full" disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
          </form>
        </TabsContent>
      </Tabs>

      <EditDesignDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        design={editTarget}
        onSaved={() => { setEditTarget(null); load(user.id); }}
      />
    </div>
  );
}
