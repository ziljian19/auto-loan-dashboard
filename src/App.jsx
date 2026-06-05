import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from "recharts";

// ── Mock Data ──────────────────────────────────────────────────────────────
const VEHICLES = {
  Ford: {
    "F-150": {
      2024: { XL: 32000, XLT: 38500, Lariat: 47000, Platinum: 62000 },
      2023: { XL: 29500, XLT: 35000, Lariat: 43500, Platinum: 57000 },
      2022: { XL: 27000, XLT: 31500, Lariat: 39000, Platinum: 51000 },
    },
    Mustang: {
      2024: { EcoBoost: 31000, GT: 42000, "GT Premium": 49000, "Dark Horse": 62000 },
      2023: { EcoBoost: 28500, GT: 38500, "GT Premium": 45000 },
      2022: { EcoBoost: 26000, GT: 35000, "GT Premium": 41000 },
    },
    Explorer: {
      2024: { Base: 36000, XLT: 41000, Limited: 52000, Platinum: 63000 },
      2023: { Base: 33000, XLT: 38000, Limited: 48000 },
      2022: { Base: 30500, XLT: 35000, Limited: 44000 },
    },
  },
  Toyota: {
    Camry: {
      2024: { LE: 27000, SE: 29500, XSE: 32000, XLE: 34000 },
      2023: { LE: 25000, SE: 27500, XSE: 30000, XLE: 31500 },
      2022: { LE: 23000, SE: 25000, XSE: 27500, XLE: 29000 },
    },
    "4Runner": {
      2024: { SR5: 41000, TRD: 46000, Limited: 51000, "TRD Pro": 57000 },
      2023: { SR5: 38000, TRD: 43000, Limited: 47500 },
      2022: { SR5: 35500, TRD: 40000, Limited: 44000 },
    },
    Tacoma: {
      2024: { SR: 30000, SR5: 34000, TRD: 40000, Limited: 45000 },
      2023: { SR: 28000, SR5: 31500, TRD: 37000 },
      2022: { SR: 26000, SR5: 29000, TRD: 34500 },
    },
  },
  BMW: {
    "3 Series": {
      2024: { "330i": 44000, "330i xDrive": 46500, "M340i": 58000, "M340i xDrive": 60500 },
      2023: { "330i": 41000, "330i xDrive": 43500, "M340i": 55000 },
      2022: { "330i": 38500, "330i xDrive": 41000, "M340i": 51500 },
    },
    "5 Series": {
      2024: { "530i": 56000, "530i xDrive": 58500, "540i xDrive": 67000, "M550i xDrive": 83000 },
      2023: { "530i": 53000, "530i xDrive": 55500, "M550i xDrive": 78000 },
      2022: { "530i": 50000, "530i xDrive": 52500 },
    },
    X5: {
      2024: { "sDrive40i": 65000, "xDrive40i": 67500, "xDrive50e": 72000, "M60i": 96000 },
      2023: { "sDrive40i": 61000, "xDrive40i": 63500, "M60i": 90000 },
      2022: { "sDrive40i": 57500, "xDrive40i": 60000 },
    },
  },
  Honda: {
    Accord: {
      2024: { LX: 28000, Sport: 30500, EX: 33000, "Touring": 38000 },
      2023: { LX: 26000, Sport: 28000, EX: 30500 },
      2022: { LX: 24000, Sport: 26000, EX: 28500 },
    },
    "CR-V": {
      2024: { LX: 30000, EX: 34000, "EX-L": 37000, Touring: 40000 },
      2023: { LX: 28000, EX: 32000, "EX-L": 35000 },
      2022: { LX: 26000, EX: 29500, "EX-L": 32500 },
    },
    Pilot: {
      2024: { Sport: 38000, EX: 42000, "EX-L": 45500, Touring: 49000 },
      2023: { Sport: 35500, EX: 39000, "EX-L": 42500 },
      2022: { Sport: 33000, EX: 36500 },
    },
  },
};

const DEPRECIATION_RATES = { 1: 0.81, 2: 0.69, 3: 0.58, 4: 0.49, 5: 0.42 };

