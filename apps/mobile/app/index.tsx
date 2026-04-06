import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TriangleAlert } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

const appUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || process.env.NEXT_PUBLIC_WEB_APP_URL || '';

export default function IndexRoute() {
  const [isLoading, setIsLoading] = useState(true);

  const normalizedUrl = useMemo(() => {
    if (!appUrl) return '';
    return /^https?:\/\//.test(appUrl) ? appUrl : `https://${appUrl}`;
  }, []);

  if (!normalizedUrl) {
    return (
      <SafeAreaView style={styles.emptyScreen}>
        <StatusBar style="light" />
        <View style={styles.emptyCard}>
          <TriangleAlert color="#fbbf24" size={30} />
          <Text style={styles.emptyTitle}>Web App URL Needed</Text>
          <Text style={styles.emptyText}>
            Add `EXPO_PUBLIC_WEB_APP_URL` in the mobile env so this native shell can load your exact web app.
          </Text>
          <Text style={styles.codeText}>EXPO_PUBLIC_WEB_APP_URL=https://your-taskflow-domain.com</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <WebView
        source={{ uri: normalizedUrl }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        startInLoadingState
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={() => (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#7dd3fc" />
            <Text style={styles.loaderText}>Opening your web workspace...</Text>
          </View>
        )}
        style={styles.webview}
      />

      {isLoading ? <View pointerEvents="none" style={styles.loadingOverlay} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09111f',
  },
  webview: {
    flex: 1,
    backgroundColor: '#09111f',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#09111f',
  },
  loaderText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9,17,31,0.12)',
  },
  emptyScreen: {
    flex: 1,
    backgroundColor: '#09111f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,23,42,0.82)',
    padding: 20,
    gap: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 21,
  },
  codeText: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '600',
  },
});
