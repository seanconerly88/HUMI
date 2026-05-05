import { useState } from "react";
import { PieChart, Pie, Cell } from "recharts";

const HUMI_BROWN = "#8B4513";
const HUMI_LIGHT = "#faf5ef";
const HUMI_BORDER = "#f0e6d3";

// ── Profile definitions ───────────────────────────────────────────────────────
const PROFILES = {
  Craftsman: {
    blurb: "Bold and deliberate. Every smoke is a conviction, not a habit.",
    weightedAvg: 4.1,
    color: "#5c2d0e",
    voiceWords: ["aggressive draw", "chewy finish", "earned it"],
    voice: "words like these show up across your notes — you're not describing cigars, you're holding them accountable. When something earns your score, it's because it proved it.",
  },
  Traditionalist: {
    blurb: "The benchmark. Medium strength isn't the safe choice — it's the standard.",
    weightedAvg: 3.0,
    color: "#8B4513",
    voiceWords: ["balanced", "consistent burn", "smooth transition"],
    voice: "your notes keep coming back to words like these — you're grading against a standard most people haven't defined. When something breaks from that, you notice immediately.",
  },
  Gentleman: {
    blurb: "Ease over edge. Lighter smokes chosen with intention — every cigar deliberate, never just a reach.",
    weightedAvg: 1.9,
    color: "#A0602A",
    voiceWords: ["subtle sweetness", "lingering finish", "cedar on the cold draw"],
    voice: "phrases like these tell the story — you're tracking the cigar after most people have moved on. The details you catch are the ones that separate good from memorable.",
  },
};

// ── Placeholder data ──────────────────────────────────────────────────────────
const BASE_DATA = {
  flavors: [
    { name: "Leather", value: 40, color: "#6B3A2A" },
    { name: "Cedar", value: 35, color: "#A0522D" },
    { name: "Earth", value: 25, color: "#C4894F" },
  ],
  brands: [
    { name: "Padrón", count: 5 },
    { name: "Arturo Fuente", count: 4 },
    { name: "Oliva", count: 3 },
  ],
  recentCigars: [
    { name: "Padrón 1964 Anniversary Maduro", date: "Today", rating: 5 },
    { name: "Arturo Fuente Opus X", date: "Yesterday", rating: 4 },
    { name: "Oliva Serie V Melanio", date: "3 days ago", rating: 5 },
  ],
};

// graderPct = % of HUMI users you rate TOUGHER than (lower avg = higher pct = tougher grader)
const VIEW_DATA = {
  craftsman:     { logCount: 12, smoked: 10, avgRating: 4.2, nextMilestone: 20, graderPct: 28 },
  traditionalist:{ logCount: 7,  smoked: 6,  avgRating: 3.8, nextMilestone: 10, graderPct: 61 },
  gentleman:     { logCount: 15, smoked: 13, avgRating: 4.6, nextMilestone: 20, graderPct: 11 },
};

const LOCKED_DATA = { logCount: 3, unlockAt: 5 };

// ── Sub-components ────────────────────────────────────────────────────────────

