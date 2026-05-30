import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] grid place-items-center px-6 text-center" data-testid="not-found-page">
      <div>
        <div className="font-display text-7xl md:text-8xl font-bold tracking-tighter">404</div>
        <p className="mt-3 text-neutral-500">Такой страницы не существует</p>
        <Link to="/"><Button className="mt-6 rounded-full">На главную</Button></Link>
      </div>
    </div>
  );
}
