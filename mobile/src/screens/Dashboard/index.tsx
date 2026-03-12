/**
 * Tela de Dashboard - Visão geral do bot
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

import { useThemeStore, getTheme } from '../../store/themeStore';
import { useStrategyStore } from '../../store/strategyStore';
import { settingsService, dashboardService } from '../../services';
import { DashboardData, ChartResponseData } from '../../types';

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 64; // margem 20 + padding 12 cada lado

// Sparkline simples para web (evita onResponder warnings do react-native-chart-kit no SVG)
function WebSparkline({ candles, height, cardColor }: { candles: any[]; height: number; cardColor: string }) {
  if (candles.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>Aguardando dados…</Text>
      </View>
    );
  }
  const prices = candles.map((c: any) => c.close);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const W = 340;
  const H = height - 8;
  const pad = 4;
  const step = (W - pad * 2) / (prices.length - 1);

  const pts = prices
    .map((p: number, i: number) => {
      const x = pad + i * step;
      const y = pad + (1 - (p - minP) / range) * (H - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const fillPts = `${pad},${H - pad} ${pts} ${pad + (prices.length - 1) * step},${H - pad}`;

  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }}>
      {/* @ts-ignore — SVG nativo no web sem react-native-svg */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill="url(#sg)" />
        <polyline points={pts} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </View>
  );
}

