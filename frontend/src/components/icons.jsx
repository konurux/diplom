/**
 * Единый набор иконок проекта — Phosphor Icons (https://phosphoricons.com).
 *
 * Экспортируем под старыми именами, чтобы компоненты не зависели от конкретной
 * библиотеки. Начертание по умолчанию — "regular". Если иконке передан класс
 * заливки (например `fill-red-500` или `fill-current`), автоматически
 * включается начертание "fill" — так работают «активные» лайки и закладки.
 * Явный проп `weight` ("thin" | "light" | "regular" | "bold" | "fill" | "duotone")
 * всегда имеет приоритет.
 */
import React, { forwardRef } from "react";
import {
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  BookmarkSimple,
  Camera as PhCamera,
  Check as PhCheck,
  CheckCircle,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Circle as PhCircle,
  Clock as PhClock,
  Compass as PhCompass,
  PencilSimpleLine,
  ArrowSquareOut,
  Eye as PhEye,
  FileMagnifyingGlass,
  Fire,
  FolderOpen as PhFolderOpen,
  DotsSixVertical,
  Heart as PhHeart,
  Image as PhImage,
  SquaresFour,
  LinkSimple,
  SignOut,
  List,
  ChatCircle,
  Minus as PhMinus,
  Moon as PhMoon,
  DotsThree,
  PencilSimple,
  Plus as PhPlus,
  MagnifyingGlass,
  GearSix,
  ShieldCheck,
  SlidersHorizontal as PhSlidersHorizontal,
  Sparkle,
  Star as PhStar,
  Sun as PhSun,
  Tag as PhTag,
  Target as PhTarget,
  Trash,
  TrendUp,
  UploadSimple,
  User as PhUser,
  UserPlus as PhUserPlus,
  Users as PhUsers,
  X as PhX,
} from "@phosphor-icons/react";

const FILL_CLASS = /(^|\s)fill-(?!none\b)[\w-/[\]#.]+/;

function wrap(Icon, name) {
  const Wrapped = forwardRef(({ weight, className = "", ...props }, ref) => {
    const w = weight || (FILL_CLASS.test(className) ? "fill" : "regular");
    return <Icon ref={ref} weight={w} className={className} aria-hidden={props["aria-label"] ? undefined : true} {...props} />;
  });
  Wrapped.displayName = name;
  return Wrapped;
}

export const ArrowLeft = wrap(PhArrowLeft, "ArrowLeft");
export const ArrowRight = wrap(PhArrowRight, "ArrowRight");
export const Bookmark = wrap(BookmarkSimple, "Bookmark");
export const Camera = wrap(PhCamera, "Camera");
export const Check = wrap(PhCheck, "Check");
export const CheckCircle2 = wrap(CheckCircle, "CheckCircle2");
export const ChevronDown = wrap(CaretDown, "ChevronDown");
export const ChevronLeft = wrap(CaretLeft, "ChevronLeft");
export const ChevronRight = wrap(CaretRight, "ChevronRight");
export const ChevronUp = wrap(CaretUp, "ChevronUp");
export const Circle = wrap(PhCircle, "Circle");
export const Clock = wrap(PhClock, "Clock");
export const Compass = wrap(PhCompass, "Compass");
export const Edit3 = wrap(PencilSimpleLine, "Edit3");
export const ExternalLink = wrap(ArrowSquareOut, "ExternalLink");
export const Eye = wrap(PhEye, "Eye");
export const FileCheck = wrap(FileMagnifyingGlass, "FileCheck");
export const Flame = wrap(Fire, "Flame");
export const FolderOpen = wrap(PhFolderOpen, "FolderOpen");
export const GripVertical = wrap(DotsSixVertical, "GripVertical");
export const Heart = wrap(PhHeart, "Heart");
export const Image = wrap(PhImage, "Image");
export const LayoutGrid = wrap(SquaresFour, "LayoutGrid");
export const Link2 = wrap(LinkSimple, "Link2");
export const LogOut = wrap(SignOut, "LogOut");
export const Menu = wrap(List, "Menu");
export const MessageCircle = wrap(ChatCircle, "MessageCircle");
export const Minus = wrap(PhMinus, "Minus");
export const Moon = wrap(PhMoon, "Moon");
export const MoreHorizontal = wrap(DotsThree, "MoreHorizontal");
export const Pencil = wrap(PencilSimple, "Pencil");
export const Plus = wrap(PhPlus, "Plus");
export const Search = wrap(MagnifyingGlass, "Search");
export const Settings = wrap(GearSix, "Settings");
export const Shield = wrap(ShieldCheck, "Shield");
export const SlidersHorizontal = wrap(PhSlidersHorizontal, "SlidersHorizontal");
export const Sparkles = wrap(Sparkle, "Sparkles");
export const Star = wrap(PhStar, "Star");
export const Sun = wrap(PhSun, "Sun");
export const Tag = wrap(PhTag, "Tag");
export const Target = wrap(PhTarget, "Target");
export const Trash2 = wrap(Trash, "Trash2");
export const TrendingUp = wrap(TrendUp, "TrendingUp");
export const Upload = wrap(UploadSimple, "Upload");
export const User = wrap(PhUser, "User");
export const UserPlus = wrap(PhUserPlus, "UserPlus");
export const Users = wrap(PhUsers, "Users");
export const X = wrap(PhX, "X");
