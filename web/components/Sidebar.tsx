"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: "/", label: "🏆 Standings", icon: "🏆" },
  { href: "/matches", label: "🎾 Matches", icon: "🎾" },
  { href: "/players", label: "👥 Players", icon: "👥" },
  { href: "/pairs", label: "🤝 Pairs", icon: "🤝" },
  { href: "/records", label: "📊 Records", icon: "📊" },
  { href: "/help", label: "❓ Help", icon: "❓" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl z-50">
      <div className="flex flex-col h-full">
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-700">
          <Link href="/" className="flex items-center space-x-3">
            <div>
              <h1 className="text-xl font-bold">T🎾P PADLA</h1>
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
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg transform scale-105"
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
          <p className="text-xs text-gray-400 text-center">BOTTOM PADLA</p>
        </div>
      </div>
    </aside>
  );
}