function DonutChart({ flavors }: { flavors: typeof BASE_DATA.flavors }) {
  return (
    <div className="flex items-center gap-4">
      <PieChart width={90} height={90}>
        <Pie
          data={flavors}
          cx={40} cy={40}
          innerRadius={24} outerRadius={40}
          dataKey="value"
          strokeWidth={2} stroke="#faf5ef"
        >
          {flavors.map((f, i) => <Cell key={i} fill={f.color} />)}
        </Pie>
      </PieChart>
      <div className="flex flex-col gap-1.5">
        {flavors.map((f) => (
          <span key={f.name} className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: f.color }}>
            {f.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function StrengthMeter({ avg }: { avg: number }) {
  const pct = ((avg - 1) / 4) * 100;
  return (
    <div>
      <div className="relative h-3 rounded-full overflow-visible"
        style={{ background: "linear-gradient(to right, #d4b896, #a0602a, #5c2d0e)" }}>
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md"
          style={{ left: `calc(${pct}% - 8px)`, borderColor: HUMI_BROWN }} />
      </div>
      <div className="flex justify-between mt-2">
        {["Gentleman", "Traditionalist", "Craftsman"].map((t) => (
          <span key={t} className="text-[10px] text-gray-400 font-medium">{t}</span>
        ))}
      </div>
    </div>
  );
}

function TopBrands({ brands }: { brands: typeof BASE_DATA.brands }) {
  const max = brands[0].count;
  return (
    <div className="flex flex-col gap-2">
      {brands.map((b, i) => (
        <div key={b.name} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
          <div className="flex-1">
            <div className="flex justify-between mb-0.5">
              <span className="text-sm font-medium text-gray-700">{b.name}</span>
              <span className="text-xs text-gray-400">{b.count} smokes</span>
            </div>
            <div className="h-1 rounded-full bg-gray-100">
              <div className="h-1 rounded-full"
                style={{ width: `${(b.count / max) * 100}%`, backgroundColor: HUMI_BROWN }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center py-3 gap-0.5">
      <span className="text-2xl font-bold leading-none" style={{ color: HUMI_BROWN }}>{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{label}</span>
    </div>
  );
}

function ProfileUnlocked({
  profileKey,
  viewKey,
}: {
  profileKey: keyof typeof PROFILES;
  viewKey: keyof typeof VIEW_DATA;
}) {
  const profile = PROFILES[profileKey];
  const data = VIEW_DATA[viewKey];
  const progressPct = viewKey === "traditionalist"
    ? ((data.logCount - 5) / (data.nextMilestone - 5)) * 100
    : ((data.logCount - 10) / (data.nextMilestone - 10)) * 100;

  // Lower avg rating = tougher grader = higher percentile
  const graderLabel = data.graderPct >= 75
    ? "a tough grader" : data.graderPct >= 40
    ? "a fair grader" : "a generous scorer";
  const graderLine = data.graderPct >= 40
    ? `tougher than ${data.graderPct}% of HUMI users`
    : `more generous than ${100 - data.graderPct}% of HUMI users`;

  return (
    <div className="mx-4 mb-4">
      <div className="rounded-2xl overflow-hidden shadow-sm border"
        style={{ borderColor: HUMI_BORDER, backgroundColor: "#fff" }}>

        {/* ── Header strip: name + blurb + strength meter ── */}
        <div className="px-5 pt-5 pb-4" style={{ backgroundColor: HUMI_LIGHT }}>
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">
            Your Smoking Profile
          </p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: profile.color }}>
            {profileKey}
          </p>
          <p className="text-sm text-gray-500 mt-1 leading-snug">{profile.blurb}</p>

          {/* Strength meter — placed here to explain WHY they're this profile */}
          <div className="mt-4 mb-1">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
              Strength Profile
            </p>
            <StrengthMeter avg={profile.weightedAvg} />
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: HUMI_BORDER }} />

        {/* ── Stats row ── */}
        <div>
          <div className="flex bg-white">
            <StatPill value={String(data.logCount)} label="Logged" />
            <div style={{ width: 1, backgroundColor: HUMI_BORDER }} />
            <StatPill value={String(data.smoked)} label="Smoked" />
            <div style={{ width: 1, backgroundColor: HUMI_BORDER }} />
            <StatPill value={`${data.avgRating}/5`} label="Avg Rating" />
          </div>
          <div className="px-4 py-2 text-center" style={{ borderTop: `1px solid ${HUMI_BORDER}`, backgroundColor: HUMI_LIGHT }}>
            <p className="text-[11px] text-gray-500">
              You're {graderLabel} —{" "}
              <span className="font-semibold" style={{ color: HUMI_BROWN }}>
                {graderLine}
              </span>
            </p>
          </div>
        </div>

        {/* ── Progress toward next milestone ── */}
        <div className="px-5 pt-3 pb-4" style={{ backgroundColor: HUMI_LIGHT, borderTop: `1px solid ${HUMI_BORDER}` }}>
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-gray-400">Profile recalculates every 10 cigars</span>
            <span className="text-[11px] font-semibold" style={{ color: HUMI_BROWN }}>
              Next at {data.nextMilestone}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200">
            <div className="h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(progressPct, 100)}%`, backgroundColor: HUMI_BROWN }} />
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: HUMI_BORDER }} />

        {/* ── Flavor profile ── */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Flavor Profile
          </p>
          <DonutChart flavors={BASE_DATA.flavors} />
        </div>

        <div style={{ height: 1, backgroundColor: HUMI_BORDER }} />

        {/* ── Top brands ── */}
        <div className="px-5 pt-4 pb-4">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Top Brands
          </p>
          <TopBrands brands={BASE_DATA.brands} />
        </div>

        <div style={{ height: 1, backgroundColor: HUMI_BORDER }} />

        {/* ── Your Voice ── */}
        <div className="px-5 pt-4 pb-5" style={{ backgroundColor: HUMI_LIGHT }}>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
              Your Voice
            </p>
            <p className="text-[10px] text-gray-400 italic">
              from your tasting notes
            </p>
          </div>
          {/* Quoted words pulled from their actual notes */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.voiceWords.map((word) => (
              <span
                key={word}
                className="px-2.5 py-1 rounded-md text-xs font-medium border italic"
                style={{ borderColor: HUMI_BORDER, backgroundColor: "white", color: HUMI_BROWN }}
              >
                "{word}"
              </span>
            ))}
          </div>
          {/* The insight sentence flows from those words */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {profile.voice}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileLocked({ data }: { data: typeof LOCKED_DATA }) {
  const remaining = data.unlockAt - data.logCount;
  return (
    <div className="mx-4 mb-4">
      <div className="rounded-2xl border overflow-hidden shadow-sm"
        style={{ borderColor: HUMI_BORDER, backgroundColor: "#fff" }}>
        <div className="px-5 pt-5 pb-4" style={{ backgroundColor: HUMI_LIGHT }}>
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">
            Your Smoking Profile
          </p>
          <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: HUMI_BROWN }}>
            Locked 🔒
          </p>
          <p className="text-sm font-semibold text-gray-700 leading-snug">
            Log {remaining} more {remaining === 1 ? "cigar" : "cigars"} to unlock
          </p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Discover your flavor fingerprint, top brands, and strength signature — and find out if you're a Gentleman, Traditionalist, or Craftsman.
          </p>
          <div className="flex items-center gap-2 mt-4 mb-2">
            {Array.from({ length: data.unlockAt }).map((_, i) => (
              <div key={i} className="flex-1 h-2.5 rounded-full transition-all"
                style={{ backgroundColor: i < data.logCount ? HUMI_BROWN : "#e5e7eb" }} />
            ))}
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-bold" style={{ color: HUMI_BROWN }}>
              {data.logCount} / {data.unlockAt} cigars
            </span>
            <span className="text-xs text-gray-400">{remaining} to go</span>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${HUMI_BORDER}` }}>
          {["Flavor Profile", "Top Brands", "Strength Profile", "Your Voice"].map((label) => (
            <div key={label} className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${HUMI_BORDER}` }}>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-300">{label}</span>
              <span className="text-xs text-gray-300">🔒</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Full Home Screen Mockup ───────────────────────────────────────────────────

type ViewState = "craftsman" | "traditionalist" | "gentleman" | "locked";

const VIEW_LABELS: Record<ViewState, string> = {
  craftsman:      "Craftsman (12)",
  traditionalist: "Traditionalist (7)",
  gentleman:      "Gentleman (15)",
  locked:         "Locked (3/5)",
};

const PROFILE_KEY_MAP: Record<ViewState, keyof typeof PROFILES | null> = {
  craftsman: "Craftsman",
  traditionalist: "Traditionalist",
  gentleman: "Gentleman",
  locked: null,
};

export default function SmokingProfile() {
  const [view, setView] = useState<ViewState>("craftsman");
  const profileKey = PROFILE_KEY_MAP[view];

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-200 pb-8">
      {/* Toggle bar */}
      <div className="sticky top-0 z-50 w-full flex justify-center py-2 bg-gray-200">
        <div className="flex gap-1 bg-white rounded-full shadow-md px-2 py-1.5 text-xs font-medium flex-wrap justify-center max-w-sm">
          {(Object.keys(VIEW_LABELS) as ViewState[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1 rounded-full transition-all whitespace-nowrap"
              style={view === v ? { backgroundColor: HUMI_BROWN, color: "white" } : { color: "#666" }}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Phone shell */}
      <div className="relative bg-white rounded-[44px] shadow-2xl overflow-hidden mt-2" style={{ width: 390 }}>
        {/* Status bar */}
        <div className="flex justify-between items-center px-8 py-2 text-white text-xs font-semibold"
          style={{ backgroundColor: HUMI_BROWN }}>
          <span>9:41</span>
          <div className="flex gap-1 items-center">
            <span>●●●● WiFi 100%</span>
          </div>
        </div>

        {/* HUMI header */}
        <div className="flex justify-between items-center px-4 pb-4 pt-2"
          style={{ backgroundColor: HUMI_BROWN }}>
          <span className="text-white text-2xl font-bold tracking-wider">HUMI</span>
          <div className="w-8 h-8 flex flex-col justify-center gap-1.5">
            {[0, 1, 2].map((i) => <div key={i} className="h-0.5 bg-white rounded-full" />)}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto" style={{ maxHeight: 720 }}>

          {/* Welcome */}
          <div className="px-5 pt-5 pb-3">
            <p className="text-2xl font-bold text-gray-800">Welcome back, Marcus</p>
            <p className="text-base text-gray-500 mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>

          {/* Premium nudge */}
          <div className="mx-4 mb-3">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: HUMI_LIGHT, borderWidth: 1, borderColor: HUMI_BORDER }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: HUMI_BROWN }}>✦</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Upgrade to Premium</p>
                <p className="text-xs text-gray-500">Unlock AI ratings, scanning & more</p>
              </div>
              <span className="text-xs font-semibold" style={{ color: HUMI_BROWN }}>View →</span>
            </div>
          </div>

          {/* ── Smoking Profile ── */}
          {profileKey ? (
            <ProfileUnlocked profileKey={profileKey} viewKey={view as keyof typeof VIEW_DATA} />
          ) : (
            <ProfileLocked data={LOCKED_DATA} />
          )}

          {/* Recent Activity */}
          <div className="px-5 flex justify-between items-center mb-3">
            <p className="text-lg font-bold text-gray-800">Recent Activity</p>
            <span className="text-sm" style={{ color: HUMI_BROWN }}>See All</span>
          </div>

          <div className="px-4 flex flex-col gap-3 pb-24">
            {BASE_DATA.recentCigars.map((c) => (
              <div key={c.name} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border"
                style={{ borderColor: HUMI_BORDER }}>
                <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"
                  style={{ backgroundColor: HUMI_LIGHT }}>🍂</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.date}</p>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className="text-xs"
                        style={{ color: s <= c.rating ? HUMI_BROWN : "#d1d5db" }}>★</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tab bar */}
        <div className="flex justify-around items-center py-3 border-t"
          style={{ borderColor: HUMI_BORDER, backgroundColor: "white" }}>
          {[
            { icon: "🏠", label: "Home", active: true },
            { icon: "📦", label: "Humidor", active: false },
            { icon: "🔍", label: "Discover", active: false },
            { icon: "📊", label: "Insights", active: false },
          ].map((tab) => (
            <div key={tab.label} className="flex flex-col items-center gap-0.5">
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] font-medium"
                style={{ color: tab.active ? HUMI_BROWN : "#9ca3af" }}>{tab.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
