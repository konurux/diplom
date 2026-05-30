import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Shield, Check, X, Edit3, Trash2, Users as UsersIcon, FileCheck, Clock, UserPlus } from "lucide-react";
import { api, fileUrl, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import EditDesignDialog from "../components/EditDesignDialog";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ designs: 0, pending: 0, users: 0 });
  const [editTarget, setEditTarget] = useState(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const isAdmin = user && user !== false && user.role === "admin";
  const isStaff = user && user !== false && (user.role === "admin" || user.role === "moderator");

  const load = useCallback(async () => {
    const [pendingR, approvedR, rejectedR, statsR] = await Promise.all([
      api.get("/designs", { params: { status: "pending", limit: 100, sort: "newest" } }),
      api.get("/designs", { params: { status: "approved", limit: 100, sort: "newest" } }),
      api.get("/designs", { params: { status: "rejected", limit: 100, sort: "newest" } }),
      api.get("/stats"),
    ]);
    setPending(pendingR.data);
    setApproved(approvedR.data);
    setRejected(rejectedR.data);
    setStats(statsR.data);
    if (isAdmin) {
      const u = await api.get("/admin/users");
      setUsers(u.data);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    if (!isStaff) { navigate("/"); return; }
    load();
  }, [authLoading, isStaff, navigate, load]);

  const moderate = async (id, action) => {
    try {
      await api.post(`/designs/${id}/moderate`, null, { params: { action } });
      toast.success(action === "approve" ? "Одобрено" : "Отклонено");
      load();
    } catch {
      toast.error("Ошибка");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить дизайн?")) return;
    await api.delete(`/designs/${id}`);
    toast.success("Удалено");
    load();
  };

  const setUserRole = async (uid, role) => {
    await api.patch(`/admin/users/${uid}/role`, null, { params: { role } });
    toast.success("Роль изменена");
    load();
  };

  const deleteUser = async (uid, name) => {
    if (!window.confirm(`Удалить пользователя «${name}»? Все его дизайны и комментарии тоже удалятся.`)) return;
    try {
      await api.delete(`/admin/users/${uid}`);
      toast.success("Пользователь удалён");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  if (authLoading) return null;
  if (!isStaff) return null;

  const renderList = (list, withModeration = false) => (
    list.length === 0 ? (
      <div className="text-center py-16 text-neutral-500 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl">
        Список пуст
      </div>
    ) : (
      <div className="space-y-3">
        {list.map((d) => (
          <div key={d.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800" data-testid={`admin-design-${d.id}`}>
            <img
              src={d.images?.[0] ? fileUrl(d.images[0]) : "https://via.placeholder.com/100"}
              alt=""
              className="w-24 h-24 object-cover rounded-xl bg-neutral-100 dark:bg-neutral-800 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <Link to={`/design/${d.id}`} className="font-display font-semibold hover:underline">{d.title}</Link>
              <div className="text-sm text-neutral-500 mt-0.5">
                {d.author?.name} · {d.category} · {(d.styles || []).join(", ")}
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {new Date(d.created_at).toLocaleString("ru-RU")}
              </div>
              <div className="mt-1.5">
                <Badge variant={d.status === "approved" ? "default" : d.status === "pending" ? "secondary" : "destructive"} className="rounded-full">
                  {d.status === "approved" ? "Одобрен" : d.status === "pending" ? "На модерации" : "Отклонён"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 self-stretch sm:self-auto">
              {withModeration && d.status === "pending" && (
                <>
                  <Button onClick={() => moderate(d.id, "approve")} size="sm" className="rounded-full gap-1" data-testid={`approve-${d.id}`}>
                    <Check className="w-4 h-4" /> Одобрить
                  </Button>
                  <Button onClick={() => moderate(d.id, "reject")} size="sm" variant="outline" className="rounded-full gap-1" data-testid={`reject-${d.id}`}>
                    <X className="w-4 h-4" /> Отклонить
                  </Button>
                </>
              )}
              {d.status === "rejected" && (
                <Button onClick={() => moderate(d.id, "approve")} size="sm" className="rounded-full gap-1">
                  <Check className="w-4 h-4" /> Одобрить
                </Button>
              )}
              <Button onClick={() => setEditTarget(d)} size="sm" variant="ghost" className="rounded-full gap-1" data-testid={`edit-${d.id}`}>
                <Edit3 className="w-4 h-4" /> Редактировать
              </Button>
              <Button onClick={() => remove(d.id)} size="sm" variant="ghost" className="rounded-full gap-1 text-red-500 hover:text-red-600" data-testid={`delete-${d.id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-10" data-testid="admin-page">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-black grid place-items-center">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Панель модерации</h1>
          <p className="text-neutral-500">{user.role === "admin" ? "Полный доступ администратора" : "Доступ модератора"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <StatCard icon={<FileCheck />} label="Одобрено" value={stats.designs} color="bg-emerald-500" />
        <StatCard icon={<Clock />} label="На модерации" value={stats.pending} color="bg-orange-500" />
        <StatCard icon={<UsersIcon />} label="Пользователей" value={stats.users} color="bg-violet-500" />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="rounded-full flex-wrap h-auto" data-testid="admin-tabs">
          <TabsTrigger value="pending" className="rounded-full gap-2" data-testid="tab-pending">
            На модерации
            {stats.pending > 0 && <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">{stats.pending}</span>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-full" data-testid="tab-approved">Одобренные</TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-full" data-testid="tab-rejected">Отклонённые</TabsTrigger>
          {isAdmin && <TabsTrigger value="users" className="rounded-full" data-testid="tab-users">Пользователи</TabsTrigger>}
        </TabsList>

        <TabsContent value="pending" className="mt-6">{renderList(pending, true)}</TabsContent>
        <TabsContent value="approved" className="mt-6">{renderList(approved)}</TabsContent>
        <TabsContent value="rejected" className="mt-6">{renderList(rejected)}</TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-neutral-500">Всего: {users.length}</div>
              <Button onClick={() => setCreateUserOpen(true)} className="rounded-full gap-2" data-testid="open-create-user">
                <UserPlus className="w-4 h-4" /> Создать пользователя
              </Button>
            </div>
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800" data-testid={`admin-user-${u.id}`}>
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback>{u.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm text-neutral-500 truncate">{u.email}</div>
                  </div>
                  <Select value={u.role} onValueChange={(v) => setUserRole(u.id, v)}>
                    <SelectTrigger className="w-40 rounded-full" data-testid={`role-select-${u.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Пользователь</SelectItem>
                      <SelectItem value="moderator">Модератор</SelectItem>
                      <SelectItem value="admin">Администратор</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => deleteUser(u.id, u.name)}
                    size="sm"
                    variant="ghost"
                    disabled={u.id === user.id}
                    className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    data-testid={`delete-user-${u.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <EditDesignDialog
        open={!!editTarget}
        design={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
        adminMode
      />

      <CreateUserDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onCreated={() => { setCreateUserOpen(false); load(); }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 soft-shadow flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl grid place-items-center text-white ${color}`}>
        {icon}
      </div>
      <div>
        <div className="font-display text-3xl font-bold">{value}</div>
        <div className="text-xs text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

function CreateUserDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setForm({ name: "", email: "", password: "", role: "user" });
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/users", form);
      toast.success("Пользователь создан");
      onCreated();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-testid="create-user-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Новый пользователь</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Имя</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl h-11" data-testid="create-user-name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 rounded-xl h-11" data-testid="create-user-email" />
          </div>
          <div>
            <Label>Пароль</Label>
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 rounded-xl h-11" data-testid="create-user-password" />
          </div>
          <div>
            <Label>Роль</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="mt-1.5 rounded-xl" data-testid="create-user-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Пользователь</SelectItem>
                <SelectItem value="moderator">Модератор</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">Отмена</Button>
            <Button type="submit" disabled={busy} className="rounded-full" data-testid="create-user-submit">
              {busy ? "Создаём..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
