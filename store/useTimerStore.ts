import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Phase  = 'idle' | 'focus' | 'rest';
export type Status = 'idle' | 'running' | 'paused';

interface DailyData {
  date: string;
  unlockedCount: number;
  unlockedPieces: number[];
}

// ─── 시간 설정 ────────────────────────────────────────────────────────────────
//
//  ✅ 실제 운영 시간으로 되돌리려면 아래 주석 해제 후 TEST 블록 삭제
//
//  const MODE_CONFIG = {
//    focus:  { focusSec: 25 * 60, restSec:  5 * 60 },
//    long:   { focusSec: 50 * 60, restSec: 10 * 60 },
//    custom: { focusSec: 25 * 60, restSec:  5 * 60 },
//  };

const MODE_CONFIG = {
  focus:  { focusSec: 25 * 60, restSec:  5 * 60 },
  long:   { focusSec: 50 * 60, restSec: 10 * 60 },
  custom: { focusSec: 25 * 60, restSec:  5 * 60 },
};

const MAX_DAILY   = 24;
const STORAGE_KEY = '@puzzle_pomodoro/daily';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Store 인터페이스 ─────────────────────────────────────────────────────────

export interface TimerStore {
  // 타이머 상태
  phase:       Phase;
  status:      Status;
  secondsLeft: number;
  endTime:     number | null; // 현재 페이즈가 끝나는 절대 시각 (ms)
  session:     number;

  // 설정값 (타이머 화면 진입 시 세팅)
  mode:        string;
  totalPieces: number;
  focusSec:    number;
  restSec:     number;

  // 퍼즐 진행도
  unlockedPieces: number[];
  todayCount:     number;   // 오늘 해금 피스 수
  todayDate:      string;   // YYYY-MM-DD
  newlyUnlocked:  number | null; // 방금 해금된 피스 인덱스

