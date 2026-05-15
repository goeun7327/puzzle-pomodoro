import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Modal,
  Alert,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { usePuzzleStore } from '../../store/usePuzzleStore';
import { C, shadow } from '../theme';

const { width } = Dimensions.get('window');
const GRID_W    = width - 48;

// ─── 날짜 포맷 ───────────────────────────────────────────────────────────────

function friendlyDate(iso: string) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PuzzleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { puzzles, touchAccess, updatePuzzle, unlockPiece } = usePuzzleStore();
  const puzzle = puzzles.find(p => p.id === id);

  // 제목 편집
  const [isEditing, setIsEditing]   = useState(false);
  const [editValue, setEditValue]   = useState('');
  const inputRef = useRef<TextInput>(null);

  // 이미지 변경 모달
  const [showImgModal, setShowImgModal] = useState(false);

  // 완성 모달
  const [showComplete, setShowComplete] = useState(false);
  const completedRef = useRef(false);

  // 새로 해금된 조각 애니메이션
  const [animPiece, setAnimPiece] = useState<number | null>(null);
  const pieceScale = useRef(new Animated.Value(1)).current;
  const prevUnlockedRef = useRef<number[]>([]);

  // ── 마운트: 접속일 갱신 ──
  useEffect(() => {
    if (id) touchAccess(id);
  }, [id]);

  // ── puzzle 변경 감지: 새 조각 애니메이션 + 완성 모달 ──
  useEffect(() => {
    if (!puzzle) return;

    const prev = prevUnlockedRef.current;
    const curr = puzzle.unlockedPieces;

    // 새로 해금된 조각 찾기
    if (curr.length > prev.length) {
      const newPiece = curr.find(i => !prev.includes(i));
      if (newPiece !== undefined) {
        setAnimPiece(newPiece);
        pieceScale.setValue(0.2);
        Animated.spring(pieceScale, {
          toValue:  1,
          friction: 3,
          tension:  120,
          useNativeDriver: true,
        }).start(() => setAnimPiece(null));
      }
    }

    prevUnlockedRef.current = [...curr];

    // 완성 여부
    if (!completedRef.current && curr.length >= puzzle.pieces && puzzle.pieces > 0) {
      completedRef.current = true;
      setShowComplete(true);
    }
  }, [puzzle?.unlockedPieces.length]);

  // ── 제목 저장 ──
  async function saveTitle() {
    if (!puzzle) return;
    const trimmed = editValue.trim() || puzzle.title;
    setIsEditing(false);
    if (trimmed !== puzzle.title) {
      await updatePuzzle(puzzle.id, { title: trimmed });
    }
  }

  function startEditing() {
    if (!puzzle) return;
    setEditValue(puzzle.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ── 이미지 변경 ──
  async function pickNewImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && puzzle) {
      await updatePuzzle(puzzle.id, { imageUri: result.assets[0].uri });
      setShowImgModal(false);
    }
  }

  // ── 로딩 or 없음 ──
  if (!puzzle) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Puzzle not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: C.primary, fontWeight: '700', marginTop: 12 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cols     = Math.sqrt(puzzle.pieces);
  const cellSize = GRID_W / cols;
  const pct      = Math.round((puzzle.unlockedPieces.length / puzzle.pieces) * 100);
  const isDone   = puzzle.unlockedPieces.length >= puzzle.pieces;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>

            {/* ── 헤더 ── */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.screenLabel}>Puzzle Detail</Text>
              {isDone && (
                <View style={styles.doneBadge}>
                  <Text style={styles.doneText}>Complete</Text>
                </View>
              )}
            </View>

            {/* ── 퍼즐 그리드 ── */}
            <TouchableOpacity
              style={[styles.puzzleWrap, { width: GRID_W, height: GRID_W }]}
              onPress={() => setShowImgModal(true)}
              activeOpacity={0.95}
            >
              {/* 개별 조각 렌더링 */}
              {Array.from({ length: puzzle.pieces }, (_, i) => {
                const row       = Math.floor(i / cols);
                const col       = i % cols;
                const isUnlocked = puzzle.unlockedPieces.includes(i);
                const isAnimating = i === animPiece;

                const cellContent = isUnlocked ? (
                  <Image
                    source={{ uri: puzzle.imageUri }}
                    style={{
                      width:    GRID_W,
                      height:   GRID_W,
                      position: 'absolute',
                      left:     -col * cellSize,
                      top:      -row * cellSize,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.lockedCellInner} />
                );

                return (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      left:     col * cellSize,
                      top:      row * cellSize,
                      width:    cellSize,
                      height:   cellSize,
                      overflow: 'hidden',
                      borderRightWidth:  col < cols - 1 ? 0.5 : 0,
                      borderBottomWidth: row < cols - 1 ? 0.5 : 0,
                      borderColor: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {isAnimating ? (
                      <Animated.View
                        style={{ flex: 1, transform: [{ scale: pieceScale }] }}
                      >
                        {cellContent}
                      </Animated.View>
                    ) : (
                      cellContent
                    )}
                  </View>
                );
              })}

              {/* 뱃지 */}
              <View style={styles.pctBadge}>
                <Text style={styles.pctText}>{pct}%</Text>
              </View>
              <View style={styles.editImgBadge}>
                <Text style={styles.editImgText}>Edit image</Text>
              </View>
            </TouchableOpacity>

            {/* ── 제목 편집 ── */}
            <View style={styles.titleCard}>
              {isEditing ? (
                <View style={styles.titleEditRow}>
                  <TextInput
                    ref={inputRef}
                    style={styles.titleInput}
                    value={editValue}
                    onChangeText={setEditValue}
                    onBlur={saveTitle}
                    onSubmitEditing={saveTitle}
                    returnKeyType="done"
                    maxLength={30}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.saveTitleBtn} onPress={saveTitle}>
                    <Text style={styles.saveTitleText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.titleRow} onPress={startEditing} activeOpacity={0.7}>
                  <Text style={styles.puzzleTitle}>{puzzle.title}</Text>
                  <Text style={styles.editPencil}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Progress ── */}
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressVal}>
                  {puzzle.unlockedPieces.length} / {puzzle.pieces} pieces
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pct}%` as any }]} />
              </View>
            </View>

            {/* ── 메타 정보 ── */}
            <View style={styles.infoCard}>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Pieces</Text>
                  <Text style={styles.metaValue}>{puzzle.pieces}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Last opened</Text>
                  <Text style={styles.metaValue}>{friendlyDate(puzzle.lastAccess)}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Sessions</Text>
                  <Text style={styles.metaValue}>{puzzle.sessions}</Text>
                </View>
                {puzzle.deadline && (
                  <>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Deadline</Text>
                      <Text style={styles.metaValue}>{friendlyDate(puzzle.deadline)}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* ── CTA ── */}
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/mode-select')}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaBtnText}>Continue Focusing →</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── 이미지 변경 모달 ── */}
      <Modal
        visible={showImgModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImgModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImgModal(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Change Image</Text>
            <TouchableOpacity
              style={styles.libraryBtn}
              onPress={pickNewImage}
              activeOpacity={0.8}
            >
              <Text style={styles.libraryBtnText}>Choose from Photo Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowImgModal(false)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── 완성 축하 모달 ── */}
      <Modal
        visible={showComplete}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComplete(false)}
      >
        <View style={styles.completeOverlay}>
          <View style={styles.completeCard}>
            <Text style={styles.completeTitle}>Puzzle Complete!</Text>
            <Text style={styles.completeSubtitle}>
              You finished{' '}
              <Text style={{ fontWeight: '700', color: C.charcoal }}>{puzzle.title}</Text>
            </Text>

            <Image
              source={{ uri: puzzle.imageUri }}
              style={styles.completePreview}
              resizeMode="cover"
            />

            <TouchableOpacity
              style={styles.newPuzzleBtn}
              onPress={() => {
                setShowComplete(false);
                router.replace('/gallery');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.newPuzzleBtnText}>Start a New Puzzle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stayBtn}
              onPress={() => setShowComplete(false)}
            >
              <Text style={styles.stayBtnText}>Keep viewing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48 },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: C.grayText },

  // 헤더
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', ...shadow,
  },
  backText:    { fontSize: 18, fontWeight: '600', color: C.charcoal },
  screenLabel: { flex: 1, fontSize: 20, fontWeight: '800', color: C.charcoal },
  doneBadge: {
    backgroundColor: C.charcoal, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  doneText: { fontSize: 12, fontWeight: '700', color: C.white },

  // 퍼즐 그리드
  puzzleWrap: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: C.border,
    marginBottom: 14, position: 'relative', ...shadow,
  },
  lockedCellInner: { flex: 1, backgroundColor: '#E0E0E0' },

  // 뱃지
  pctBadge: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  pctText: { fontSize: 13, fontWeight: '700', color: C.charcoal },
  editImgBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  editImgText: { fontSize: 12, fontWeight: '600', color: C.charcoal },

  // 제목 카드
  titleCard: {
    backgroundColor: C.white, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 20, paddingVertical: 16,
    marginBottom: 14, ...shadow,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  puzzleTitle: { fontSize: 22, fontWeight: '800', color: C.charcoal, flex: 1 },
  editPencil:  { fontSize: 18, marginLeft: 8 },
  titleEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleInput: {
    flex: 1, fontSize: 20, fontWeight: '700', color: C.charcoal,
    borderBottomWidth: 2, borderBottomColor: C.primary, paddingVertical: 4,
  },
  saveTitleBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveTitleText: { fontSize: 14, fontWeight: '700', color: C.white },

  // 진행도
  progressCard: {
    backgroundColor: C.white, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border,
    padding: 18, marginBottom: 14, ...shadow,
  },
  progressRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel:  { fontSize: 14, fontWeight: '600', color: C.charcoal },
  progressVal:    { fontSize: 14, fontWeight: '700', color: C.primary },
  progressBarBg:  { height: 8, backgroundColor: C.beige, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: C.primary, borderRadius: 4 },

  // 메타 정보
  infoCard: {
    backgroundColor: C.white, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 18, paddingHorizontal: 22,
    marginBottom: 20, ...shadow,
  },
  metaRow:     { flexDirection: 'row', alignItems: 'center' },
  metaItem:    { flex: 1, alignItems: 'center' },
  metaLabel:   { fontSize: 11, color: C.grayText, marginBottom: 4 },
  metaValue:   { fontSize: 14, fontWeight: '700', color: C.charcoal, textAlign: 'center' },
  metaDivider: { width: 1, height: 36, backgroundColor: C.beige },

  // CTA
  ctaBtn: {
    backgroundColor: C.primary, borderRadius: 24,
    paddingVertical: 18, alignItems: 'center', ...shadow,
  },
  ctaBtnText: { fontSize: 17, fontWeight: '700', color: C.white },

  // 이미지 변경 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 14,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.charcoal, marginBottom: 16 },
  libraryBtn: {
    backgroundColor: C.charcoal, borderRadius: 20,
    paddingVertical: 16, paddingHorizontal: 20, marginBottom: 12,
    alignItems: 'center',
  },
  libraryBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
  cancelBtn:      { backgroundColor: C.beige, borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  cancelBtnText:  { fontSize: 16, fontWeight: '600', color: C.charcoal },

  // 완성 모달
  completeOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  completeCard: {
    backgroundColor: C.white, borderRadius: 28,
    padding: 28, alignItems: 'center', width: '100%', ...shadow,
  },
  completeTitle:    { fontSize: 28, fontWeight: '800', color: C.charcoal, marginBottom: 8 },
  completeSubtitle: {
    fontSize: 15, color: C.grayText, textAlign: 'center',
    lineHeight: 22, marginBottom: 20,
  },
  completePreview: {
    width: 200, height: 200, borderRadius: 16,
    marginBottom: 24, backgroundColor: C.beige,
  },
  newPuzzleBtn: {
    backgroundColor: C.primary, borderRadius: 20,
    paddingVertical: 16, paddingHorizontal: 32,
    width: '100%', alignItems: 'center', marginBottom: 10, ...shadow,
  },
  newPuzzleBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
  stayBtn:          { paddingVertical: 12 },
  stayBtnText:      { fontSize: 15, color: C.grayText, fontWeight: '500' },
});
