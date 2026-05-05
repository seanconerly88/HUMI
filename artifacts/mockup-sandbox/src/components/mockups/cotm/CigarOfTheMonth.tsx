export function CigarOfTheMonth() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-start justify-center p-4 pt-8">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm relative shadow-md border border-[#f0e6d3]">

        {/* Month badge */}
        <div className="absolute -top-3 right-5 bg-[#8B4513] px-3 py-1 rounded-full">
          <span className="text-white text-[10px] font-bold tracking-widest">MAY 2026</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 mt-1">
          <span className="text-2xl">🏆</span>
          <span className="text-xl font-bold text-[#333]">Cigar of the Month</span>
        </div>

        {/* Image */}
        <div className="w-full h-56 flex items-center justify-center mb-4 overflow-hidden rounded-lg bg-gray-50">
          <img
            src="/oliva-serie-v.webp"
            alt="Oliva Serie V"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Name + subtitle */}
        <h2 className="text-[20px] font-bold text-[#333] mb-1">Oliva Serie V</h2>
        <p className="text-[13px] text-[#8B4513] font-medium mb-3">Nicaragua · Sun-Grown · Full-Bodied</p>

        {/* Body paragraphs */}
        <p className="text-[14px] text-[#555] leading-[22px] mb-3">
          The numbers don't lie: the Oliva Serie V is the most smoked cigar on HUMI so far in 2026. Not a limited edition, not a hyped release — just a cigar that keeps ending up in hands because it keeps delivering. The Oliva family has been growing tobacco since Melanio Oliva worked the fields of Pinar del Río, Cuba in 1886. When revolution forced the family from Cuba in 1964 and again from Nicaragua in 1979, they kept farming. The Serie V is what that century of stubbornness produced — a full Nicaraguan puro built entirely from leaves grown on Oliva's own estates in Jalapa and Estelí.
        </p>
        <p className="text-[14px] text-[#555] leading-[22px] mb-3">
          The wrapper is sun-grown Nicaraguan — deep brown, slightly toothy, with the kind of natural oil that tells you what's coming. Light it and the first third opens with a wave of dark chocolate and black pepper that's bold without being aggressive. Cedar and roasted espresso develop through the middle, and by the final third a natural sweetness emerges that rounds everything out. Construction is flawless. The burn is straight. The draw is effortless. An hour and a half of exactly what a full-bodied Nicaraguan should be.
        </p>
        <p className="text-[14px] text-[#555] leading-[22px] mb-4">
          Cigar Aficionado awarded the Serie V Melanio Figurado 96 points and named it the #1 Cigar of the Year in 2014 — but the standard Serie V is what aficionados actually reach for, month after month, because it delivers that same DNA at an honest price. Your fellow HUMI members have made their preference clear. Now you know why.
        </p>

        {/* CTA */}
        <a
          href="https://www.cigarsinternational.com/product/oliva-serie-v/1OB-PM.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#8B4513] text-white font-semibold text-base py-3.5 rounded-xl w-full hover:bg-[#7a3c10] transition-colors"
        >
          Get Yours
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
    </div>
  );
}
