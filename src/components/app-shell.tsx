import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  Bell,
  Search,
  LogOut,
  Moon,
  Sun,
  ShieldAlert,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { authStore, useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { useAppData } from "@/lib/app-store";

type AppNotification = {
  id: string;
  tone: "warning" | "destructive" | "success" | "primary";
  title: string;
  time: string;
};

function buildNotifications(
  data: ReturnType<typeof useAppData>,
  selectedBusinessId: string,
): AppNotification[] {
  const isAll = !selectedBusinessId || selectedBusinessId === "all";
  const matchesBusiness = (businessId: string) => isAll || businessId === selectedBusinessId;
  const inventory = data.inventory.filter((item) => matchesBusiness(item.businessId));
  const sales = data.sales.filter((sale) => matchesBusiness(sale.businessId));
  const expenses = data.expenses.filter((expense) => matchesBusiness(expense.businessId));
  const notifications: AppNotification[] = [];

  inventory
    .filter((item) => item.qty <= item.threshold)
    .slice(0, 3)
    .forEach((item) => {
      notifications.push({
        id: `stock-${item.id}`,
        tone: "warning",
        title: `Low stock: ${item.name}`,
        time: `${item.qty} remaining · threshold ${item.threshold}`,
      });
    });

  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  if (totalExpenses > totalSales && totalExpenses > 0) {
    notifications.push({
      id: "expense-balance",
      tone: "destructive",
      title: "Expenses exceed recorded sales",
      time: `₹${totalExpenses.toLocaleString()} expenses · ₹${totalSales.toLocaleString()} sales`,
    });
  }

  if (data.businesses.length === 0) {
    notifications.push({
      id: "empty-workspace",
      tone: "primary",
      title: "Add your first business",
      time: "Workspace setup required",
    });
  }

  return notifications;
}

const navItems = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/businesses", label: "Businesses", icon: Building2 },
  { to: "/app/sales", label: "Sales", icon: ShoppingCart },
  { to: "/app/expenses", label: "Expenses", icon: Receipt },
  { to: "/app/inventory", label: "Inventory", icon: Package },
  { to: "/app/employees", label: "Employees", icon: Users },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/ai-insights", label: "AI Insights", icon: Sparkles },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, businessId } = useAuth();
  const appData = useAppData();
  const { businesses } = appData;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexora.theme");
      if (saved) return saved === "dark";
    }
    return true;
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nexora.theme", dark ? "dark" : "light");
  }, [dark]);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";
  const activeBiz = businesses.find((b) => b.id === businessId) ?? {
    id: "all",
    name: "All Businesses",
    emoji: "🌐",
  };

  const navList =
    user?.email === "admin@nexora.com"
      ? [...navItems, { to: "/app/admin", label: "Admin Panel", icon: ShieldAlert }]
      : navItems;
  const notifications = buildNotifications(appData, businessId);

  return (
    <div className="min-h-screen flex bg-background/40 text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar/70 backdrop-blur-2xl text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen shadow-2xl">
        <Link to="/" className="px-6 h-16 flex items-center gap-2 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary shadow-glow grid place-items-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Businvo
          </span>
        </Link>

        <div className="px-3 py-4">
          <div className="px-3 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 mb-2">
            Active business
          </div>
          <select
            value={businessId}
            onChange={(e) => authStore.setBusiness(e.target.value)}
            className="w-full bg-sidebar-accent/35 backdrop-blur-md text-sidebar-foreground border border-sidebar-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="all">🌐 All Businesses ({businesses.length})</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.emoji} {b.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navList.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sb-active"
                    className="absolute inset-0 rounded-lg bg-gradient-primary opacity-90 -z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <item.icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => {
              authStore.logout();
              navigate({ to: "/login" });
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-sidebar/85 backdrop-blur-2xl text-sidebar-foreground border-r border-sidebar-border flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="px-6 h-16 flex items-center justify-between border-b border-sidebar-border">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-primary shadow-glow grid place-items-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-display text-lg font-semibold tracking-tight">
                  Businvo
                </span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-3 py-4">
              <div className="px-3 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 mb-2">
                Active business
              </div>
              <select
                value={businessId}
                onChange={(e) => {
                  authStore.setBusiness(e.target.value);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-sidebar-accent/35 backdrop-blur-md text-sidebar-foreground border border-sidebar-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                <option value="all">🌐 All Businesses ({businesses.length})</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.emoji} {b.name}
                  </option>
                ))}
              </select>
            </div>

            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {navList.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-gradient-primary text-white shadow-glow"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-sidebar-border">
              <button
                onClick={() => {
                  authStore.logout();
                  navigate({ to: "/login" });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/45 backdrop-blur-2xl flex items-center gap-3 px-4 lg:px-8 shadow-sm">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-lg bg-gradient-violet grid place-items-center text-white font-semibold shadow-soft shrink-0 text-sm">
            {userInitials}
          </div>
          <div className="lg:hidden font-display font-semibold text-gradient text-base">
            Businvo
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 h-10 rounded-lg bg-muted/60 border border-border w-full max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search sales, products, employees…"
              className="bg-transparent text-sm flex-1 focus:outline-none"
            />
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 h-10 rounded-lg border border-border bg-card">
              <span className="text-lg leading-none">{activeBiz.emoji}</span>
              <div className="leading-tight">
                <div className="text-[10px] text-muted-foreground uppercase font-medium">
                  Viewing:
                </div>
                <div className="text-xs font-semibold">{activeBiz.name}</div>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="w-10 h-10 grid place-items-center rounded-xl border border-border bg-card/35 hover:bg-muted/70 backdrop-blur-md relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
                )}
              </button>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-80 rounded-xl glass shadow-card p-2 z-40"
                >
                  <div className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      You’re all caught up. Notifications will appear when your workspace needs attention.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="px-3 py-2 rounded-lg hover:bg-muted/60 flex gap-3 items-start"
                      >
                        <span
                          className={cn(
                            "mt-1.5 w-2 h-2 rounded-full",
                            n.tone === "warning" && "bg-warning",
                            n.tone === "destructive" && "bg-destructive",
                            n.tone === "success" && "bg-success",
                            n.tone === "primary" && "bg-primary",
                          )}
                        />
                        <div className="flex-1">
                          <div className="text-sm">{n.title}</div>
                          <div className="text-xs text-muted-foreground">{n.time}</div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </div>

            <button
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              title={dark ? "Switch to light theme" : "Switch to dark theme"}
              className="w-10 h-10 grid place-items-center rounded-xl border border-border bg-card/35 hover:bg-muted/70 hover:-translate-y-0.5 backdrop-blur-md cursor-pointer transition"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
