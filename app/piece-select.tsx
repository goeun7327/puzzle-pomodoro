import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { C, shadow } from './theme';

const PIECE_OPTIONS = [
  { count: 25,  label: '25 pieces', grid: '5 × 5',   tag: 'Quick'     },
  { count: 49,  label: '49 pieces', grid: '7 × 7',   tag: 'Moderate'  },
  { count: 100, label: '100 pieces', grid: '10 × 10', tag: 'Challenge' },
];

export default function PieceSelectScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: string }>();

  const handleSelect = (count: number) => {
    router.push({ pathname: '/timer', params: { mode, pieces: count } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Puzzle Size</Text>
            <Text style={styles.subtitle}>Choose how many pieces to complete</Text>
          </View>
        </View>

        <View style={styles.cards}>
          {PIECE_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.count}
              style={styles.card}
              onPress={() => handleSelect(item.count)}
              activeOpacity={0.75}
            >
              <View>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardGrid}>{item.grid}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 36,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  backText: { fontSize: 18, color: C.charcoal, fontWeight: '600' },
  title:    { fontSize: 26, fontWeight: '800', color: C.charcoal, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.grayText, marginTop: 2 },

  cards: { flex: 1, gap: 14 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 22,
    paddingHorizontal: 22,
    ...shadow,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: C.charcoal,
    marginBottom: 3,
  },
  cardGrid: { fontSize: 13, color: C.grayText },
  tag: {
    backgroundColor: C.beige,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: C.charcoal },
});
