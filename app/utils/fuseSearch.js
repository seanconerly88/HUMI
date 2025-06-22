import Fuse from 'fuse.js';
import cigarData from '../cigar_db.json';

const formattedCigars = [];

Object.entries(cigarData).forEach(([brand, { cigars }]) => {
  cigars.forEach(cigar => {
    formattedCigars.push({
      brand,
      line: cigar.line,
      bandDescription: cigar.bandDescription || '',
    });
  });
});

const fuse = new Fuse(formattedCigars, {
  keys: ['brand', 'line', 'bandDescription'],
  threshold: 0.3
});

export function searchCigars(query) {
  const result = fuse.search(query);
  return result.length ? result[0].item : null;
}