  // 액션
  init:               (mode: string, pieces: number) => Promise<void>;
  start:              () => void;
  pause:              () => void;
  reset:              () => void;
  tick:               () => void;        // setInterval 에서 1초마다 호출
  syncFromBackground: () => Promise<void>; // AppState active 복귀 시
  completePhase:      () => Promise<void>; // 페이즈 종료 처리
  clearNewlyUnlocked: () => void;
  loadProgress:       () => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTimerStore = create<TimerStore>((set, get) => ({
  // 초기 상태
  phase:       'idle',
  status:      'idle',
  secondsLeft: 25 * 60,
  endTime:     null,
  session:     1,

  mode:        'focus',
  totalPieces: 25,
  focusSec:    25 * 60,
  restSec:     5 * 60,

  unlockedPieces: [],
  todayCount:     0,
  todayDate:      todayStr(),
  newlyUnlocked:  null,

  // ── 초기화 ──────────────────────────────────────────────────────────────────
  init: async (mode, pieces) => {
    const cfg = MODE_CONFIG[mode as keyof typeof MODE_CONFIG] ?? MODE_CONFIG.focus;
    set({
      mode,
      totalPieces:    pieces,
      focusSec:       cfg.focusSec,
      restSec:        cfg.restSec,
      phase:          'idle',
      status:         'idle',
      secondsLeft:    cfg.focusSec,
      endTime:        null,
      session:        1,
      newlyUnlocked:  null,
    });
    await get().loadProgress();
  },

  // ── 시작 ────────────────────────────────────────────────────────────────────
  start: () => {
    const { secondsLeft, phase } = get();
    set({
      status:  'running',
      phase:   phase === 'idle' ? 'focus' : phase,
      endTime: Date.now() + secondsLeft * 1000,
    });
  },

  // ── 일시정지 ────────────────────────────────────────────────────────────────
  pause: () => {
    const { endTime, secondsLeft } = get();
    const remaining = endTime
      ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      : secondsLeft;
    set({ status: 'paused', endTime: null, secondsLeft: remaining });
  },

  // ── 재설정 ──────────────────────────────────────────────────────────────────
  reset: () => {
    const { focusSec } = get();
    set({
      status:      'idle',
      phase:       'idle',
      secondsLeft: focusSec,
      endTime:     null,
    });
  },

  // ── 매 1초 틱 (컴포넌트의 setInterval에서 호출) ─────────────────────────────
  tick: () => {
    const { endTime, status } = get();
    if (status !== 'running' || !endTime) return;

    const remaining = Math.ceil((endTime - Date.now()) / 1000);

    if (remaining <= 0) {
      // 페이즈 종료
      set({ secondsLeft: 0, status: 'idle', endTime: null });
      get().completePhase();
    } else {
      set({ secondsLeft: remaining });
    }
  },

  // ── 백그라운드 복귀 시 시각 재보정 ─────────────────────────────────────────
  syncFromBackground: async () => {
    const { endTime, status } = get();
    if (status !== 'running' || !endTime) return;

    const remaining = Math.ceil((endTime - Date.now()) / 1000);

    if (remaining <= 0) {
      set({ secondsLeft: 0, status: 'idle', endTime: null });
      await get().completePhase();
    } else {
      set({ secondsLeft: remaining });
    }
  },

  // ── 페이즈 완료 처리 ────────────────────────────────────────────────────────
  completePhase: async () => {
    const { phase, focusSec, restSec } = get();

    if (phase === 'focus' || phase === 'idle') {
      // 집중 → 휴식 자동 시작
      set({
        phase:       'rest',
        secondsLeft: restSec,
        endTime:     Date.now() + restSec * 1000,
        status:      'running',
      });
      return;
    }

    // 휴식 완료 → 피스 해금 + 다음 집중 준비
    const { totalPieces, unlockedPieces, todayCount, todayDate, session } = get();
    const today = todayStr();
    const currentTodayCount = todayDate === today ? todayCount : 0;

    let newUnlocked   = [...unlockedPieces];
    let newTodayCount = currentTodayCount;
    let picked: number | null = null;

    if (currentTodayCount < MAX_DAILY) {
      const locked = Array.from({ length: totalPieces }, (_, i) => i)
        .filter((i) => !unlockedPieces.includes(i));

      if (locked.length > 0) {
        picked       = locked[Math.floor(Math.random() * locked.length)];
        newUnlocked  = [...unlockedPieces, picked];
        newTodayCount = currentTodayCount + 1;
      }
    }

    // 상태 업데이트 (동기)
    set({
      phase:          'idle',
      status:         'idle',
      secondsLeft:    focusSec,
      endTime:        null,
      session:        session + 1,
      unlockedPieces: newUnlocked,
      todayCount:     newTodayCount,
      todayDate:      today,
      newlyUnlocked:  picked,
    });

    // AsyncStorage 저장 (비동기)
    try {
      const data: DailyData = {
        date:           today,
        unlockedCount:  newTodayCount,
        unlockedPieces: newUnlocked,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  },

  // ── 해금 알림 클리어 ────────────────────────────────────────────────────────
  clearNewlyUnlocked: () => set({ newlyUnlocked: null }),

  // ── AsyncStorage에서 진행도 로드 ────────────────────────────────────────────
  loadProgress: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: DailyData = JSON.parse(raw);
      const today = todayStr();

      if (saved.date === today) {
        set({
          unlockedPieces: saved.unlockedPieces,
          todayCount:     saved.unlockedCount,
          todayDate:      today,
        });
      } else {
        // 자정 지남 → 오늘 카운트만 리셋, 누적 피스는 유지
        const fresh: DailyData = {
          date:           today,
          unlockedCount:  0,
          unlockedPieces: saved.unlockedPieces,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        set({
          unlockedPieces: saved.unlockedPieces,
          todayCount:     0,
          todayDate:      today,
        });
      }
    } catch {}
  },
}));
