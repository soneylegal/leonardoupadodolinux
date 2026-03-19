/**
 * Tela de Resultados de Backtesting — REESCRITA
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Platform
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../../store/themeStore';
import { useStrategyStore } from '../../store/strategyStore';
import { backtestService } from '../../services';
import { BacktestResult } from '../../types';

const { width: screenWidth } = Dimensions.get('window');

const PERIODS = [
  { label: '3 meses', value: '3M' },
  { label: '6 meses', value: '6M' },
  { label: '1 ano',   value: '1Y' },
];

type Metric = { label: string; description: string; value: string; color: string; icon: string };

export default function BacktestScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = getTheme(isDarkMode);
  const { strategies, currentStrategy, loadStrategies, setCurrentStrategy } = useStrategyStore();
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRan, setLastRan] = useState<Date | null>(null);
  const [showStratPicker, setShowStratPicker] = useState(false);

  useEffect(() => { loadStrategies(); }, []);

  const activeStrategy = currentStrategy ?? strategies[0] ?? null;

  const runBacktest = useCallback(async () => {
    if (!activeStrategy) return;
    setLoading(true);
    try {
      const r = await backtestService.run(activeStrategy.id, selectedPeriod);
      setResult(r);
      setLastRan(new Date());
    } catch (e) {
      console.error('Backtest error', e);
    } finally {
      setLoading(false);
    }
  }, [activeStrategy, selectedPeriod]);

  const fmt = (v: number, suffix = '%') =>
    `${v >= 0 ? '+' : ''}${v.toFixed(1)}${suffix}`;

  const metrics: Metric[] = result ? [
    {
      label: 'Retorno Total',
      description: 'Variação total do capital no período',
      value: fmt(result.total_return),
      color: result.total_return >= 0 ? theme.success : theme.error,
      icon: result.total_return >= 0 ? 'trending-up' : 'trending-down',
    },
    {
      label: 'Win Rate',
      description: 'Percentual de operações lucrativas',
      value: `${(result.win_rate ?? 0).toFixed(0)}%`,
      color: (result.win_rate ?? 0) >= 50 ? theme.success : theme.error,
      icon: 'trophy',
    },
    {
      label: 'Max Drawdown',
      description: 'Maior queda do pico ao fundo',
      value: fmt(result.max_drawdown),
      color: theme.error,
      icon: 'arrow-down-circle',
    },
    {
      label: 'Sharpe Ratio',
      description: 'Retorno ajustado ao risco (>1 é bom)',
      value: (result.sharpe_ratio ?? 0).toFixed(2),
      color: (result.sharpe_ratio ?? 0) >= 1 ? theme.success : '#ffa726',
      icon: 'analytics',
    },
    {
      label: 'Total de Trades',
      description: 'Número de operações executadas',
      value: String(result.total_trades ?? 0),
      color: theme.primary,
      icon: 'swap-horizontal',
    },
    {
      label: 'Ganho Médio',
      description: 'Retorno médio por operação vencedora',
      value: fmt(result.avg_win ?? 0),
      color: theme.success,
      icon: 'add-circle',
    },
  ] : [];

  const equityCurve = result?.chart_data?.equity_curve ?? [10000, 10100, 10250, 10180, 10400, 10600];
  const chartData = {
    labels: equityCurve.map((_, i) => (i % Math.ceil(equityCurve.length / 4) === 0 ? `${i + 1}` : '')),
    datasets: [{ data: equityCurve }],
  };

  const renderChart = () => {
    if (Platform.OS === 'web') {
      const minP = Math.min(...equityCurve);
      const maxP = Math.max(...equityCurve);
      const range = maxP - minP || 1;
      const W = screenWidth - 88;
      const H = 180;
      const pad = 10;
      const step = (W - pad * 2) / (Math.max(equityCurve.length - 1, 1));
      
      const pts = equityCurve.map((p, i) => {
        const x = pad + i * step;
        const y = pad + (1 - (p - minP) / range) * (H - pad * 2);
        return `${x},${y}`;
      }).join(' ');
      
      const fillPts = `${pad},${H - pad} ${pts} ${pad + (equityCurve.length - 1) * step},${H - pad}`;

      return (
        <View style={{ height: H, width: '100%', overflow: 'hidden', padding: 12 }}>
          {/* @ts-ignore */}
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#42a5f5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#42a5f5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPts} fill="url(#eqGrad)" />
            <polyline points={pts} fill="none" stroke="#42a5f5" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </View>
      );
    }

    return (
      <LineChart
        data={chartData}
        width={screenWidth - 64}
        height={180}
        chartConfig={{
          backgroundColor: theme.card,
          backgroundGradientFrom: theme.card,
          backgroundGradientTo: theme.card,
          decimalPlaces: 0,
          color: (op = 1) => `rgba(66,165,245,${op})`,
          labelColor: () => theme.textSecondary,
          fillShadowGradient: '#42a5f5',
          fillShadowGradientOpacity: 0.2,
          propsForDots: { r: '0' },
        }}
        bezier
        withInnerLines={false}
        withOuterLines={false}
        withHorizontalLabels={false}
        withVerticalLabels={false}
        style={{ borderRadius: 12 }}
      />
    );
  };

  const styles = createStyles(theme);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Backtesting</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Simule a estratégia em dados históricos
          </Text>
        </View>
        {lastRan && (
          <Text style={[styles.lastRan, { color: theme.textSecondary }]}>
            {lastRan.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>

      <View style={styles.body}>
        {/* Estratégia ativa */}
        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ESTRATÉGIA</Text>
          <TouchableOpacity 
            style={[styles.stratCard, { backgroundColor: theme.card, borderColor: showStratPicker ? theme.primary : theme.border }]}
            onPress={() => setShowStratPicker(!showStratPicker)}
            disabled={strategies.length === 0}
          >
            {activeStrategy ? (
              <>
                <View style={[styles.stratIcon, { backgroundColor: theme.primary + '22' }]}>
                  <Ionicons name="flash" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stratName, { color: theme.text }]}>{activeStrategy.name}</Text>
                  <Text style={[styles.stratDetail, { color: theme.textSecondary }]}>
                    {activeStrategy.asset} · {activeStrategy.timeframe} · MA {activeStrategy.ma_short_period}/{activeStrategy.ma_long_period}
                    {activeStrategy.stop_loss_percent ? `  · SL ${activeStrategy.stop_loss_percent}%` : ''}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={theme.success} />
              </>
            ) : (
              <>
                <Ionicons name="alert-circle-outline" size={22} color="#ffa726" />
                <Text style={[styles.stratDetail, { color: theme.textSecondary, flex: 1 }]}>
                  Nenhuma estratégia configurada. Vá em "Estratégia" e crie uma.
                </Text>
              </>
            )}
            {strategies.length > 0 && (
              <Ionicons name={showStratPicker ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
          {showStratPicker && strategies.length > 0 && (
            <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', marginBottom: 12 }}>
              {strategies.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  onPress={() => { setCurrentStrategy(s); setShowStratPicker(false); setResult(null); }}
                >
                  <View>
                    <Text style={{ color: theme.text, fontWeight: '600' }}>{s.name}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{s.asset} · {s.timeframe}</Text>
                  </View>
                  {currentStrategy?.id === s.id && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Período */}
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PERÍODO DE ANÁLISE</Text>
          <View style={styles.periodRow}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.periodBtn, {
                  backgroundColor: selectedPeriod === p.value ? theme.primary : theme.card,
                  borderColor: selectedPeriod === p.value ? theme.primary : theme.border,
                }]}
                onPress={() => setSelectedPeriod(p.value)}
              >
                <Text style={[styles.periodLabel, { color: selectedPeriod === p.value ? '#fff' : theme.textSecondary }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botão executar */}
        <TouchableOpacity
          style={[styles.runBtn, {
            backgroundColor: loading ? theme.border : theme.primary,
            opacity: !activeStrategy ? 0.4 : 1,
          }]}
          onPress={runBacktest}
          disabled={loading || !activeStrategy}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.runBtnText}>Simulando dados históricos…</Text>
            </View>
          ) : (
            <>
              <Ionicons name="play-circle" size={22} color="#fff" />
              <Text style={styles.runBtnText}>
                {result ? 'Executar Novamente' : 'Executar Backtest'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Estado inicial */}
        {!result && !loading && activeStrategy && (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <Ionicons name="bar-chart-outline" size={44} color={theme.border} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Pronto para simular</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Pressione "Executar Backtest" para simular{'\n'}
              <Text style={{ fontWeight: '700', color: theme.primary }}>{activeStrategy.asset}</Text>{' '}
              com MA {activeStrategy.ma_short_period}/{activeStrategy.ma_long_period}{'\n'}
              no período de {selectedPeriod === '3M' ? '3 meses' : selectedPeriod === '6M' ? '6 meses' : '1 ano'}.
            </Text>
          </View>
        )}

        {/* Resultados */}
        {result && !loading && (
          <>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CURVA DE CAPITAL</Text>
              <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                {renderChart()}
              </View>
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MÉTRICAS DA SIMULAÇÃO</Text>
              <View style={styles.metricsGrid}>
                {metrics.map(m => (
                  <View key={m.label} style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.metricTop}>
                      <Ionicons name={m.icon as any} size={15} color={m.color} />
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{m.label}</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                    <Text style={[styles.metricDesc, { color: theme.textSecondary }]}>{m.description}</Text>
                  </View>
                ))}
              </View>
            </View>

            {(result.chart_data?.buy_signals?.length ?? 0) > 0 && (
              <View style={[styles.signalsBar, { backgroundColor: theme.card }]}>
                <View style={styles.signalItem}>
                  <Ionicons name="arrow-up-circle" size={18} color={theme.success} />
                  <Text style={[styles.signalCount, { color: theme.success }]}>
                    {result.chart_data?.buy_signals?.length ?? 0}
                  </Text>
                  <Text style={[styles.signalLabel, { color: theme.textSecondary }]}>compras</Text>
                </View>
                <View style={[styles.signalDivider, { backgroundColor: theme.border }]} />
                <View style={styles.signalItem}>
                  <Ionicons name="arrow-down-circle" size={18} color={theme.error} />
                  <Text style={[styles.signalCount, { color: theme.error }]}>
                    {result.chart_data?.sell_signals?.length ?? 0}
                  </Text>
                  <Text style={[styles.signalLabel, { color: theme.textSecondary }]}>vendas</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 3 },
  lastRan: { fontSize: 10 },
  body: { padding: 16, gap: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  stratCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  stratIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stratName: { fontSize: 14, fontWeight: '600' },
  stratDetail: { fontSize: 12, marginTop: 2 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  periodLabel: { fontSize: 13, fontWeight: '600' },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8 },
  runBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chartCard: { borderRadius: 14, padding: 12, overflow: 'hidden' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '47%', padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricDesc: { fontSize: 10, lineHeight: 14 },
  signalsBar: { flexDirection: 'row', borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'space-around' },
  signalItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalCount: { fontSize: 18, fontWeight: '800' },
  signalLabel: { fontSize: 12 },
  signalDivider: { width: 1, height: 24 },
  emptyState: { borderRadius: 14, padding: 30, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
