import { Star, X, ChevronLeft } from "lucide-react";

function HumiDetailHeader() {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#f0ebe5] sticky top-0 z-10">
      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#faf7f3]">
        <ChevronLeft size={20} className="text-[#8B4513]" />
      </button>
      <span
        className="text-[#8B4513] font-black tracking-[0.2em] text-lg select-none"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        HUMI
      </span>
      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#faf7f3]">
        <X size={18} className="text-[#8B4513]" />
      </button>
    </div>
  );
}

const TASTING_NOTES = ["cream", "spice", "cedar", "dark chocolate", "pepper"];

export function CigarDetail() {
  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>
      <HumiDetailHeader />

      <div className="overflow-y-auto flex-1 pb-36">
        {/* Cigar image area */}
        <div className="relative w-full bg-gradient-to-b from-[#faf7f3] to-[#f0e8de] flex items-center justify-center" style={{ height: 220 }}>
          <div className="flex flex-col items-center">
            <div className="text-7xl mb-2">🍂</div>
            <div className="px-3 py-1 bg-[#8B4513]/10 rounded-full">
              <span className="text-xs text-[#8B4513] font-semibold">Arturo Fuente</span>
            </div>
          </div>
        </div>

        <div className="px-5 pt-5">
          {/* Cigar name */}
          <h1 className="text-xl font-black text-[#2a1a0e] leading-tight mb-1">
            El Septimo Emperor Yao Connecticut
          </h1>

          {/* Star rating */}
          <div className="flex items-center gap-1 mb-4">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={16} className={i <= 4 ? "text-[#C4781A] fill-[#C4781A]" : "text-[#e0d4cc]"} />
            ))}
            <span className="text-sm text-[#8B4513] font-semibold ml-1">4.2</span>
          </div>

          {/* HUMI Blurb */}
          <p className="text-sm text-[#4a3828] leading-relaxed mb-5">
            That's the signature look of the El Septimo Emperor Yao Connecticut. This cigar boasts a warm golden-tan wrapper, offering a luxurious smoking experience. Known for its smooth draw, the Emperor Yao Connecticut delivers a delightful blend of creamy notes with a hint of spice, making it a standout choice for aficionados. Its origins trace back to a tradition of excellence in crafting cigars that are both refined and rich in flavor.
          </p>

          {/* Tasting Notes */}
          <div className="mb-5">
            <h3 className="text-xs font-bold text-[#a08070] tracking-widest uppercase mb-2.5">Tasting Notes</h3>
            <div className="flex flex-wrap gap-2">
              {TASTING_NOTES.map(note => (
                <span key={note} className="px-3 py-1 bg-[#faf7f3] border border-[#efe8e0] rounded-full text-xs text-[#6a4a38] font-medium">{note}</span>
              ))}
            </div>
          </div>

          {/* What People Are Saying (premium) */}
          <div className="mb-5 p-4 rounded-xl bg-[#fdf8f4] border border-[#efe8e0]">
            <h3 className="text-xs font-bold text-[#a08070] tracking-widest uppercase mb-2">What People Are Saying</h3>
            <p className="text-sm text-[#4a3828] leading-relaxed italic">
              "Buttery smooth, almost no bite. Perfect for an afternoon on the porch." — HUMI community
            </p>
          </div>
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-[#f0ebe5] px-4 py-3 space-y-2">
        <button className="w-full bg-[#8B4513] text-white font-bold py-3.5 rounded-xl text-sm tracking-wide">
          Smoke &amp; Rate
        </button>
        <button className="w-full bg-[#faf7f3] border border-[#efe8e0] text-[#8B4513] font-semibold py-3 rounded-xl text-sm">
          ✏️ Fix Issue
        </button>
      </div>
    </div>
  );
}
