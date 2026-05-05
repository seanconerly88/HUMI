import { db, auth } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const MAX_RANK = 10;

export async function getTop10() {
  const user = auth.currentUser;
  if (!user) return [];
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  return snap.data().top10 || [];
}

export async function saveTop10(list) {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  await setDoc(ref, { top10: list.slice(0, MAX_RANK) }, { merge: true });
}

export async function addToTop10(cigar) {
  const current = await getTop10();
  const id = cigar.id || cigar.cigarId;
  if (!id) return current;
  if (current.find(c => c.cigarId === id)) return current;
  const entry = {
    cigarId: id,
    cigarName: cigar.cigarName || '',
    cigarBrand: cigar.cigarBrand || cigar.brand || '',
    image: cigar.image || null,
    overall: cigar.overall || null,
  };
  const updated = [...current, entry].slice(0, MAX_RANK);
  await saveTop10(updated);
  return updated;
}

export async function removeFromTop10(cigarId) {
  const current = await getTop10();
  const updated = current.filter(c => c.cigarId !== cigarId);
  await saveTop10(updated);
  return updated;
}

export async function getRankForCigar(cigarId) {
  if (!cigarId) return null;
  const list = await getTop10();
  const idx = list.findIndex(c => c.cigarId === cigarId);
  return idx === -1 ? null : idx + 1;
}

export async function isInTop10(cigarId) {
  if (!cigarId) return false;
  const list = await getTop10();
  return list.some(c => c.cigarId === cigarId);
}
