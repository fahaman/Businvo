import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download, FileText, Sparkles } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { SafeResponsiveChart } from "@/components/safe-responsive-chart";
import { PageHeader, Panel } from "@/components/ui-bits";
import { fmt, useAccurateMonthlySeries, useAppData, useDynamicAiInsights } from "@/lib/app-store";
import { downloadReportPdf } from "@/lib/report-pdf";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Businvo" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { businessId } = useAuth();
  const { businesses, sales, expenses, inventory, employees } = useAppData();
  const series = useAccurateMonthlySeries(businessId);
  const aiInsights = useDynamicAiInsights(businessId);
  const isAll = businessId === "all";
  const selectedBusiness = isAll ? "All businesses" : businesses.find((b) => b.id === businessId)?.name ?? "Selected business";
  const scopedSales = isAll ? sales : sales.filter((s) => s.businessId === businessId);
  const scopedExpenses = isAll ? expenses : expenses.filter((e) => e.businessId === businessId);
  const scopedInventory = isAll ? inventory : inventory.filter((i) => i.businessId === businessId);
  const scopedEmployees = isAll ? employees : employees.filter((e) => e.businessId === businessId);
  const revenue = scopedSales.reduce((sum, sale) => sum + sale.amount, 0);
  const expenseTotal = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const profit = revenue - expenseTotal;
  const lowStock = scopedInventory.filter((item) => item.qty <= item.threshold);
  const compareData = businesses.map((business) => {
    const businessRevenue = sales.filter((s) => s.businessId === business.id).reduce((sum, s) => sum + s.amount, 0);
    const businessExpenses = expenses.filter((e) => e.businessId === business.id).reduce((sum, e) => sum + e.amount, 0);
    return { name: business.name, revenue: businessRevenue, expenses: businessExpenses, profit: businessRevenue - businessExpenses };
  });

  const generateReport = (kind: "executive" | "cashflow" | "audit") => {
    const title = kind === "executive" ? "Executive financial summary" : kind === "cashflow" ? "Sales and cashflow statement" : "Inventory and expense audit report";
    const lines = [
      `Generated: ${new Date().toLocaleDateString("en-IN")}`,
      `Scope: ${selectedBusiness}`,
      "",
      `Revenue: ${fmt(revenue)}`,
      `Expenses: ${fmt(expenseTotal)}`,
      `Net profit: ${fmt(profit)}`,
      `Profit margin: ${revenue ? ((profit / revenue) * 100).toFixed(1) : "0.0"}%`,
      "",
      "AI analysis based on current workspace data:",
      ...aiInsights.flatMap((insight) => [`- ${insight.title}`, `  ${insight.body}`]),
    ];

    if (kind === "cashflow") {
      const largestSale = [...scopedSales].sort((a, b) => b.amount - a.amount)[0];
      lines.push("", `Recorded sales: ${scopedSales.length}`, `Recorded expenses: ${scopedExpenses.length}`, largestSale ? `Largest sale: ${largestSale.product} (${fmt(largestSale.amount)})` : "Largest sale: No sales recorded", "", "Monthly activity:", ...series.map((month) => `${month.month}: revenue ${fmt(month.sales)} | expenses ${fmt(month.expenses)} | profit ${fmt(month.profit)}`));
    }

    if (kind === "audit") {
      const categoryTotals = scopedExpenses.reduce<Record<string, number>>((totals, expense) => {
        totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
        return totals;
      }, {});
      lines.push("", `Inventory units tracked: ${scopedInventory.reduce((sum, item) => sum + item.qty, 0)}`, `Low-stock items: ${lowStock.length}`, `Employees in scope: ${scopedEmployees.length}`, "", "Low-stock detail:", ...(lowStock.length ? lowStock.map((item) => `${item.name}: ${item.qty} remaining; threshold ${item.threshold}`) : ["No items are below their configured threshold."]), "", "Expense totals by category:", ...Object.entries(categoryTotals).map(([category, amount]) => `${category}: ${fmt(amount)}`));
    }

    downloadReportPdf(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`, title, lines);
    toast.success(`${title} downloaded`);
  };

  return (
    <>
      <PageHeader title="Reports & analytics" subtitle="Generate downloadable PDF reports from current workspace data and AI analysis." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Revenue, expenses & profit">
          <div className="h-72"><SafeResponsiveChart><AreaChart data={series} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}><defs><linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.6 0.24 280)" stopOpacity={0.5} /><stop offset="100%" stopColor="oklch(0.6 0.24 280)" stopOpacity={0} /></linearGradient><linearGradient id="reportProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0.45} /><stop offset="100%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value.toLocaleString()}`} /><Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Area type="monotone" dataKey="sales" name="Revenue" stroke="oklch(0.6 0.24 280)" fill="url(#reportRevenue)" strokeWidth={2.5} /><Area type="monotone" dataKey="profit" name="Profit" stroke="oklch(0.72 0.18 155)" fill="url(#reportProfit)" strokeWidth={2.5} /></AreaChart></SafeResponsiveChart></div>
        </Panel>
        <Panel title="Business comparison">
          {compareData.length === 0 ? <div className="py-20 text-center text-xs text-muted-foreground">Add businesses to compare financial performance.</div> : <div className="h-72"><SafeResponsiveChart><BarChart data={compareData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}><CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value.toLocaleString()}`} /><Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="revenue" name="Revenue" fill="oklch(0.6 0.24 280)" radius={[6, 6, 0, 0]} /><Bar dataKey="expenses" name="Expenses" fill="oklch(0.78 0.17 75)" radius={[6, 6, 0, 0]} /><Bar dataKey="profit" name="Profit" fill="oklch(0.72 0.18 155)" radius={[6, 6, 0, 0]} /></BarChart></SafeResponsiveChart></div>}
        </Panel>
      </div>
      <Panel title="Generate reports from actual data" className="mt-4">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">Reports are generated for <span className="font-medium text-foreground">{selectedBusiness}</span> using current sales, expenses, inventory, employees, and AI analysis. No demo files are included.</p></div>
        <div className="grid gap-3 md:grid-cols-3">
          {[{ kind: "executive" as const, name: "Executive financial summary", body: "Revenue, expenses, profit margin, and AI recommendations." }, { kind: "cashflow" as const, name: "Sales & cashflow statement", body: "Transactions, monthly activity, and the largest recorded sale." }, { kind: "audit" as const, name: "Inventory & expense audit", body: "Low-stock items, employees, and expense totals by category." }].map((report) => <div key={report.kind} className="rounded-2xl border border-border bg-card/45 p-4 backdrop-blur-xl"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-white shadow-glow"><FileText className="h-4 w-4" /></div><div className="font-medium text-sm">{report.name}</div></div><p className="mt-3 min-h-10 text-xs text-muted-foreground">{report.body}</p><button onClick={() => generateReport(report.kind)} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary text-xs font-medium text-white shadow-glow"><Download className="h-3.5 w-3.5" /> Generate & download PDF</button></div>)}
        </div>
      </Panel>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" /> Current totals: {fmt(revenue)} revenue · {fmt(expenseTotal)} expenses · {fmt(profit)} net profit.</div>
    </>
  );
}
