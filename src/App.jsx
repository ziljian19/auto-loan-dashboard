import { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from "recharts";

// ── NHTSA API ──────────────────────────────────────────────────────────────
const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles";

const POPULAR_MAKES = [
  "Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler",
  "Dodge","Ford","GMC","Honda","Hyundai","Infiniti","Jeep","Kia",
  "Land Rover","Lexus","Lincoln","Mazda","Mercedes-Benz","Mitsubishi",
  "Nissan","Ram","Subaru","Tesla","Toyota","Volkswagen","Volvo"
];

const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

function estimateMSRP(make, year) {
  const luxuryMakes = ["BMW","Mercedes-Benz","Audi","Lexus","Cadillac","Land Rover","Infiniti","Volvo","Lincoln"];
  const premiumMakes = ["Acura","Buick","Volkswagen","Tesla"];
  const base = luxuryMakes.includes(make) ? 55000
    : premiumMakes.includes(make) ? 38000
    : 32000;
  const yearAdj = (new Date().getFullYear() - Number(year)) * -1200;
  return Math.max(15000, base + yearAdj + Math.floor(Math.random() * 4000 - 2000));
}

// ── Constants ──────────────────────────────────────────────────────────────
const DEPRECIATION_RATES = { 1: 0.81, 2: 0.69, 3: 0.58, 4: 0.49, 5: 0.42 };

const LOAN_RATES = [
  { term: 24, rate: 5.49 },
  { term: 36, rate: 5.99 },
  { term: 48, rate: 6.49 },
  { term: 60, rate: 6.99 },
  { term: 72, rate: 7.49 },
  { term: 84, rate: 7.99 },
];

const CREDIT_RATE_ADJ = {
  "Excellent (750+)": -0.5,
  "Good (700–749)": 0,
  "Fair (650–699)": 1.0,
  "Below Fair (<650)": 2.5,
};

// ── Theme tokens ───────────────────────────────────────────────────────────
const DARK = {
  bg:          "bg-zinc-950",
  surface:     "bg-zinc-900",
  surfaceAlt:  "bg-zinc-800/50",
  border:      "border-zinc-700/60",
  borderSub:   "border-zinc-800",
  text:        "text-zinc-100",
  textSub:     "text-zinc-500",
  textMuted:   "text-zinc-600",
  textMd:      "text-zinc-400",
  textBody:    "text-zinc-300",
  textBodyAlt: "text-zinc-200",
  input:       "bg-zinc-800 border-zinc-700 text-zinc-100",
  inputFocus:  "focus:border-amber-500",
  rowHover:    "hover:bg-zinc-800/30",
  rowActive:   "bg-amber-500/5 border-amber-500/20",
  gridLine:    "#27272a",
  axisStroke:  "#52525b",
  tooltipBg:   "bg-zinc-900 border-zinc-700",
};

const LIGHT = {
  bg:          "bg-slate-100",
  surface:     "bg-white",
  surfaceAlt:  "bg-slate-50",
  border:      "border-slate-200",
  borderSub:   "border-slate-200",
  text:        "text-slate-900",
  textSub:     "text-slate-500",
  textMuted:   "text-slate-400",
  textMd:      "text-slate-600",
  textBody:    "text-slate-700",
  textBodyAlt: "text-slate-800",
  input:       "bg-white border-slate-300 text-slate-900",
  inputFocus:  "focus:border-amber-500",
  rowHover:    "hover:bg-slate-50",
  rowActive:   "bg-amber-500/5 border-amber-500/20",
  gridLine:    "#e2e8f0",
  axisStroke:  "#94a3b8",
  tooltipBg:   "bg-white border-slate-200",
};

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt  = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtD = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtPct = (n) => `${n.toFixed(2)}%`;

function calcMonthly(principal, annualRate, months) {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function buildAmortization(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
  const payment = calcMonthly(principal, annualRate, months);
  let balance = principal;
  const rows = [];
  let totalInterest = 0;
  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    rows.push({ month: i, payment, principal: principalPaid, interest, balance, totalInterest });
  }
  return rows;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, t }) {
  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-1 ${accent ? "border-amber-500/60 bg-amber-500/5" : `${t.border} ${t.surfaceAlt}`}`}>
      <span className={`text-xs font-mono uppercase tracking-widest ${t.textSub}`}>{label}</span>
      <span className={`text-2xl font-bold font-mono ${accent ? "text-amber-400" : t.text}`}>{value}</span>
      {sub && <span className={`text-xs ${t.textSub}`}>{sub}</span>}
    </div>
  );
}

function Select({ label, value, onChange, options, disabled, loading, t }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-mono uppercase tracking-widest ${t.textSub}`}>{label}</label>
        {loading && <span className="text-xs text-amber-500 font-mono animate-pulse">Loading…</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className={`border rounded px-3 py-2 text-sm font-mono focus:outline-none ${t.input} ${t.inputFocus} disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
      >
        {options.length === 0 && <option value="">—</option>}
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

function RangeInput({ label, value, onChange, min, max, step, format, t }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className={`text-xs font-mono uppercase tracking-widest ${t.textSub}`}>{label}</label>
        <span className="text-sm font-mono text-amber-500">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500 cursor-pointer"
      />
      <div className={`flex justify-between text-xs font-mono ${t.textMuted}`}>
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all duration-200 ${
        dark
          ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-amber-500 hover:text-amber-400"
          : "border-slate-300 bg-white text-slate-600 hover:border-amber-500 hover:text-amber-500"
      }`}
      title="Toggle light/dark mode"
    >
      <span className="text-sm">{dark ? "☀️" : "🌙"}</span>
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AutoLoanDashboard() {
  const [dark, setDark] = useState(true);
  const t = dark ? DARK : LIGHT;

  // Vehicle state
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [msrp, setMsrp] = useState(0);

  // API data
  const [models, setModels] = useState([]);
  const [recalls, setRecalls] = useState([]);

  // Loading states
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingRecalls, setLoadingRecalls] = useState(false);

  // Loan params
  const [downPayment, setDownPayment] = useState(5000);
  const [tradeIn, setTradeIn] = useState(0);
  const [termMonths, setTermMonths] = useState(60);
  const [creditScore, setCreditScore] = useState("Good (700–749)");

  // UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [amortPage, setAmortPage] = useState(0);
  const [apiError, setApiError] = useState("");

  const fetchModels = useCallback(async (selectedMake, selectedYear) => {
    if (!selectedMake) return;
    setLoadingModels(true);
    setApiError("");
    setModels([]);
    setModel("");
    try {
      const res = await fetch(
        `${NHTSA}/GetModelsForMakeYear/make/${encodeURIComponent(selectedMake)}/modelyear/${selectedYear}?format=json`
      );
      const data = await res.json();
      const list = (data.Results || []).map((r) => r.Model_Name).filter(Boolean).sort();
      const unique = [...new Set(list)];
      setModels(unique);
      if (unique.length > 0) {
        setModel(unique[0]);
        setMsrp(estimateMSRP(selectedMake, selectedYear));
      }
    } catch {
      setApiError("Could not load models. Check your connection.");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const fetchRecalls = useCallback(async (selectedMake, selectedModel, selectedYear) => {
    if (!selectedMake || !selectedModel) return;
    setLoadingRecalls(true);
    setRecalls([]);
    try {
      const res = await fetch(
        `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&modelYear=${selectedYear}`
      );
      const data = await res.json();
      setRecalls(data.results || []);
    } catch {
      setRecalls([]);
    } finally {
      setLoadingRecalls(false);
    }
  }, []);

  useEffect(() => {
    setMake("Ford");
    fetchModels("Ford", String(new Date().getFullYear()));
  }, [fetchModels]);

  useEffect(() => {
    if (make && model && year) fetchRecalls(make, model, year);
  }, [make, model, year, fetchRecalls]);

  const handleMakeChange  = (v) => { setMake(v); fetchModels(v, year); };
  const handleYearChange  = (v) => { setYear(v); if (make) fetchModels(make, v); };
  const handleModelChange = (v) => { setModel(v); setMsrp(estimateMSRP(make, year)); };

  const adjRate      = Math.max(0.99, (LOAN_RATES.find((r) => r.term === termMonths)?.rate || 6.99) + (CREDIT_RATE_ADJ[creditScore] || 0));
  const principal    = Math.max(0, msrp - downPayment - tradeIn);
  const monthly      = calcMonthly(principal, adjRate, termMonths);
  const totalPaid    = monthly * termMonths;
  const totalInterest = totalPaid - principal;

  const amortData = useMemo(() => buildAmortization(principal, adjRate, termMonths), [principal, adjRate, termMonths]);

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(termMonths / 24));
    return amortData
      .filter((_, i) => i % step === 0 || i === amortData.length - 1)
      .map((r) => ({ month: r.month, Balance: Math.round(r.balance), Interest: Math.round(r.totalInterest) }));
  }, [amortData, termMonths]);

  const deprData = useMemo(() => [
    { year: "Now", value: msrp },
    ...Object.entries(DEPRECIATION_RATES).map(([yr, rate]) => ({ year: `Yr ${yr}`, value: Math.round(msrp * rate) })),
  ], [msrp]);

  const rateCompData = LOAN_RATES.map((lr) => {
    const r = Math.max(0.99, lr.rate + (CREDIT_RATE_ADJ[creditScore] || 0));
    const m = calcMonthly(principal, r, lr.term);
    return { term: `${lr.term}mo`, monthly: Math.round(m), total: Math.round(m * lr.term), rate: r };
  });

  const AMORT_PAGE_SIZE  = 12;
  const amortPageData    = amortData.slice(amortPage * AMORT_PAGE_SIZE, (amortPage + 1) * AMORT_PAGE_SIZE);
  const totalAmortPages  = Math.ceil(amortData.length / AMORT_PAGE_SIZE);

  const tabs = ["overview", "amortization", "comparison", "depreciation", "recalls"];

  // Tooltip for charts — themed
  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`border rounded p-3 text-xs font-mono shadow-lg ${t.tooltipBg} ${t.text}`}>
        <p className={`${t.textMd} mb-1`}>Month {label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtD(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} transition-colors duration-200`} style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className={`border-b ${t.borderSub} ${t.surface}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">AL</span>
            </div>
            <div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-xl font-bold tracking-wide uppercase ${t.text}`}>
                AutoLoan <span className="text-amber-500">Research</span>
              </h1>
              <p className={`text-xs font-mono ${t.textMuted}`}>Vehicle Financing Intelligence Platform · Powered by NHTSA</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />
            <div className={`hidden md:flex items-center gap-2 text-xs font-mono ${t.textMuted}`}>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
              Live Data · {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

          {/* Vehicle Selector */}
          <div className={`rounded-lg border ${t.border} ${t.surface} p-4 flex flex-col gap-4`}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd}`}>
              Vehicle <span className="text-amber-500/60 text-xs normal-case font-mono">· NHTSA Live</span>
            </h2>
            {apiError && (
              <div className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {apiError}
              </div>
            )}
            <Select label="Make"  value={make}  onChange={handleMakeChange}  options={POPULAR_MAKES} t={t} />
            <Select label="Year"  value={year}  onChange={handleYearChange}  options={YEARS} t={t} />
            <Select label="Model" value={model} onChange={handleModelChange} options={models} loading={loadingModels} disabled={!make} t={t} />
            <div className={`pt-2 border-t ${t.borderSub}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-mono uppercase tracking-widest ${t.textSub}`}>Est. MSRP</span>
                <span className="text-lg font-bold text-amber-500 font-mono">{msrp > 0 ? fmt(msrp) : "—"}</span>
              </div>
              <p className={`text-xs font-mono ${t.textMuted}`}>Estimated · varies by trim & region</p>
            </div>
          </div>

          {/* Loan Configuration */}
          <div className={`rounded-lg border ${t.border} ${t.surface} p-4 flex flex-col gap-5`}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd}`}>Loan Parameters</h2>
            <RangeInput label="Down Payment"  value={downPayment} onChange={setDownPayment} min={0} max={Math.max(1000, Math.round(msrp * 0.5))} step={500} format={fmt} t={t} />
            <RangeInput label="Trade-In Value" value={tradeIn}    onChange={setTradeIn}     min={0} max={30000} step={500} format={fmt} t={t} />
            <RangeInput label="Loan Term"      value={termMonths} onChange={(v) => { setTermMonths(v); setAmortPage(0); }} min={24} max={84} step={12} format={(v) => `${v} mo`} t={t} />
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-mono uppercase tracking-widest ${t.textSub}`}>Credit Score</label>
              <select value={creditScore} onChange={(e) => setCreditScore(e.target.value)}
                className={`border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors ${t.input}`}>
                {Object.keys(CREDIT_RATE_ADJ).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={`pt-2 border-t ${t.borderSub} flex justify-between`}>
              <span className={`text-xs font-mono uppercase tracking-widest ${t.textSub}`}>Your Rate</span>
              <span className="text-sm font-bold text-amber-500 font-mono">{fmtPct(adjRate)} APR</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-4">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Monthly Payment" value={monthly > 0 ? fmtD(monthly) : "—"} sub={`${termMonths} months`} accent t={t} />
            <StatCard label="Loan Amount"     value={principal > 0 ? fmt(principal) : "—"} sub="After down + trade-in" t={t} />
            <StatCard label="Total Interest"  value={totalInterest > 0 ? fmt(totalInterest) : "—"} sub={principal > 0 ? fmtPct((totalInterest / principal) * 100) + " of principal" : ""} t={t} />
            <StatCard label="Total Cost"      value={msrp > 0 ? fmt(totalPaid + downPayment + tradeIn) : "—"} sub="All-in purchase cost" t={t} />
          </div>

          {/* Tabs */}
          <div className={`flex gap-1 border-b ${t.borderSub} overflow-hidden`}>
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab ? "border-amber-500 text-amber-500" : `border-transparent ${t.textSub} hover:${t.textMd}`
                }`}>
                {tab === "recalls" ? (
                  <span className="flex items-center gap-1.5">
                    Recalls
                    {recalls.length > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0 leading-4">{recalls.length}</span>
                    )}
                  </span>
                ) : tab}
              </button>
            ))}
          </div>

          {/* Tab: Overview */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-4">
              {msrp === 0 ? (
                <div className={`rounded-lg border ${t.border} ${t.surface} p-8 text-center ${t.textSub} font-mono text-sm`}>
                  Select a vehicle to view financing data
                </div>
              ) : (
                <>
                  <div className={`rounded-lg border ${t.border} ${t.surface} p-4`}>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd} mb-4`}>Balance vs. Interest Paid Over Time</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#64748b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} />
                        <XAxis dataKey="month" stroke={t.axisStroke} tick={{ fontSize: 10, fontFamily: "monospace" }} />
                        <YAxis stroke={t.axisStroke} tick={{ fontSize: 10, fontFamily: "monospace" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                        <Area type="monotone" dataKey="Balance"  stroke="#f59e0b" fill="url(#balGrad)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="Interest" stroke="#64748b" fill="url(#intGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={`rounded-lg border ${t.border} ${t.surface} p-4`}>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd} mb-4`}>Payment Breakdown</h3>
                    <div className="flex flex-col gap-3">
                      {[
                        { label: "Vehicle Est. MSRP", val: msrp,          pct: 100 },
                        { label: "Down Payment",       val: -downPayment,  pct: (downPayment / msrp) * 100, neg: true },
                        { label: "Trade-In Credit",    val: -tradeIn,      pct: (tradeIn / msrp) * 100,     neg: true },
                        { label: "Loan Principal",     val: principal,     pct: (principal / msrp) * 100 },
                        { label: "Total Interest",     val: totalInterest, pct: (totalInterest / msrp) * 100, interest: true },
                      ].map(({ label, val, pct, neg, interest }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className={`text-xs font-mono w-44 shrink-0 ${t.textSub}`}>{label}</span>
                          <div className={`flex-1 ${dark ? "bg-zinc-800" : "bg-slate-200"} rounded-full h-2 overflow-hidden`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${interest ? (dark ? "bg-zinc-500" : "bg-slate-400") : neg ? "bg-red-500/50" : "bg-amber-500"}`}
                              style={{ width: `${Math.min(100, Math.abs(pct))}%` }} />
                          </div>
                          <span className={`text-xs font-mono w-24 text-right ${neg ? "text-red-500" : interest ? t.textSub : "text-amber-500"}`}>
                            {neg ? "-" : ""}{fmt(Math.abs(val))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Amortization */}
          {activeTab === "amortization" && (
            <div className={`rounded-lg border ${t.border} ${t.surface} p-4`}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd} mb-4`}>
                Amortization Schedule · {termMonths} Payments
              </h3>
              {msrp === 0 ? (
                <div className={`text-center ${t.textSub} font-mono text-sm py-8`}>Select a vehicle to view schedule</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className={`${t.textSub} border-b ${t.borderSub}`}>
                          {["Mo", "Payment", "Principal", "Interest", "Balance", "Total Interest"].map((h) => (
                            <th key={h} className="text-right py-2 px-2 first:text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {amortPageData.map((r) => (
                          <tr key={r.month} className={`border-b ${t.borderSub} ${t.rowHover} transition-colors`}>
                            <td className={`py-2 px-2 ${t.textSub}`}>{r.month}</td>
                            <td className={`py-2 px-2 text-right ${t.textBody}`}>{fmtD(r.payment)}</td>
                            <td className="py-2 px-2 text-right text-amber-500">{fmtD(r.principal)}</td>
                            <td className={`py-2 px-2 text-right ${t.textSub}`}>{fmtD(r.interest)}</td>
                            <td className={`py-2 px-2 text-right ${t.textBody}`}>{fmtD(r.balance)}</td>
                            <td className="py-2 px-2 text-right text-red-400">{fmtD(r.totalInterest)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-xs font-mono ${t.textMuted}`}>Page {amortPage + 1} of {totalAmortPages}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setAmortPage(Math.max(0, amortPage - 1))} disabled={amortPage === 0}
                        className={`px-3 py-1 text-xs font-mono border ${t.border} rounded ${t.textMd} hover:border-amber-500 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}>
                        ← Prev
                      </button>
                      <button onClick={() => setAmortPage(Math.min(totalAmortPages - 1, amortPage + 1))} disabled={amortPage >= totalAmortPages - 1}
                        className={`px-3 py-1 text-xs font-mono border ${t.border} rounded ${t.textMd} hover:border-amber-500 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}>
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Comparison */}
          {activeTab === "comparison" && (
            <div className="flex flex-col gap-4">
              <div className={`rounded-lg border ${t.border} ${t.surface} p-4`}>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd} mb-4`}>Monthly Payment by Loan Term</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rateCompData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} />
                    <XAxis dataKey="term" stroke={t.axisStroke} tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis stroke={t.axisStroke} tick={{ fontSize: 10, fontFamily: "monospace" }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <div className={`border rounded p-3 text-xs font-mono shadow-lg ${t.tooltipBg} ${t.text}`}>
                        <p className={`${t.textMd} mb-1`}>{label}</p>
                        <p className="text-amber-500">Monthly: {fmtD(payload[0]?.value)}</p>
                      </div>
                    ) : null} />
                    <Bar dataKey="monthly" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={`rounded-lg border ${t.border} ${t.surface} p-4`}>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd} mb-3`}>Full Term Comparison</h3>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className={`${t.textSub} border-b ${t.borderSub}`}>
                      {["Term", "APR", "Monthly", "Total Paid", "Total Interest"].map((h) => (
                        <th key={h} className="text-right py-2 px-2 first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rateCompData.map((r) => (
                      <tr key={r.term} className={`border-b ${t.borderSub} transition-colors ${r.term === `${termMonths}mo` ? t.rowActive : t.rowHover}`}>
                        <td className={`py-2 px-2 font-bold ${r.term === `${termMonths}mo` ? "text-amber-500" : t.textMd}`}>{r.term} {r.term === `${termMonths}mo` ? "●" : ""}</td>
                        <td className={`py-2 px-2 text-right ${t.textMd}`}>{fmtPct(r.rate)}</td>
                        <td className={`py-2 px-2 text-right ${t.textBodyAlt}`}>{fmtD(r.monthly)}</td>
                        <td className={`py-2 px-2 text-right ${t.textBody}`}>{fmt(r.total)}</td>
                        <td className="py-2 px-2 text-right text-red-400">{fmt(r.total - principal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Depreciation */}
          {activeTab === "depreciation" && (
            <div className="flex flex-col gap-4">
              <div className={`rounded-lg border ${t.border} ${t.surface} p-4`}>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd} mb-4`}>
                  Estimated Vehicle Value · {year} {make} {model}
                </h3>
                {msrp === 0 ? (
                  <div className={`text-center ${t.textSub} font-mono text-sm py-8`}>Select a vehicle to view depreciation</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={deprData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} />
                      <XAxis dataKey="year" stroke={t.axisStroke} tick={{ fontSize: 10, fontFamily: "monospace" }} />
                      <YAxis stroke={t.axisStroke} tick={{ fontSize: 10, fontFamily: "monospace" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                        <div className={`border rounded p-3 text-xs font-mono shadow-lg ${t.tooltipBg} ${t.text}`}>
                          <p className={`${t.textMd} mb-1`}>{label}</p>
                          <p className="text-amber-500">Est. Value: {fmt(payload[0]?.value)}</p>
                          <p className={t.textSub}>Loss: {fmt(msrp - payload[0]?.value)}</p>
                        </div>
                      ) : null} />
                      <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              {msrp > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(DEPRECIATION_RATES).map(([yr, rate]) => {
                    const val     = Math.round(msrp * rate);
                    const loanBal = amortData[Math.min(Number(yr) * 12 - 1, amortData.length - 1)]?.balance || 0;
                    const equity  = val - loanBal;
                    return (
                      <div key={yr} className={`rounded-lg border p-3 ${equity < 0 ? "border-red-500/30 bg-red-500/5" : `${t.border} ${t.surfaceAlt}`}`}>
                        <p className={`text-xs font-mono uppercase tracking-widest ${t.textSub}`}>Year {yr}</p>
                        <p className={`text-base font-bold font-mono mt-1 ${t.text}`}>{fmt(val)}</p>
                        <p className={`text-xs mt-1 ${t.textSub}`}>Loan bal: {fmt(loanBal)}</p>
                        <p className={`text-xs font-bold mt-0.5 ${equity < 0 ? "text-red-400" : "text-green-500"}`}>
                          Equity: {equity < 0 ? "-" : "+"}{fmt(Math.abs(equity))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Recalls */}
          {activeTab === "recalls" && (
            <div className={`rounded-lg border ${t.border} ${t.surface} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-sm font-bold uppercase tracking-widest ${t.textMd}`}>
                  NHTSA Recalls · {year} {make} {model}
                </h3>
                {recalls.length > 0 && (
                  <span className="text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded px-2 py-0.5">
                    {recalls.length} recall{recalls.length !== 1 ? "s" : ""} found
                  </span>
                )}
              </div>
              {loadingRecalls ? <Spinner /> : !model ? (
                <p className={`${t.textSub} font-mono text-sm text-center py-8`}>Select a vehicle to check recalls</p>
              ) : recalls.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <span className="text-2xl">✓</span>
                  <p className="text-green-500 font-mono text-sm">No recalls found for this vehicle</p>
                  <p className={`${t.textMuted} font-mono text-xs`}>Data sourced from NHTSA · api.nhtsa.gov</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recalls.map((r, i) => (
                    <div key={i} className="border border-red-500/20 bg-red-500/5 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-bold text-red-400 font-mono">{r.Component || "Unknown Component"}</p>
                        <span className={`text-xs font-mono whitespace-nowrap ${t.textSub}`}>{r.ReportReceivedDate?.split("T")[0] || ""}</span>
                      </div>
                      <p className={`text-xs font-mono leading-relaxed mb-2 ${t.textBody}`}>{r.Summary || "No summary available."}</p>
                      {r.Remedy && (
                        <div className="mt-2 pt-2 border-t border-red-500/10">
                          <p className={`text-xs font-mono uppercase tracking-widest mb-1 ${t.textSub}`}>Remedy</p>
                          <p className={`text-xs font-mono ${t.textBody}`}>{r.Remedy}</p>
                        </div>
                      )}
                      {r.NHTSACampaignNumber && (
                        <p className={`text-xs font-mono mt-2 ${t.textMuted}`}>Campaign #{r.NHTSACampaignNumber}</p>
                      )}
                    </div>
                  ))}
                  <p className={`text-xs font-mono text-center pt-2 ${t.textMuted}`}>Data sourced live from NHTSA · api.nhtsa.gov</p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
