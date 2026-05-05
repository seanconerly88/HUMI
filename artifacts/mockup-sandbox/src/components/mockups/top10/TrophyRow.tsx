const BROWN = '#8B4513';
const BORDER = '#e0d5c8';
const MUTED = '#888';
const DARK = '#1A1A1A';
const BG = '#f9f9f9';
const GOLD = '#b8860b';
const SILVER = '#8a8a8a';
const BRONZE = '#a0522d';

const ITEM_HEIGHT = 112;

const CIGARS = [
  { id: 1, name: 'Oliva Serie V Torpedo', brand: 'Oliva', rating: 5, image: '/oliva-serie-v.webp' },
  { id: 2, name: 'Padrón 1964 Anniversary', brand: 'Padrón', rating: 5, image: 'https://picsum.photos/seed/padron64/140/176' },
  { id: 3, name: 'My Father Le Bijoux 1922', brand: 'My Father Cigars', rating: 5, image: 'https://picsum.photos/seed/myfath/140/176' },
  { id: 4, name: 'Arturo Fuente Opus X', brand: 'Arturo Fuente', rating: 5, image: 'https://picsum.photos/seed/opusx1/140/176' },
  { id: 5, name: 'Liga Privada No. 9', brand: 'Drew Estate', rating: 4, image: 'https://picsum.photos/seed/liga99/140/176' },
  { id: 6, name: 'Cohiba Siglo VI', brand: 'Cohiba', rating: 4, image: 'https://picsum.photos/seed/cohsix/140/176' },
  { id: 7, name: 'Rocky Patel Vintage 1992', brand: 'Rocky Patel', rating: 4, image: 'https://picsum.photos/seed/rp1992/140/176' },
];

const EMPTY_COUNT = 3;

function rankColor(rank: number) {
  if (rank === 1) return GOLD;
  if (rank === 2) return SILVER;
  if (rank === 3) return BRONZE;
  return BROWN;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: 13, color: s <= rating ? GOLD : '#ddd', lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

function Row({ cigar, rank, total }: { cigar: typeof CIGARS[0]; rank: number; total: number }) {
  const color = rankColor(rank);
  const isTop3 = rank <= 3;

  return (
    <div style={{
      height: ITEM_HEIGHT,
      backgroundColor: '#fff',
      borderRadius: 14,
      marginBottom: 9,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
      border: `1px solid ${isTop3 ? '#e8d9be' : BORDER}`,
      boxShadow: isTop3
        ? '0 2px 8px rgba(184,134,11,0.10)'
        : '0 1px 3px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      background: isTop3 ? 'linear-gradient(to right, #fffdf8, #fff)' : '#fff',
    }}>

      {/* Rank number */}
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          fontSize: 34,
          fontWeight: 800,
          color,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: -1,
        }}>
          {rank}
        </span>
      </div>

      {/* Image */}
      <div style={{
        width: 68,
        height: 86,
        borderRadius: 9,
        marginLeft: 10,
        overflow: 'hidden',
        backgroundColor: '#f0ece6',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src={cigar.image}
          alt={cigar.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Info */}
      <div style={{
        flex: 1,
        marginLeft: 13,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          color: DARK,
          letterSpacing: 0.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        }}>
          {cigar.name}
        </span>
        <span style={{
          fontSize: 13,
          color: MUTED,
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        }}>
          {cigar.brand}
        </span>
        <Stars rating={cigar.rating} />
      </div>

      {/* Remove */}
      <div style={{ padding: '12px 8px', color: '#ccc', fontSize: 17, flexShrink: 0, cursor: 'pointer' }}>×</div>

      {/* Arrow column */}
      <div style={{
        width: 44,
        height: ITEM_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderLeft: '1px solid #f0ece6',
        flexShrink: 0,
      }}>
        <div style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: rank === 1 ? 'transparent' : BROWN,
          fontSize: 18,
          cursor: rank === 1 ? 'default' : 'pointer',
        }}>⌃</div>
        <div style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: rank === CIGARS.length + EMPTY_COUNT ? 'transparent' : BROWN,
          fontSize: 18,
          cursor: rank === CIGARS.length + EMPTY_COUNT ? 'default' : 'pointer',
        }}>⌄</div>
      </div>
    </div>
  );
}

function EmptySlot({ rank }: { rank: number }) {
  return (
    <div style={{
      height: ITEM_HEIGHT,
      borderRadius: 14,
      marginBottom: 9,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 16,
      border: '1px dashed #e8e2da',
      backgroundColor: '#fdfcfb',
    }}>
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: '#ddd', lineHeight: 1, letterSpacing: -1 }}>{rank}</span>
      </div>
      <div style={{
        width: 68,
        height: 86,
        borderRadius: 9,
        marginLeft: 10,
        backgroundColor: '#f5f2ee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 24, color: '#d5cfc8' }}>+</span>
      </div>
      <div style={{ marginLeft: 13 }}>
        <span style={{ fontSize: 13, color: '#ccc', fontStyle: 'italic' }}>Open Humidor to add</span>
      </div>
    </div>
  );
}

export function TrophyRow() {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header — matches app exactly */}
      <div style={{
        backgroundColor: BROWN,
        paddingTop: 60,
        paddingBottom: 18,
        paddingLeft: 20,
        paddingRight: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: 3 }}>MY TOP 10</span>
      </div>

      {/* List */}
      <div style={{ padding: '14px 14px 48px' }}>
        {CIGARS.map((cigar, i) => (
          <Row key={cigar.id} cigar={cigar} rank={i + 1} total={CIGARS.length + EMPTY_COUNT} />
        ))}
        {Array.from({ length: EMPTY_COUNT }).map((_, i) => (
          <EmptySlot key={i} rank={CIGARS.length + i + 1} />
        ))}

        <div style={{ paddingTop: 20, paddingBottom: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#bbb', letterSpacing: 0.2 }}>Tap ▲ ▼ to reorder · Remove with ×</span>
        </div>
      </div>
    </div>
  );
}
