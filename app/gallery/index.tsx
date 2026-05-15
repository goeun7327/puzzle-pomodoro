import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { usePuzzleStore, Puzzle } from '../../store/usePuzzleStore';
import { C, shadow } from '../theme';

const { width } = Dimensions.get('window');
const PAD    = 24;
const GAP    = 14;
const CARD_W = (width - PAD * 2 - GAP) / 2;

const PIECE_OPTIONS = [
  { count: 25,  label: '25피스', grid: '5×5'   },
  { count: 49,  label: '49피스', grid: '7×7'   },
  { count: 100, label: '100피스', grid: '10×10' },
];

// ─── 퍼즐 카드 ────────────────────────────────────────────────────────────────

function PuzzleCard({ puzzle, onPress }: { puzzle: Puzzle; onPress: () => void }) {
  const cols     = Math.sqrt(puzzle.pieces);
  const cellSize = CARD_W / cols;
  const isDone   = puzzle.unlockedPieces.length >= puzzle.pieces;
  const pct      = Math.round((puzzle.unlockedPieces.length / puzzle.pieces) * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.puzzleArea, { width: CARD_W, height: CARD_W }]}>
        {/* 실제 이미지 */}
        <Image
          source={{ uri: puzzle.imageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* 잠긴 조각 회색 오버레이 */}
        {Array.from({ length: puzzle.pieces }, (_, i) => {
          if (puzzle.unlockedPieces.includes(i)) return null;
          const row = Math.floor(i / cols);
          const col = i % cols;
          return (
            <View
              key={i}
              style={[styles.lockedCell, {
                width: cellSize, height: cellSize,
                left: col * cellSize, top: row * cellSize,
              }]}
            />
          );
        })}

        {isDone && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneText}>완성 ✓</Text>
          </View>
        )}
        <View style={styles.pctBadge}>
          <Text style={styles.pctText}>{pct}%</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{puzzle.title}</Text>
        <Text style={styles.cardMeta}>
          {puzzle.unlockedPieces.length} / {puzzle.pieces} pieces
          {puzzle.deadline ? `  · Due ${puzzle.deadline}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── 갤러리 화면 ──────────────────────────────────────────────────────────────

export default function GalleryScreen() {
  const router = useRouter();
  const { puzzles, load, addPuzzle } = usePuzzleStore();

  // 퍼즐 생성 모달
  const [showModal,   setShowModal]   = useState(false);
  const [pendingUri,  setPendingUri]  = useState('');
  const [newTitle,    setNewTitle]    = useState('');
  const [newPieces,   setNewPieces]   = useState(25);
  const [newDeadline, setNewDeadline] = useState('');
  const [creating,    setCreating]    = useState(false);

  useEffect(() => { load(); }, []);

  // ── + 버튼: 이미지 선택 ──
  async function handleFABPress() {
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
    if (!result.canceled) {
      setPendingUri(result.assets[0].uri);
      setNewTitle('');
      setNewPieces(25);
      setNewDeadline('');
      setShowModal(true);
    }
  }

  // ── 퍼즐 생성 확인 ──
  async function handleCreate() {
    if (!newTitle.trim()) {
      Alert.alert('Title required', 'Please enter a title for your puzzle.');
      return;
    }
    setCreating(true);
    const puzzle = await addPuzzle({
      title:    newTitle.trim(),
      imageUri: pendingUri,
      pieces:   newPieces,
      deadline: newDeadline.trim() || undefined,
    });
    setCreating(false);
    setShowModal(false);
    router.push({ pathname: '/gallery/[id]', params: { id: puzzle.id } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Gallery</Text>
            <Text style={styles.subtitle}>{puzzles.length} {puzzles.length === 1 ? 'puzzle' : 'puzzles'}</Text>
          </View>
        </View>

        {/* 퍼즐 목록 or 빈 상태 */}
        {puzzles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No puzzles yet</Text>
            <Text style={styles.emptyDesc}>Tap + to create your first puzzle</Text>
          </View>
        ) : (
          <FlatList
            data={puzzles}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PuzzleCard
                puzzle={item}
                onPress={() =>
                  router.push({ pathname: '/gallery/[id]', params: { id: item.id } })
                }
              />
            )}
          />
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleFABPress} activeOpacity={0.8}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

      </View>

      {/* ── 퍼즐 생성 모달 ── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>New Puzzle</Text>

              {/* Preview */}
              {pendingUri ? (
                <Image source={{ uri: pendingUri }} style={styles.previewImg} resizeMode="cover" />
              ) : null}

              {/* Title */}
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter a title for your puzzle"
                placeholderTextColor={C.grayText}
                value={newTitle}
                onChangeText={setNewTitle}
                maxLength={30}
                returnKeyType="done"
                autoFocus
              />

              {/* Piece count */}
              <Text style={styles.fieldLabel}>Pieces</Text>
              <View style={styles.pieceRow}>
                {PIECE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.count}
                    style={[styles.pieceBtn, newPieces === opt.count && styles.pieceBtnActive]}
                    onPress={() => setNewPieces(opt.count)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.pieceBtnLabel,
                      newPieces === opt.count && styles.pieceBtnLabelActive,
                    ]}>
                      {opt.label}
                    </Text>
                    <Text style={[
                      styles.pieceBtnGrid,
                      newPieces === opt.count && styles.pieceBtnLabelActive,
                    ]}>
                      {opt.grid}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Deadline */}
              <Text style={styles.fieldLabel}>
                Deadline <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.grayText}
                value={newDeadline}
                onChangeText={setNewDeadline}
                maxLength={10}
                keyboardType="numeric"
                returnKeyType="done"
              />

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, creating && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <Text style={styles.confirmBtnText}>
                    {creating ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: PAD, paddingTop: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    ...shadow,
  },
  backText: { fontSize: 18, fontWeight: '600', color: C.charcoal },
  title:    { fontSize: 26, fontWeight: '800', color: C.charcoal, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.grayText, marginTop: 2 },

  list: { paddingBottom: 100, gap: GAP },
  row:  { gap: GAP },

  // 카드
  card: {
    width: CARD_W, backgroundColor: C.white,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    overflow: 'hidden', ...shadow,
  },
  puzzleArea: { position: 'relative', overflow: 'hidden' },
  lockedCell: { position: 'absolute', backgroundColor: '#E0E0E0' },

  // 뱃지
  doneBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: C.charcoal, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  doneText: { fontSize: 10, fontWeight: '700', color: C.white },
  pctBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border,
  },
  pctText: { fontSize: 11, fontWeight: '700', color: C.charcoal },

  // 카드 하단
  cardInfo:  { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.charcoal },
  cardMeta:  { fontSize: 12, color: C.grayText },

  // FAB
  fab: {
    position: 'absolute', right: PAD, bottom: 36,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.charcoal,
    alignItems: 'center', justifyContent: 'center',
    ...shadow,
  },
  fabText: { fontSize: 28, color: C.white, lineHeight: 32 },

  // 빈 상태
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.charcoal },
  emptyDesc:  { fontSize: 14, color: C.grayText, textAlign: 'center' },

  // 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 14,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: C.charcoal, marginBottom: 16 },

  previewImg: {
    width: '100%', height: 140, borderRadius: 16,
    marginBottom: 20, backgroundColor: C.beige,
  },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.grayText, marginBottom: 8 },
  optional:   { fontWeight: '400' },

  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: C.charcoal, backgroundColor: C.white,
    marginBottom: 18,
  },

  pieceRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  pieceBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white,
  },
  pieceBtnActive: { borderColor: C.charcoal, backgroundColor: C.charcoal },
  pieceBtnLabel:  { fontSize: 13, fontWeight: '700', color: C.charcoal },
  pieceBtnGrid:   { fontSize: 11, color: C.grayText, marginTop: 2 },
  pieceBtnLabelActive: { color: C.white },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 18,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: C.charcoal },
  confirmBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 18,
    backgroundColor: C.primary, alignItems: 'center', ...shadow,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
});
