import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { C, shadow } from './theme';

const MODES = [
  {
    id:        'focus',
    label:     'Focus',
    focusMin:  25,
    restMin:   5,
    tag:       'Recommended',
  },
  {
    id:        'long',
    label:     'Deep Work',
    focusMin:  50,
    restMin:   10,
    tag:       'Extended',
  },
];

export default function ModeSelectScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Select Mode</Text>
            <Text style={styles.subtitle}>Choose how you want to focus</Text>
          </View>
        </View>

        <View style={styles.cards}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/piece-select', params: { mode: m.id } })}
              activeOpacity={0.75}
            >
              {/* 왼쪽: 이름 + 태그 */}
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>{m.label}</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{m.tag}</Text>
                </View>
              </View>

              {/* 오른쪽: 시간 */}
              <View style={styles.timeBlock}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeNumber}>{m.focusMin}</Text>
                  <View style={styles.timeMeta}>
                    <Text style={styles.timeUnit}>min</Text>
                    <Text style={styles.timeKind}>focus</Text>
                  </View>
                </View>
                <Text style={styles.timeSep}>+</Text>
                <View style={styles.timeRow}>
                  <Text style={[styles.timeNumber, { color: C.restBlue }]}>{m.restMin}</Text>
                  <View style={styles.timeMeta}>
                    <Text style={[styles.timeUnit, { color: C.restBlue }]}>min</Text>
                    <Text style={[styles.timeKind, { color: C.restBlue }]}>break</Text>
                  </View>
                </View>
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
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
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
    paddingHorizontal: 24,
    ...shadow,
  },

  // 왼쪽
  cardLeft: { gap: 8 },
  cardLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: C.charcoal,
    letterSpacing: -0.3,
  },
  tag: {
    backgroundColor: C.beige,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  tagText: { fontSize: 11, fontWeight: '600', color: C.charcoal },

  // 오른쪽 시간 블록
  timeBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  timeNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: -1,
    lineHeight: 40,
  },
  timeMeta: {
    paddingBottom: 4,
    gap: 0,
  },
  timeUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    lineHeight: 16,
  },
  timeKind: {
    fontSize: 11,
    fontWeight: '500',
    color: C.grayText,
    lineHeight: 14,
  },
  timeSep: {
    fontSize: 13,
    fontWeight: '600',
    color: C.border,
    textAlign: 'right',
    marginVertical: 1,
  },
});
