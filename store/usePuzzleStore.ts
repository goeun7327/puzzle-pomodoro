import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUZZLES_KEY = '@puzzle_pomodoro/puzzles';
const ACTIVE_KEY  = '@puzzle_pomodoro/active_puzzle_id';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Puzzle {
  id:             string;
  title:          string;
  imageUri:       string;        // local URI from image picker
  pieces:         number;        // 25 | 49 | 100
  unlockedPieces: number[];
  deadline?:      string;        // YYYY-MM-DD
  createdAt:      string;        // YYYY-MM-DD
  lastAccess:     string;        // YYYY-MM-DD
  sessions:       number;
}

interface PuzzleStore {
  puzzles:        Puzzle[];
  activePuzzleId: string | null;

  load:         () => Promise<void>;
  addPuzzle:    (input: { title: string; imageUri: string; pieces: number; deadline?: string }) => Promise<Puzzle>;
  updatePuzzle: (id: string, updates: Partial<Puzzle>) => Promise<void>;
  unlockPiece:  (id: string, pieceIdx: number) => Promise<boolean>; // returns true if newly unlocked
  setActive:    (id: string | null) => Promise<void>;
  touchAccess:  (id: string) => Promise<void>;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function persist(puzzles: Puzzle[]) {
  try { await AsyncStorage.setItem(PUZZLES_KEY, JSON.stringify(puzzles)); } catch {}
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePuzzleStore = create<PuzzleStore>((set, get) => ({
  puzzles:        [],
  activePuzzleId: null,

  // ── 로드 ────────────────────────────────────────────────────────────────────
  load: async () => {
    try {
      const [raw, activeRaw] = await Promise.all([
        AsyncStorage.getItem(PUZZLES_KEY),
        AsyncStorage.getItem(ACTIVE_KEY),
      ]);
      set({
        puzzles:        raw ? JSON.parse(raw) : [],
        activePuzzleId: activeRaw ?? null,
      });
    } catch {}
  },

  // ── 퍼즐 추가 ────────────────────────────────────────────────────────────────
  addPuzzle: async ({ title, imageUri, pieces, deadline }) => {
    const puzzle: Puzzle = {
      id:             Date.now().toString(),
      title,
      imageUri,
      pieces,
      unlockedPieces: [],
      deadline,
      createdAt:      todayStr(),
      lastAccess:     todayStr(),
      sessions:       0,
    };
    const puzzles = [...get().puzzles, puzzle];
    set({ puzzles, activePuzzleId: puzzle.id });
    try {
      await Promise.all([
        persist(puzzles),
        AsyncStorage.setItem(ACTIVE_KEY, puzzle.id),
      ]);
    } catch {}
    return puzzle;
  },

  // ── 퍼즐 업데이트 ────────────────────────────────────────────────────────────
  updatePuzzle: async (id, updates) => {
    const puzzles = get().puzzles.map(p => (p.id === id ? { ...p, ...updates } : p));
    set({ puzzles });
    await persist(puzzles);
  },

  // ── 피스 해금 ────────────────────────────────────────────────────────────────
  unlockPiece: async (id, pieceIdx) => {
    const puzzle = get().puzzles.find(p => p.id === id);
    if (!puzzle || puzzle.unlockedPieces.includes(pieceIdx)) return false;

    const unlockedPieces = [...puzzle.unlockedPieces, pieceIdx];
    const puzzles = get().puzzles.map(p =>
      p.id === id
        ? { ...p, unlockedPieces, sessions: p.sessions + 1, lastAccess: todayStr() }
        : p,
    );
    set({ puzzles });
    await persist(puzzles);
    return true;
  },

  // ── 활성 퍼즐 설정 ───────────────────────────────────────────────────────────
  setActive: async (id) => {
    set({ activePuzzleId: id });
    try {
      if (id) await AsyncStorage.setItem(ACTIVE_KEY, id);
      else     await AsyncStorage.removeItem(ACTIVE_KEY);
    } catch {}
  },

  // ── 최근 접속일 갱신 ─────────────────────────────────────────────────────────
  touchAccess: async (id) => {
    await get().updatePuzzle(id, { lastAccess: todayStr() });
  },
}));
