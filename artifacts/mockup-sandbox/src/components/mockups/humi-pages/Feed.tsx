import { Heart, MessageCircle, Star, MoreHorizontal, Plus } from "lucide-react";

const posts = [
  {
    id: 1,
    user: "Carlos M.",
    initials: "CM",
    cigar: "Padron 1964 Exclusivo",
    rating: 5,
    notes: "Absolutely incredible smoke tonight. Dark chocolate and leather on the draw, perfectly even burn.",
    likes: 24,
    comments: 7,
    time: "42 min ago",
    color: "#8B4513",
  },
  {
    id: 2,
    user: "Sarah T.",
    initials: "ST",
    cigar: "Arturo Fuente Opus X",
    rating: 4,
    notes: "First time with the OpusX — it lived up to the hype. Cedar and pepper throughout.",
    likes: 18,
    comments: 3,
    time: "1.5 hrs ago",
    color: "#C4781A",
  },
  {
    id: 3,
    user: "Mike R.",
    initials: "MR",
    cigar: "Liga Privada No. 9",
    rating: 5,
    notes: "This one just hits different. Perfect for a rainy evening on the back porch.",
    likes: 31,
    comments: 12,
    time: "3 hrs ago",
    color: "#6B3A2A",
  },
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

export function Feed() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col" style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>
      <HumiHeader />

      <div className="overflow-y-auto flex-1 pb-24">
        {/* Feed header */}
        <div className="px-4 pt-3 pb-2">
          <h2 className="text-xl font-black text-[#2a1a0e]">Community Feed</h2>
          <p className="text-xs text-[#a08070]">What's everyone smoking right now</p>
        </div>

        {/* Posts */}
        <div className="px-4 space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-[#efe8e0] overflow-hidden">
              {/* Post header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: post.color }}
                  >
                    {post.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#2a1a0e]">{post.user}</div>
                    <div className="text-[10px] text-[#b89a85]">{post.time}</div>
                  </div>
                </div>
                <MoreHorizontal size={18} className="text-[#c8b8aa]" />
              </div>

              {/* Cigar image placeholder */}
              <div className="mx-4 rounded-xl bg-gradient-to-br from-[#faf7f3] to-[#f0e8de] flex items-center justify-center" style={{ height: 140 }}>
                <div className="text-center">
                  <div className="text-4xl mb-1">🍂</div>
                  <div className="text-[10px] text-[#b89a85] font-medium">Humi Moment</div>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 pt-3 pb-2">
                <div className="text-sm font-bold text-[#2a1a0e] mb-1">{post.cigar}</div>
                <div className="flex items-center gap-0.5 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={12} className={i <= post.rating ? "text-[#C4781A] fill-[#C4781A]" : "text-[#e0d4cc]"} />
                  ))}
                </div>
                <p className="text-[13px] text-[#4a3828] leading-relaxed">{post.notes}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 px-4 pt-2 pb-3 border-t border-[#f8f3ef]">
                <button className="flex items-center gap-1.5 text-[#a08070]">
                  <Heart size={16} />
                  <span className="text-xs font-semibold">{post.likes}</span>
                </button>
                <button className="flex items-center gap-1.5 text-[#a08070]">
                  <MessageCircle size={16} />
                  <span className="text-xs font-semibold">{post.comments}</span>
                </button>
                <button className="ml-auto flex items-center gap-1 bg-[#faf7f3] border border-[#efe8e0] rounded-lg px-2.5 py-1">
                  <Plus size={12} className="text-[#8B4513]" />
                  <span className="text-[11px] text-[#8B4513] font-semibold">Add to my HUMI</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-[#f0ebe5] flex justify-around py-2 px-2">
        {[{label:"Home",active:false},{label:"Humidor",active:false},{label:"Spots",active:false},{label:"Feed",active:true}].map(tab => (
          <div key={tab.label} className="flex flex-col items-center gap-0.5 px-4 py-1">
            <div className={`w-5 h-5 rounded-sm ${tab.active ? "bg-[#8B4513]" : "bg-[#d4c4b8]"}`} />
            <span className={`text-[10px] font-semibold ${tab.active ? "text-[#8B4513]" : "text-[#b0a090]"}`}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
