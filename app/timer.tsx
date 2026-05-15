import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTimerStore } from '../store/useTimerStore';
import { usePuzzleStore } from '../store/usePuzzleStore';
import { C, shadow } from './theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const MAX_DAILY = 24;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimerScreen() {
  const router = useRouter();
  const { mode, pieces } = useLocalSearchParams<{ mode: string; pieces: string }>();

  const store = useTimerStore();
  const { puzzles, activePuzzleId } = usePuzzleStore();
  const activePuzzle = puzzles.find(p => p.id === activePuzzleId) ?? null;

  // Animations
  const bannerY   = useRef(new Animated.Value(-80)).current;
  const showBannerRef = useRef(false);

  // ── Init on mount ──
  useEffect(() => {
    store.init(mode as string, Number(pieces) || 25);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tick interval ──
  useEffect(() => {
    const id = setInterval(() => store.tick(), 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AppState: sync when app comes to foreground ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') store.syncFromBackground();
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trigger banner when a piece is newly unlocked ──
  useEffect(() => {
    if (store.newlyUnlocked !== null) {
      // 활성 퍼즐에 해금 반영
      const { activePuzzleId, unlockPiece } = usePuzzleStore.getState();
      if (activePuzzleId) {
        unlockPiece(activePuzzleId, store.newlyUnlocked);
      }
      runBannerAnim();
    }
  }, [store.newlyUnlocked]);

  function runBannerAnim() {
    if (showBannerRef.current) return;
    showBannerRef.current = true;
    bannerY.setValue(-80);
    Animated.sequence([
      Animated.spring(bannerY, { toValue: 0,   friction: 7, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(bannerY, { toValue: -80, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      showBannerRef.current = false;
      store.clearNewlyUnlocked();
    });
  }

  // ── Derived ──
  const {
    phase, status, secondsLeft, session,
    unlockedPieces, todayCount, totalPieces,
  } = store;

  const isFocus      = phase === 'focus' || phase === 'idle';
  const phaseColor   = isFocus ? C.primary : C.restBlue;
  const reachedLimit = todayCount >= MAX_DAILY;
  const allDone      = unlockedPieces.length >= totalPieces;

  const phaseLabel = (() => {
    if (phase === 'rest') return 'Break';
    if (status === 'idle' && phase === 'idle') return 'Ready';
    return 'Focus';
  })();

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Unlock banner ── */}
      <Animated.View
        style={[styles.banner, { transform: [{ translateY: bannerY }] }]}
        pointerEvents="none"
      >
        <Text style={styles.bannerText}>
          Piece unlocked! {unlockedPieces.length} / {totalPieces}
        </Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={[styles.phasePill, { backgroundColor: phaseColor + '20', borderColor: phaseColor }]}>
            <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
            <Text style={[styles.phaseLabel, { color: phaseColor }]}>
              {phaseLabel} · Session {session}
            </Text>
          </View>
        </View>

        {/* ── Timer ring ── */}
        <View style={styles.ringWrap}>
          <View style={[styles.ring, { borderColor: phaseColor }]}>
            <Text style={styles.timerText}>{fmt(secondsLeft)}</Text>
            <Text style={[styles.ringLabel, { color: phaseColor }]}>
              {phase === 'rest' ? 'Time to rest' : 'Stay focused'}
            </Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <Text style={styles.statsKey}>Unlocked today</Text>
            <Text style={[styles.statsVal, reachedLimit && { color: C.primary }]}>
              {todayCount} / {MAX_DAILY}
            </Text>
          </View>
          <View style={styles.statsDivider} />
          {activePuzzle ? (
            <View style={styles.statsRow}>
              <Text style={styles.statsKey} numberOfLines={1}>
                {activePuzzle.title}
              </Text>
              <Text style={styles.statsVal}>
                {activePuzzle.unlockedPieces.length} / {activePuzzle.pieces} pieces
              </Text>
            </View>
          ) : (
            <View style={styles.statsRow}>
              <Text style={styles.statsKey}>No active puzzle</Text>
              <Text style={[styles.statsVal, { color: C.grayText }]}>Create one in Gallery</Text>
            </View>
          )}
        </View>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.resetBtn} onPress={() => store.reset()}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.startBtn,
              { backgroundColor: reachedLimit || allDone ? C.gray : phaseColor },
            ]}
            onPress={() => status === 'running' ? store.pause() : store.start()}
            disabled={reachedLimit || allDone}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>
              {status === 'running' ? 'Pause' : 'Start'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.galleryBtn} onPress={() => router.push('/gallery')}>
            <Text style={styles.galleryBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {allDone && <Text style={styles.completeText}>Puzzle complete!</Text>}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 48,
    alignItems: 'center',
  },

  // Banner
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 99,
    backgroundColor: C.primary,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bannerText: { fontSize: 15, fontWeight: '700', color: C.white },

  // Header
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    ...shadow,
  },
  backText: { fontSize: 18, fontWeight: '600', color: C.charcoal },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  phaseDot: { width: 7, height: 7, borderRadius: 4 },
  phaseLabel: { fontSize: 13, fontWeight: '600' },

  // Ring
  ringWrap: { marginBottom: 28 },
  ring: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    ...shadow,
  },
  timerText: {
    fontSize: 54,
    fontWeight: '800',
    color: C.charcoal,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  ringLabel: { fontSize: 14, fontWeight: '500', marginTop: 6 },

  // Stats card
  statsCard: {
    width: '100%',
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 6,
    paddingHorizontal: 20,
    marginBottom: 20,
    ...shadow,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  statsKey: { fontSize: 14, fontWeight: '600', color: C.charcoal },
  statsVal: { fontSize: 15, fontWeight: '700', color: C.charcoal },
  statsDivider: { height: 1, backgroundColor: C.beige },

  // Controls
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
    width: '100%',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    ...shadow,
  },
  resetBtnText: { fontSize: 15, fontWeight: '600', color: C.charcoal },
  startBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    ...shadow,
  },
  startBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
  galleryBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    ...shadow,
  },
  galleryBtnText: { fontSize: 15, fontWeight: '600', color: C.charcoal },

  completeText: {
    fontSize: 20,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 12,
  },
});
