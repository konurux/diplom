import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Login() {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
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
      <div className="min-h-[70vh] grid place-items-center px-6" data-testid="already-logged-in">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Вы уже вошли в аккаунт</h1>
          <p className="mt-2 text-neutral-500">Добро пожаловать, <span className="font-medium text-neutral-900 dark:text-white">{user.name}</span>. Через мгновение перенаправим вас в профиль.</p>
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
    const result = await login(form.email, form.password);
    setBusy(false);
    if (result.ok) {
      toast.success("Добро пожаловать!");
      navigate(location.state?.from || "/");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center px-6 py-12" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Добро пожаловать</h1>
          <p className="mt-2 text-neutral-500">Войдите в свой аккаунт Dezi</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-7 soft-shadow" data-testid="login-form">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="login-email-input"
              className="mt-1.5 h-11 rounded-xl"
              placeholder="you@example.com"
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
              data-testid="login-password-input"
              className="mt-1.5 h-11 rounded-xl"
              placeholder="••••••"
            />
          </div>
          {error && <div className="text-sm text-red-500" data-testid="login-error">{error}</div>}
          <Button type="submit" disabled={busy} className="w-full h-11 rounded-full" data-testid="login-submit-button">
            {busy ? "Входим..." : "Войти"}
          </Button>
          <div className="text-sm text-center text-neutral-500">
            Ещё нет аккаунта?{" "}
            <Link to="/register" className="text-neutral-900 dark:text-white font-semibold" data-testid="link-register">
              Зарегистрироваться
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
