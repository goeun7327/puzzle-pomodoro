import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { C, shadow } from './theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.hero}>
          <Text style={styles.title}>Puzzle{'\n'}Pomodoro</Text>
          <Text style={styles.subtitle}>Focus. Unlock. Complete.</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push('/mode-select')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push('/gallery')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSecondaryText}>My Puzzles</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: C.charcoal,
    lineHeight: 50,
    letterSpacing: -1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: C.grayText,
  },
  buttons: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: C.primary,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    ...shadow,
  },
  btnPrimaryText: {
    fontSize: 17,
    fontWeight: '700',
    color: C.white,
  },
  btnSecondary: {
    backgroundColor: C.white,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    ...shadow,
  },
  btnSecondaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: C.charcoal,
  },
});
