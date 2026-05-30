import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Sun, Moon, Plus, Heart, Compass, TrendingUp, LayoutGrid, Shield, LogOut, User as UserIcon, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get("q") || "");
  }, [location.search]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    setMobileOpen(false);
  };

  const navItems = [
    { to: "/explore", label: "Категории", icon: LayoutGrid, testid: "nav-categories" },
    { to: "/trending", label: "В тренде", icon: TrendingUp, testid: "nav-trending" },
    { to: "/favorites", label: "Избранное", icon: Heart, testid: "nav-favorites" },
  ];

  const isStaff = user && user !== false && (user.role === "admin" || user.role === "moderator");

  return (
    <header
      className="sticky top-0 z-50 glass-light border-b border-white/40 dark:border-white/10"
      data-testid="site-header"
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center gap-3 md:gap-6">
        <Link to="/" className="font-display text-2xl md:text-3xl font-bold tracking-tighter shrink-0" data-testid="logo-link">
          dezi<span className="text-orange-500">.</span>
        </Link>

        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto" data-testid="search-form">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              data-testid="search-input"
              type="text"
              placeholder="Найти UI Kit, иконки, мокапы..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 pl-12 pr-4 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 focus:outline-none text-sm placeholder:text-neutral-400 transition-colors"
            />
          </div>
        </form>

        <nav className="hidden lg:flex items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-testid={item.testid}
              className="px-3 py-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={toggle}
            data-testid="theme-toggle-button"
            aria-label="Переключить тему"
            className="w-10 h-10 grid place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user && user !== false ? (
            <>
              <Link to="/upload" className="hidden sm:block">
                <Button data-testid="upload-design-button" className="rounded-full gap-2 h-10 px-4">
                  <Plus className="w-4 h-4" />
                  <span className="hidden md:inline">Опубликовать</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-avatar-button" className="rounded-full focus:outline-none focus:ring-2 ring-neutral-300 dark:ring-neutral-700">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                      <AvatarFallback className="bg-neutral-900 text-white dark:bg-white dark:text-black text-sm font-semibold">
                        {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" data-testid="user-menu">
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-xs text-neutral-500">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                    <UserIcon className="w-4 h-4 mr-2" /> Профиль
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/favorites")} data-testid="menu-favorites">
                    <Heart className="w-4 h-4 mr-2" /> Избранное
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/upload")} data-testid="menu-upload">
                    <Plus className="w-4 h-4 mr-2" /> Опубликовать дизайн
                  </DropdownMenuItem>
                  {isStaff && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                      <Shield className="w-4 h-4 mr-2" /> Панель модерации
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout();
                      navigate("/");
                    }}
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block" data-testid="login-link">
                <Button variant="ghost" className="rounded-full h-10 px-4">Войти</Button>
              </Link>
              <Link to="/register" data-testid="register-link">
                <Button className="rounded-full h-10 px-4">Регистрация</Button>
              </Link>
            </>
          )}

          <button
            onClick={() => setMobileOpen((s) => !s)}
            data-testid="mobile-menu-toggle"
            aria-label="Меню"
            className="lg:hidden w-10 h-10 grid place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 px-4 py-4 space-y-3" data-testid="mobile-menu">
          <form onSubmit={submitSearch} className="md:hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Поиск..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-testid="mobile-search-input"
                className="w-full h-11 pl-12 pr-4 rounded-full bg-neutral-100 dark:bg-neutral-900 focus:outline-none text-sm"
              />
            </div>
          </form>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