export default function DashboardScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = getTheme(isDarkMode);
  const { strategies, currentStrategy, loadStrategies } = useStrategyStore();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartResponseData | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeStrategy = currentStrategy ?? strategies[0] ?? null;
  const asset = activeStrategy?.asset ?? 'PETR4';

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [dash, chart, settings] = await Promise.all([
        dashboardService.getDashboard(),
        dashboardService.getChartData(asset, '1D'),
        settingsService.get(),
      ]);
      setDashboard(dash);
      setChartData(chart);
      setBalance(settings.simulated_balance);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [asset]);

  useEffect(() => {
    loadStrategies();
    loadData();
    intervalRef.current = setInterval(() => loadData(true), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleBotToggle = async () => {
    setBotLoading(true);
    try {
      if (dashboard?.bot_status.is_running) {
        await dashboardService.stopBot();
      } else {
        await dashboardService.startBot();
      }
      await loadData(true);
    } catch (e) {
      console.error('Erro ao alternar bot:', e);
    } finally {
      setBotLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Candles das últimas 30 velas — memoizado para não re-renderizar
  const candles30 = useMemo(() => chartData?.candles.slice(-30) ?? [], [chartData]);

  // Volume máximo para normalizar barras (calculado uma vez)
  const maxVolume = useMemo(() => {
    if (!candles30.length) return 1;
    return Math.max(...candles30.map(c => c.volume), 1);
  }, [candles30]);

  const chartDisplayData = useMemo(() => ({
    labels: candles30.map(() => ''),
    datasets: [
      {
        data: candles30.length >= 2
          ? candles30.map(c => c.close)
          : [25, 25.5, 26, 25.8, 26.2, 26.5, 26.8, 27, 26.7, 27.2],
        color: () => '#00d4aa',
        strokeWidth: 2,
      },
      {
        data: chartData?.ma_short.slice(-30).length
          ? chartData.ma_short.slice(-30)
          : [24.8, 25.2, 25.5, 25.6, 25.8, 26, 26.3, 26.5, 26.4, 26.8],
        color: () => '#ffa726',
        strokeWidth: 1.5,
      },
      {
        data: chartData?.ma_long.slice(-30).length
          ? chartData.ma_long.slice(-30)
          : [24.5, 24.8, 25, 25.2, 25.4, 25.6, 25.8, 26, 25.9, 26.2],
        color: () => '#42a5f5',
        strokeWidth: 1.5,
      },
    ],
  }), [candles30, chartData]);

  const isRunning = dashboard?.bot_status.is_running ?? false;
  const pnl = dashboard?.todays_pnl ?? 0;

  const styles = createStyles(theme);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isRunning ? theme.success + '22' : theme.error + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: isRunning ? theme.success : theme.error }]} />
          <Text style={[styles.statusText, { color: isRunning ? theme.success : theme.error }]}>
            {isRunning ? 'Running' : 'Stopped'}
          </Text>
        </View>
      </View>

      {/* Saldo */}
      <View style={styles.balanceRow}>
        <View style={[styles.balanceCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>SALDO SIMULADO</Text>
          <Text style={[styles.balanceValue, { color: theme.text }]}>
            {balance !== null ? formatCurrency(balance) : '—'}
          </Text>
        </View>
        <View style={[styles.balanceCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>P/L HOJE</Text>
          <Text style={[styles.balanceValue, { color: pnl >= 0 ? theme.success : theme.error }]}>
            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
          </Text>
        </View>
      </View>

      {/* Gráfico */}
      <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
        <View style={styles.chartHeader}>
          <View style={styles.chartAsset}>
            <Text style={[styles.chartAssetText, { color: theme.text }]}>{asset}</Text>
            {dashboard?.current_price ? (
              <Text style={[styles.chartPrice, { color: theme.success }]}>
                {formatCurrency(dashboard.current_price)}
              </Text>
            ) : null}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00d4aa' }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Preço</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ffa726' }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>MA{activeStrategy?.ma_short_period ?? 9}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#42a5f5' }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>MA{activeStrategy?.ma_long_period ?? 21}</Text>
            </View>
          </View>
        </View>

        {Platform.OS === 'web' ? (
          <WebSparkline candles={candles30} height={180} cardColor={theme.card} />
        ) : (
          <LineChart
            data={chartDisplayData}
            width={CHART_WIDTH}
            height={180}
            chartConfig={{
              backgroundColor: theme.card,
              backgroundGradientFrom: theme.card,
              backgroundGradientTo: theme.card,
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(0,212,170,${opacity})`,
              labelColor: () => theme.textSecondary,
              propsForDots: { r: '0' },
            }}
            bezier
            withInnerLines={false}
            withOuterLines={false}
            withHorizontalLabels={false}
            withVerticalLabels={false}
            style={{ borderRadius: 8, marginLeft: -10 }}
          />
        )}

        {/* Barras de volume — alturas fixas baseadas nos dados reais */}
        <View style={styles.volumeContainer}>
          {(candles30.length >= 2 ? candles30 : Array.from({ length: 30 }, (_, i) => ({ volume: 50 + i * 3 }))).map((c, i) => {
            const vol = 'volume' in c ? (c as any).volume : c.volume;
            const heightPct = Math.max(((vol / maxVolume) * 36), 4);
            const isGreen = candles30.length >= 2
              ? (candles30[i]?.close ?? 0) >= (candles30[i - 1]?.close ?? candles30[i]?.close ?? 0)
              : i % 3 !== 0;
            return (
              <View
                key={i}
                style={[styles.volumeBar, {
                  height: heightPct,
                  backgroundColor: isGreen ? '#00d4aa55' : '#ff4d4d55',
                }]}
              />
            );
          })}
        </View>
      </View>

      {/* Botão de controle do bot */}
      <TouchableOpacity
        style={[styles.botBtn, { backgroundColor: isRunning ? theme.error : theme.success, opacity: botLoading ? 0.7 : 1 }]}
        onPress={handleBotToggle}
        disabled={botLoading}
      >
        <Ionicons name={isRunning ? 'stop' : 'play'} size={22} color="#fff" />
        <Text style={styles.botBtnText}>
          {botLoading ? 'Aguarde…' : (isRunning ? 'Parar Bot' : 'Iniciar Bot')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  balanceRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  balanceCard: { flex: 1, padding: 14, borderRadius: 12, gap: 4 },
  balanceLabel: { fontSize: 10, fontWeight: '500' },
  balanceValue: { fontSize: 17, fontWeight: '600' },
  chartCard: {
    marginHorizontal: 16, marginTop: 14, borderRadius: 14,
    padding: 12, overflow: 'hidden',
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  chartAsset: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartAssetText: { fontSize: 14, fontWeight: '600' },
  chartPrice: { fontSize: 13, fontWeight: '600' },
  legendRow: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10 },
  volumeContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 36, gap: 1, marginTop: 4,
  },
  volumeBar: { flex: 1, borderRadius: 1, minHeight: 4 },
  botBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 14, marginBottom: 32,
    paddingVertical: 16, borderRadius: 14, gap: 8,
  },
  botBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
