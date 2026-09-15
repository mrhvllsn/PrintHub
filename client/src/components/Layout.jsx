import { useState } from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  Clock3,
  Files,
  HelpCircle,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  Moon,
  PlusCircle,
  Printer,
  Receipt,
  Settings,
  Store,
  Sun,
  Users,
  WalletCards,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import FloatingChat from "./FloatingChat";

const adminLinks = [
  ["Dashboard", "/", LayoutDashboard],
  ["Pending Orders", "/orders?status=Pending", Clock3],
  ["All Print Orders", "/orders", ClipboardList],
  ["Walk-In Orders", "/walk-in", Store],
  ["Customers", "/customers", Users],
  ["Customer Chats", "/admin/chats", MessagesSquare],
  ["Uploaded Files", "/files", Files],
  ["Inventory", "/inventory", Boxes],
  [
    "Inventory Movements",
    "/movements",
    ArrowLeftRight,
  ],
  ["Services & Pricing", "/services", Printer],
  ["Payments", "/payments", WalletCards],
  ["Expenses", "/expenses", Receipt],
  [
    "Notifications",
    "/notifications",
    MessageSquare,
  ],
  ["Reports", "/reports", BarChart3],
  ["Activity Logs", "/logs", History],
  ["Settings", "/settings", Settings],
];

const customerLinks = [
  ["Dashboard", "/", LayoutDashboard],
  ["New Print Order", "/new-order", PlusCircle],
  ["My Orders", "/orders", ClipboardList],
  ["Uploaded Files", "/files", Files],
  ["Payments", "/payments", WalletCards],
  ["Notifications", "/notifications", Bell],
  ["Profile Settings", "/profile", Settings],
  ["Help & Support", "/help", HelpCircle],
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(
    localStorage.theme === "dark",
  );

  const navigate = useNavigate();

  const isAdmin = user.role === "admin";
  const isCustomer = user.role === "customer";

  const links = isAdmin
    ? adminLinks
    : customerLinks;

  const avatar = user.profile_picture
    ? `/api/avatars/${user.profile_picture}`
    : null;

  function toggleTheme() {
    const nextDarkMode = !dark;

    document.documentElement.classList.toggle(
      "dark",
      nextDarkMode,
    );

    localStorage.theme = nextDarkMode
      ? "dark"
      : "light";

    setDark(nextDarkMode);
  }

  function handleSignOut() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          w-72 bg-navy text-white
          transition-transform duration-300
          lg:translate-x-0
          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand">
            <Printer />
          </div>

          <div>
            <strong className="text-xl">
              PrintHub
            </strong>

            <p className="text-xs text-slate-400">
              Printing made simple
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="h-[calc(100%-9rem)] space-y-1 overflow-y-auto p-4">
          {links.map(
            ([name, destination, Icon]) => (
              <NavLink
                key={name}
                to={destination}
                end={destination === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3
                  rounded-xl px-4 py-2.5
                  text-sm transition
                  ${
                    isActive
                      ? "bg-brand text-white"
                      : "text-slate-300 hover:bg-white/10"
                  }
                `}
              >
                <Icon size={18} />

                <span>{name}</span>
              </NavLink>
            ),
          )}
        </nav>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="
            mx-4 flex w-[calc(100%-2rem)]
            items-center gap-3 rounded-xl
            px-4 py-3 text-slate-300
            transition
            hover:bg-red-500/20
            hover:text-red-300
          "
        >
          <LogOut size={18} />

          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main area */}
      <div className="lg:pl-72">
        {/* Header */}
        <header
          className="
            sticky top-0 z-30
            flex h-20 items-center
            justify-between
            border-b border-slate-200
            bg-white/90 px-4
            backdrop-blur
            dark:border-slate-800
            dark:bg-slate-950/90
            sm:px-7
          "
        >
          {/* Mobile menu */}
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Open sidebar"
          >
            <Menu />
          </button>

          {/* Welcome message */}
          <div className="hidden sm:block">
            <p className="text-sm text-slate-500">
              Welcome back,
            </p>

            <strong>{user.full_name}</strong>
          </div>

          {/* Header buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-light !p-2.5"
              onClick={toggleTheme}
              aria-label="Change theme"
            >
              {dark ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            <NavLink
              to="/notifications"
              className="btn-light !p-2.5"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </NavLink>

            <NavLink
              to="/profile"
              aria-label="Open profile"
            >
              <div
                className="
                  grid h-10 w-10
                  place-items-center
                  overflow-hidden rounded-full
                  bg-cyan font-bold text-navy
                "
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={`${user.full_name}'s profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.full_name?.[0]?.toUpperCase()
                )}
              </div>
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-7">
          {children}
        </main>
      </div>

      {/* Mobile sidebar background */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="
            fixed inset-0 z-30
            bg-black/40 lg:hidden
          "
          onClick={() => setOpen(false)}
        />
      )}

      {/* Customer floating chatbot */}
      {isCustomer && <FloatingChat />}
    </div>
  );
}