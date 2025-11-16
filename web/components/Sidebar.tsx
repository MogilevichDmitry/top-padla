"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const menuItems = [
  { href: "/", label: "🏆 Standings", icon: "🏆" },
  { href: "/matches", label: "🎾 Matches", icon: "🎾" },
  { href: "/players", label: "👤 Players", icon: "👤" },
  { href: "/pairs", label: "👯‍♂️ Pairs", icon: "👯‍♂️" },
  { href: "/records", label: "📈 Records", icon: "📈" },
  { href: "/help", label: "ℹ️ Help & Guide", icon: "ℹ️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Lock scroll when menu is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Check admin status on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(Boolean(d?.admin)))
      .catch(() => setIsAdmin(false));
  }, []);

  async function handleLogin() {
    const pwd = typeof window !== "undefined" ? window.prompt("Enter admin password") : null;
    if (!pwd) return;
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    if (res.ok) {
      setIsAdmin(true);
      // close mobile menu if open
      setIsOpen(false);
    } else {
      alert("Invalid password");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
    setIsOpen(false);
  }

  return (
    <>
      {/* Mobile header with logo and burger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-lg pl-4 pr-3 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center space-x-2"
          onClick={() => setIsOpen(false)}
        >
          <h1 className="text-lg font-bold">T🎾P PADLA</h1>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu - full width and height below header */}
      {isOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bottom-0 z-40 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-lg overflow-y-auto">
          <div className="flex flex-col h-full">
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                      ${
                        isActive
                          ? "bg-blue-900 text-white shadow-lg"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }
                    `}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">
                      {item.label.replace(/^[^\s]+\s/, "")}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-700 mt-auto">
              <p className="text-xs text-gray-400 text-center">BOTTOM PADLA</p>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl z-50 flex-col
        `}
      >
        {/* Logo/Header */}
        <div className="p-4 md:p-6 border-b border-gray-700">
          <Link
            href="/"
            className="flex items-center space-x-3"
            onClick={() => setIsOpen(false)}
          >
            <div>
              <h1 className="text-lg md:text-xl font-bold">TOP PADLA</h1>
              <p className="text-xs text-gray-400">Rating System</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? "bg-blue-900 text-white shadow-lg"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">
                  {item.label.replace(/^[^\s]+\s/, "")}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">BOTTOM PADLA</p>
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