const LOAN_RATES = [
  { term: 24, rate: 5.49 },
  { term: 36, rate: 5.99 },
  { term: 48, rate: 6.49 },
  { term: 60, rate: 6.99 },
  { term: 72, rate: 7.49 },
  { term: 84, rate: 7.99 },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
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
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-1 ${accent ? "border-amber-500/60 bg-amber-500/5" : "border-zinc-700/60 bg-zinc-800/50"}`}>
      <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">{label}</span>
      <span className={`text-2xl font-bold font-mono ${accent ? "text-amber-400" : "text-zinc-100"}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

function Select({ label, value, onChange, options, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function RangeInput({ label, value, onChange, min, max, step, format }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">{label}</label>
        <span className="text-sm font-mono text-amber-400">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-zinc-600 font-mono">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded p-3 text-xs font-mono">
      <p className="text-zinc-400 mb-1">Month {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtD(p.value)}</p>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function AutoLoanDashboard() {
  const makes = Object.keys(VEHICLES);
  const [make, setMake] = useState("Ford");
  const [model, setModel] = useState("F-150");
  const [year, setYear] = useState("2024");
  const [trim, setTrim] = useState("XLT");
  const [downPayment, setDownPayment] = useState(5000);
  const [tradeIn, setTradeIn] = useState(0);
  const [termMonths, setTermMonths] = useState(60);
  const [creditScore, setCreditScore] = useState("Good (700–749)");
  const [activeTab, setActiveTab] = useState("overview");
  const [amortPage, setAmortPage] = useState(0);

  const creditRateAdj = { "Excellent (750+)": -0.5, "Good (700–749)": 0, "Fair (650–699)": 1.0, "Below Fair (<650)": 2.5 };

  const models = Object.keys(VEHICLES[make]);
  const years = Object.keys(VEHICLES[make][model] || {}).sort((a, b) => b - a);
  const trims = Object.keys(VEHICLES[make]?.[model]?.[year] || {});

  const msrp = VEHICLES[make]?.[model]?.[year]?.[trim] || 0;
  const baseRate = LOAN_RATES.find((r) => r.term === termMonths)?.rate || 6.99;
  const adjRate = Math.max(0.99, baseRate + (creditRateAdj[creditScore] || 0));
  const principal = Math.max(0, msrp - downPayment - tradeIn);
  const monthly = calcMonthly(principal, adjRate, termMonths);
  const totalPaid = monthly * termMonths;
  const totalInterest = totalPaid - principal;

  const amortData = useMemo(() => buildAmortization(principal, adjRate, termMonths), [principal, adjRate, termMonths]);

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(termMonths / 24));
    return amortData.filter((_, i) => i % step === 0 || i === amortData.length - 1).map((r) => ({
      month: r.month,
      Balance: Math.round(r.balance),
      Interest: Math.round(r.totalInterest),
    }));
  }, [amortData, termMonths]);

  const deprData = useMemo(() => [
    { year: "Now", value: msrp },
    ...Object.entries(DEPRECIATION_RATES).map(([yr, rate]) => ({
      year: `Yr ${yr}`, value: Math.round(msrp * rate),
    })),
  ], [msrp]);

  const rateCompData = LOAN_RATES.map((lr) => {
    const r = Math.max(0.99, lr.rate + (creditRateAdj[creditScore] || 0));
    const m = calcMonthly(principal, r, lr.term);
    return { term: `${lr.term}mo`, monthly: Math.round(m), total: Math.round(m * lr.term), rate: r };
  });

  const AMORT_PAGE_SIZE = 12;
  const amortPageData = amortData.slice(amortPage * AMORT_PAGE_SIZE, (amortPage + 1) * AMORT_PAGE_SIZE);
  const totalAmortPages = Math.ceil(amortData.length / AMORT_PAGE_SIZE);

  const handleMakeChange = (v) => {
    setMake(v);
    const newModel = Object.keys(VEHICLES[v])[0];
    setModel(newModel);
    const newYear = Object.keys(VEHICLES[v][newModel]).sort((a, b) => b - a)[0];
    setYear(newYear);
    const newTrim = Object.keys(VEHICLES[v][newModel][newYear])[0];
    setTrim(newTrim);
  };
  const handleModelChange = (v) => {
    setModel(v);
    const newYear = Object.keys(VEHICLES[make][v]).sort((a, b) => b - a)[0];
    setYear(newYear);
    const newTrim = Object.keys(VEHICLES[make][v][newYear])[0];
    setTrim(newTrim);
  };
  const handleYearChange = (v) => {
    setYear(v);
    const newTrim = Object.keys(VEHICLES[make][model][v])[0];
    setTrim(newTrim);
  };

  const tabs = ["overview", "amortization", "comparison", "depreciation"];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-xs">AL</span>
          </div>
          <div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-xl font-bold tracking-wide text-zinc-100 uppercase">
              AutoLoan <span className="text-amber-400">Research</span>
            </h1>
            <p className="text-xs text-zinc-600 font-mono">Vehicle Financing Intelligence Platform</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-600 font-mono">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
          Live Rate Engine · {new Date().toLocaleDateString()}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* Sidebar: Vehicle + Loan Config */}
        <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

          {/* Vehicle Selector */}
          <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-4 flex flex-col gap-4">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-sm font-bold uppercase tracking-widest text-zinc-400">Vehicle</h2>
            <Select label="Make" value={make} onChange={handleMakeChange} options={makes} />
            <Select label="Model" value={model} onChange={handleModelChange} options={models} />
            <Select label="Year" value={year} onChange={handleYearChange} options={years} />
            <Select label="Trim" value={trim} onChange={setTrim} options={trims} />
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">MSRP</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{fmt(msrp)}</span>
              </div>
            </div>
          </div>

          {/* Loan Configuration */}
          <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-4 flex flex-col gap-5">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-sm font-bold uppercase tracking-widest text-zinc-400">Loan Parameters</h2>
            <RangeInput label="Down Payment" value={downPayment} onChange={setDownPayment} min={0} max={Math.round(msrp * 0.5)} step={500} format={fmt} />
            <RangeInput label="Trade-In Value" value={tradeIn} onChange={setTradeIn} min={0} max={30000} step={500} format={fmt} />
            <RangeInput label="Loan Term" value={termMonths} onChange={(v) => { setTermMonths(v); setAmortPage(0); }} min={24} max={84} step={12} format={(v) => `${v} mo`} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Credit Score</label>
              <select value={creditScore} onChange={(e) => setCreditScore(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors">
                {Object.keys(creditRateAdj).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between">
              <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Your Rate</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{fmtPct(adjRate)} APR</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-4">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Monthly Payment" value={fmtD(monthly)} sub={`${termMonths} months`} accent />
            <StatCard label="Loan Amount" value={fmt(principal)} sub="After down + trade-in" />
            <StatCard label="Total Interest" value={fmt(totalInterest)} sub={fmtPct((totalInterest / principal) * 100) + " of principal"} />
            <StatCard label="Total Cost" value={fmt(totalPaid + downPayment + tradeIn)} sub="All-in purchase cost" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-800">
            {tabs.map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px ${activeTab === t ? "border-amber-500 text-amber-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab: Overview */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-4">
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Balance vs. Interest Paid Over Time</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#52525b" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis stroke="#52525b" tick={{ fontSize: 10, fontFamily: "monospace" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                    <Area type="monotone" dataKey="Balance" stroke="#f59e0b" fill="url(#balGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Interest" stroke="#64748b" fill="url(#intGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-4">
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Payment Breakdown</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Vehicle Price (MSRP)", val: msrp, pct: 100 },
                    { label: "Down Payment", val: -downPayment, pct: (downPayment / msrp) * 100, neg: true },
                    { label: "Trade-In Credit", val: -tradeIn, pct: (tradeIn / msrp) * 100, neg: true },
                    { label: "Loan Principal", val: principal, pct: (principal / msrp) * 100 },
                    { label: "Total Interest", val: totalInterest, pct: (totalInterest / msrp) * 100, interest: true },
                  ].map(({ label, val, pct, neg, interest }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 font-mono w-44 shrink-0">{label}</span>
                      <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${interest ? "bg-zinc-500" : neg ? "bg-red-500/50" : "bg-amber-500"}`}
                          style={{ width: `${Math.min(100, Math.abs(pct))}%` }} />
                      </div>
                      <span className={`text-xs font-mono w-24 text-right ${neg ? "text-red-400" : interest ? "text-zinc-400" : "text-amber-400"}`}>
                        {neg ? "-" : ""}{fmt(Math.abs(val))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Amortization */}
          {activeTab === "amortization" && (
            <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-4">
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
                Amortization Schedule · {termMonths} Payments
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      {["Mo", "Payment", "Principal", "Interest", "Balance", "Total Interest"].map((h) => (
                        <th key={h} className="text-right py-2 px-2 first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {amortPageData.map((r) => (
                      <tr key={r.month} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2 px-2 text-zinc-500">{r.month}</td>
                        <td className="py-2 px-2 text-right text-zinc-300">{fmtD(r.payment)}</td>
                        <td className="py-2 px-2 text-right text-amber-400">{fmtD(r.principal)}</td>
                        <td className="py-2 px-2 text-right text-zinc-500">{fmtD(r.interest)}</td>
                        <td className="py-2 px-2 text-right text-zinc-300">{fmtD(r.balance)}</td>
                        <td className="py-2 px-2 text-right text-red-400/70">{fmtD(r.totalInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-zinc-600 font-mono">Page {amortPage + 1} of {totalAmortPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setAmortPage(Math.max(0, amortPage - 1))} disabled={amortPage === 0}
                    className="px-3 py-1 text-xs font-mono border border-zinc-700 rounded text-zinc-400 hover:border-amber-500 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    ← Prev
                  </button>
                  <button onClick={() => setAmortPage(Math.min(totalAmortPages - 1, amortPage + 1))} disabled={amortPage >= totalAmortPages - 1}
                    className="px-3 py-1 text-xs font-mono border border-zinc-700 rounded text-zinc-400 hover:border-amber-500 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Comparison */}
          {activeTab === "comparison" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-4">
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Monthly Payment by Loan Term</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rateCompData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="term" stroke="#52525b" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis stroke="#52525b" tick={{ fontSize: 10, fontFamily: "monospace" }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="bg-zinc-900 border border-zinc-700 rounded p-3 text-xs font-mono">
                        <p className="text-zinc-400 mb-1">{label}</p>
                        <p className="text-amber-400">Monthly: {fmtD(payload[0]?.value)}</p>
                      </div>
                    ) : null} />
                    <Bar dataKey="monthly" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-4">
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">Full Term Comparison</h3>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      {["Term", "APR", "Monthly", "Total Paid", "Total Interest"].map((h) => (
                        <th key={h} className="text-right py-2 px-2 first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rateCompData.map((r) => (
                      <tr key={r.term} className={`border-b border-zinc-800/50 transition-colors ${r.term === `${termMonths}mo` ? "bg-amber-500/5 border-amber-500/20" : "hover:bg-zinc-800/30"}`}>
                        <td className={`py-2 px-2 font-bold ${r.term === `${termMonths}mo` ? "text-amber-400" : "text-zinc-400"}`}>{r.term} {r.term === `${termMonths}mo` ? "●" : ""}</td>
                        <td className="py-2 px-2 text-right text-zinc-400">{fmtPct(r.rate)}</td>
                        <td className="py-2 px-2 text-right text-zinc-200">{fmtD(r.monthly)}</td>
                        <td className="py-2 px-2 text-right text-zinc-300">{fmt(r.total)}</td>
                        <td className="py-2 px-2 text-right text-red-400/70">{fmt(r.total - principal)}</td>
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
              <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-4">
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
                  Estimated Vehicle Value · {year} {make} {model} {trim}
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={deprData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="year" stroke="#52525b" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis stroke="#52525b" tick={{ fontSize: 10, fontFamily: "monospace" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="bg-zinc-900 border border-zinc-700 rounded p-3 text-xs font-mono">
                        <p className="text-zinc-400 mb-1">{label}</p>
                        <p className="text-amber-400">Est. Value: {fmt(payload[0]?.value)}</p>
                        <p className="text-zinc-500">Loss: {fmt(msrp - payload[0]?.value)}</p>
                      </div>
                    ) : null} />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(DEPRECIATION_RATES).map(([yr, rate]) => {
                  const val = Math.round(msrp * rate);
                  const loanBal = amortData[Math.min(yr * 12 - 1, amortData.length - 1)]?.balance || 0;
                  const equity = val - loanBal;
                  return (
                    <div key={yr} className={`rounded-lg border p-3 ${equity < 0 ? "border-red-500/30 bg-red-500/5" : "border-zinc-700/60 bg-zinc-800/50"}`}>
                      <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Year {yr}</p>
                      <p className="text-base font-bold font-mono text-zinc-100 mt-1">{fmt(val)}</p>
                      <p className="text-xs text-zinc-500 mt-1">Loan bal: {fmt(loanBal)}</p>
                      <p className={`text-xs font-bold mt-0.5 ${equity < 0 ? "text-red-400" : "text-green-400"}`}>
                        Equity: {equity < 0 ? "-" : "+"}{fmt(Math.abs(equity))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
