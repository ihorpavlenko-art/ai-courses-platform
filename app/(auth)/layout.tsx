"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "../components/error-boundary";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/courses", label: "Courses", icon: "📚" },
  { href: "/quiz", label: "Quiz", icon: "🧠" },
  { href: "/progress", label: "Progress", icon: "📈" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-[var(--card)] border-r border-[var(--border)]">
      <div className="flex flex-col h-full p-4">
        {/* Logo skeleton */}
        <div className="h-8 w-32 bg-[var(--border)] rounded-[var(--radius-md)] animate-pulse mb-8" />

        {/* Nav items skeleton */}
        <nav className="flex-1 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-[var(--border)] rounded-[var(--radius-md)] animate-pulse"
            />
          ))}
        </nav>

        {/* User skeleton */}
        <div className="flex items-center gap-3 p-3 border-t border-[var(--border)]">
          <div className="w-8 h-8 rounded-full bg-[var(--border)] animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-[var(--border)] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileNavSkeleton() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] z-50">
      <div className="flex justify-around items-center h-16">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-6 h-6 bg-[var(--border)] rounded animate-pulse" />
            <div className="w-8 h-3 bg-[var(--border)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </nav>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex h-screen">
        <SidebarSkeleton />
        <MobileNavSkeleton />
        <main className="flex-1 md:ml-64 p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="h-8 w-48 bg-[var(--border)] rounded-[var(--radius-md)] animate-pulse mb-6" />
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 bg-[var(--border)] rounded-[var(--radius-lg)] animate-pulse"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/");
  }

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-[var(--card)] border-r border-[var(--border)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-col h-full">
          {/* Logo / Brand */}
          <div className="p-6 border-b border-[var(--border)]">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <span className="font-semibold text-[var(--foreground)] text-[var(--font-size-lg)]">
                AI Courses
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-colors duration-[var(--transition-fast)] ${
                    isActive
                      ? "bg-[var(--primary)] text-white font-medium"
                      : "text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="text-lg" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="text-[var(--font-size-sm)]">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 mb-3">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User avatar"}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-[var(--font-size-xs)] font-medium">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)] truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-[var(--font-size-xs)] text-[var(--muted)] truncate">
                  {session?.user?.email || ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[var(--font-size-sm)] text-[var(--muted)] hover:text-[var(--error)] hover:bg-[var(--card-hover)] rounded-[var(--radius-md)] transition-colors duration-[var(--transition-fast)]"
              aria-label="Sign out"
            >
              <span aria-hidden="true">🚪</span>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="flex-1 md:ml-64 overflow-y-auto pb-20 md:pb-0">
        <div className="p-6 max-w-7xl mx-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] shadow-[var(--shadow-md)] z-50"
        aria-label="Mobile navigation"
      >
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-[var(--radius-sm)] transition-colors duration-[var(--transition-fast)] ${
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-xl" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
