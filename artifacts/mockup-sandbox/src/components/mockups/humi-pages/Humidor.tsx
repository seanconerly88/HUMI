import { Search, Camera, Star, ChevronRight } from "lucide-react";

const cigars = [
  { id: 1, name: "Arturo Fuente Opus X", rating: 4.8, notes: "Rich, complex, cedar and spice", logged: "2 days ago" },
  { id: 2, name: "Padron 1964 Anniversary", rating: 4.9, notes: "Dark chocolate, leather, earth", logged: "5 days ago" },
  { id: 3, name: "My Father Le Bijou 1922", rating: 4.7, notes: "Full body, pepper, dark fruit", logged: "1 week ago" },
  { id: 4, name: "Davidoff Winston Churchill", rating: 4.5, notes: "Creamy, mild spice, walnut", logged: "2 weeks ago" },
  { id: 5, name: "Liga Privada No. 9", rating: 4.6, notes: "Espresso, dark cocoa, pepper", logged: "3 weeks ago" },
];

function HumiHeader({ showBack = false }: { showBack?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#f0ebe5] sticky top-0 z-10">
      <div className="w-8">
        {showBack && (
          <button className="p-1 rounded-full hover:bg-[#faf7f3]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
      <span
        className="text-[#8B4513] font-black tracking-[0.25em] text-lg select-none"
        style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.2em" }}
      >
        HUMI
      </span>
      <div className="w-8" />
    </div>
  );
}

export function Humidor() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col" style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>
      <HumiHeader />

      {/* Search + Scan row */}
      <div className="px-4 pt-3 pb-2 flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-[#efe8e0]">
          <Search size={16} className="text-[#b89a85]" />
          <span className="text-sm text-[#b89a85]">Search your humidor…</span>
        </div>
        <button className="bg-[#8B4513] rounded-xl px-3 py-2.5 flex items-center gap-1">
          <Camera size={16} className="text-white" />
          <span className="text-xs text-white font-semibold">Scan</span>
        </button>
      </div>

      {/* Stats strip */}
      <div className="mx-4 mb-3 flex gap-3">
        <div className="flex-1 bg-white rounded-xl p-3 border border-[#efe8e0] text-center">
          <div className="text-2xl font-black text-[#8B4513]">47</div>
          <div className="text-[10px] text-[#a08070] font-medium tracking-wide uppercase">Logged</div>
        </div>
        <div className="flex-1 bg-white rounded-xl p-3 border border-[#efe8e0] text-center">
          <div className="text-2xl font-black text-[#8B4513]">4.7</div>
          <div className="text-[10px] text-[#a08070] font-medium tracking-wide uppercase">Avg Rating</div>
        </div>
        <div className="flex-1 bg-white rounded-xl p-3 border border-[#efe8e0] text-center">
          <div className="text-2xl font-black text-[#C4781A]">3</div>
          <div className="text-[10px] text-[#a08070] font-medium tracking-wide uppercase">This Week</div>
        </div>
      </div>

      {/* Cigar list */}
      <div className="px-4 space-y-2 pb-24">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-[#a08070] tracking-wide uppercase">Recently Logged</span>
        </div>
        {cigars.map(cigar => (
          <div key={cigar.id} className="bg-white rounded-xl p-3.5 border border-[#efe8e0] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#faf7f3] border border-[#efe8e0] flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🍂</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#2a1a0e] truncate">{cigar.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={10} className={i <= Math.floor(cigar.rating) ? "text-[#C4781A] fill-[#C4781A]" : "text-[#e0d4cc]"} />
                ))}
                <span className="text-[10px] text-[#a08070] ml-1">{cigar.rating}</span>
              </div>
              <div className="text-[10px] text-[#b89a85] mt-0.5">{cigar.logged}</div>
            </div>
            <ChevronRight size={16} className="text-[#c8b8aa] flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-[#f0ebe5] flex justify-around py-2 px-2">
        {[{label:"Home",active:false},{label:"Humidor",active:true},{label:"Spots",active:false},{label:"Feed",active:false}].map(tab => (
          <div key={tab.label} className="flex flex-col items-center gap-0.5 px-4 py-1">
            <div className={`w-5 h-5 rounded-sm ${tab.active ? "bg-[#8B4513]" : "bg-[#d4c4b8]"}`} />
            <span className={`text-[10px] font-semibold ${tab.active ? "text-[#8B4513]" : "text-[#b0a090]"}`}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
