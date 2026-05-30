import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-20" data-testid="site-footer">
      <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="font-display text-2xl font-semibold mb-3">dezi<span className="text-orange-500">.</span></div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
            Маркетплейс цифровых ресурсов для дизайнеров и разработчиков.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold mb-3">Каталог</div>
          <ul className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li><Link to="/explore?category=ui-kit" className="hover:text-neutral-900 dark:hover:text-white">UI Kits</Link></li>
            <li><Link to="/explore?category=mockup" className="hover:text-neutral-900 dark:hover:text-white">Мокапы</Link></li>
            <li><Link to="/explore?category=icons" className="hover:text-neutral-900 dark:hover:text-white">Иконки</Link></li>
            <li><Link to="/explore?category=templates" className="hover:text-neutral-900 dark:hover:text-white">Шаблоны</Link></li>
            <li><Link to="/explore?category=illustrations" className="hover:text-neutral-900 dark:hover:text-white">Иллюстрации</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold mb-3">Сообщество</div>
          <ul className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li><Link to="/trending" className="hover:text-neutral-900 dark:hover:text-white">В тренде</Link></li>
            <li><Link to="/upload" className="hover:text-neutral-900 dark:hover:text-white">Опубликовать дизайн</Link></li>
            <li><Link to="/favorites" className="hover:text-neutral-900 dark:hover:text-white">Избранное</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold mb-3">Аккаунт</div>
          <ul className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white">Войти</Link></li>
            <li><Link to="/register" className="hover:text-neutral-900 dark:hover:text-white">Регистрация</Link></li>
            <li><Link to="/profile" className="hover:text-neutral-900 dark:hover:text-white">Профиль</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-[1440px] mx-auto px-6 md:px-8 py-6 text-xs text-neutral-500 dark:text-neutral-500 flex flex-col md:flex-row justify-between gap-2">
          <div>© {new Date().getFullYear()} Dezi. Все права защищены.</div>
          <div>Сделано для дизайнеров, с любовью.</div>
        </div>
      </div>
    </footer>
  );
}
