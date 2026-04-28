import { Search, MapPin, Star, ChevronRight, Navigation } from "lucide-react";

const spots = [
  { id: 1, name: "Grand Havana Room", city: "New York, NY", rating: 4.8, checkins: 142, type: "Cigar Lounge" },
  { id: 2, name: "Casa de Montecristo", city: "Chicago, IL", rating: 4.7, checkins: 89, type: "Cigar Bar" },
  { id: 3, name: "Davidoff of Geneva", city: "New York, NY", rating: 4.6, checkins: 201, type: "Cigar Shop + Lounge" },
  { id: 4, name: "The Cigar Bar & Grill", city: "San Francisco, CA", rating: 4.4, checkins: 67, type: "Bar + Lounge" },
];

function HumiHeader() {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#f0ebe5] sticky top-0 z-10">
      <div className="w-8" />
      <span
        className="text-[#8B4513] font-black tracking-[0.2em] text-lg select-none"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        HUMI
      </span>
      <div className="w-8" />
    </div>
  );
}

export function Spots() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col" style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>
      <HumiHeader />

      <div className="px-4 pt-3 pb-2">
        <h2 className="text-xl font-black text-[#2a1a0e] mb-1">Smoke Spots</h2>
        <p className="text-xs text-[#a08070] mb-3">Find your next great place to light up</p>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-[#efe8e0] mb-3">
          <Search size={16} className="text-[#b89a85]" />
          <span className="text-sm text-[#b89a85]">Search spots, cities, lounges…</span>
        </div>

        {/* Near me button */}
        <button className="flex items-center gap-2 bg-[#8B4513]/8 border border-[#C4781A]/30 rounded-xl px-4 py-2 mb-4">
          <Navigation size={14} className="text-[#C4781A]" />
          <span className="text-sm text-[#8B4513] font-semibold">Find spots near me</span>
        </button>
      </div>

      {/* Spots list */}
      <div className="px-4 space-y-2 pb-24">
        <div className="text-xs font-semibold text-[#a08070] tracking-wide uppercase mb-1">Popular Spots</div>
        {spots.map(spot => (
          <div key={spot.id} className="bg-white rounded-xl p-4 border border-[#efe8e0] flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B4513]/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-[#8B4513]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#2a1a0e]">{spot.name}</div>
              <div className="text-xs text-[#C4781A] font-medium">{spot.type}</div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-[#C4781A] fill-[#C4781A]" />
                  <span className="text-[11px] font-semibold text-[#4a3828]">{spot.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={11} className="text-[#b89a85]" />
                  <span className="text-[11px] text-[#a08070]">{spot.city}</span>
                </div>
                <span className="text-[11px] text-[#b89a85]">{spot.checkins} check-ins</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#c8b8aa] flex-shrink-0 mt-1" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-[#f0ebe5] flex justify-around py-2 px-2">
        {[{label:"Home",active:false},{label:"Humidor",active:false},{label:"Spots",active:true},{label:"Feed",active:false}].map(tab => (
          <div key={tab.label} className="flex flex-col items-center gap-0.5 px-4 py-1">
            <div className={`w-5 h-5 rounded-sm ${tab.active ? "bg-[#8B4513]" : "bg-[#d4c4b8]"}`} />
            <span className={`text-[10px] font-semibold ${tab.active ? "text-[#8B4513]" : "text-[#b0a090]"}`}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
