import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Register() {
  const { register, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user && user !== false) {
      const timer = setTimeout(() => navigate("/profile"), 2200);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, navigate]);

  if (!authLoading && user && user !== false) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-6" data-testid="already-logged-in-register">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Вы уже вошли в аккаунт</h1>
          <p className="mt-2 text-neutral-500">Здравствуйте, <span className="font-medium text-neutral-900 dark:text-white">{user.name}</span>. Сейчас откроем ваш профиль.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => navigate("/profile")} className="rounded-full" data-testid="goto-profile-button">Перейти в профиль</Button>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-full">На главную</Button>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await register(form.name, form.email, form.password);
    setBusy(false);
    if (result.ok) {
      toast.success("Аккаунт создан");
      navigate("/");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center px-6 py-12" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Создать аккаунт</h1>
          <p className="mt-2 text-neutral-500">Присоединяйтесь к сообществу Dezi</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-7 soft-shadow" data-testid="register-form">
          <div>
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="register-name-input"
              className="mt-1.5 h-11 rounded-xl"
              placeholder="Ваше имя"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="register-email-input"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              data-testid="register-password-input"
              className="mt-1.5 h-11 rounded-xl"
              placeholder="Минимум 6 символов"
            />
          </div>
          {error && <div className="text-sm text-red-500" data-testid="register-error">{error}</div>}
          <Button type="submit" disabled={busy} className="w-full h-11 rounded-full" data-testid="register-submit-button">
            {busy ? "Создаём..." : "Создать аккаунт"}
          </Button>
          <div className="text-sm text-center text-neutral-500">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-neutral-900 dark:text-white font-semibold" data-testid="link-login">
              Войти
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
