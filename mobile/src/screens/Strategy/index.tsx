/**
 * Tela de Configuração de Estratégia
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../../store/themeStore';
import { useStrategyStore } from '../../store/strategyStore';
import { TimeframeType, Asset } from '../../types';

const TIMEFRAMES: { label: string; value: TimeframeType }[] = [
  { label: '1 min',  value: '1M' },
  { label: '5 min',  value: '5M' },
  { label: '1 hora', value: '1H' },
  { label: '1 dia',  value: '1D' },
];

const DEFAULT_ASSETS: Asset[] = [
  { symbol: 'PETR4', name: 'Petrobras PN' },
  { symbol: 'VALE3', name: 'Vale ON' },
  { symbol: 'ITUB4', name: 'Itaú Unibanco PN' },
  { symbol: 'BBDC4', name: 'Bradesco PN' },
  { symbol: 'ABEV3', name: 'Ambev ON' },
  { symbol: 'WEGE3', name: 'WEG ON' },
  { symbol: 'RENT3', name: 'Localiza ON' },
];

export default function StrategyScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = getTheme(isDarkMode);

  const { strategies, availableAssets, currentStrategy, loadStrategies, loadAssets, createStrategy, updateStrategy, setCurrentStrategy } = useStrategyStore();

  const [selectedAsset, setSelectedAsset] = useState('PETR4');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('1D');
  const [maShort, setMaShort] = useState(9);
  const [maLong, setMaLong] = useState(21);
  const [stopLoss, setStopLoss] = useState(2.0);
  const [takeProfit, setTakeProfit] = useState(4.0);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const assets = availableAssets.length > 0 ? availableAssets : DEFAULT_ASSETS;
  const assetName = assets.find(a => a.symbol === selectedAsset)?.name ?? selectedAsset;
  const isEdit = !!currentStrategy;

  useEffect(() => {
    loadStrategies();
    loadAssets();
  }, []);

  useEffect(() => {
    if (currentStrategy) {
      setSelectedAsset(currentStrategy.asset);
      setSelectedTimeframe(currentStrategy.timeframe);
      setMaShort(currentStrategy.ma_short_period);
      setMaLong(currentStrategy.ma_long_period);
      setStopLoss(currentStrategy.stop_loss_percent);
      setTakeProfit(currentStrategy.take_profit_percent);
    }
  }, [currentStrategy]);

  const handleSave = async () => {
    if (maShort >= maLong) {
      Alert.alert('Configuração inválida', 'O período da MA Curta deve ser menor que o da MA Longa.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        asset: selectedAsset,
        timeframe: selectedTimeframe,
        ma_short_period: maShort,
        ma_long_period: maLong,
        stop_loss_percent: stopLoss,
        take_profit_percent: takeProfit,
      };
      if (isEdit) {
        await updateStrategy(currentStrategy.id, payload);
      } else {
        const s = await createStrategy({ name: `Estratégia ${selectedAsset}`, ...payload, position_size: 100 });
        setCurrentStrategy(s);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a estratégia. Verifique o backend.');
    } finally {
      setSaving(false);
    }
  };

  const riskRatio = stopLoss > 0 ? (takeProfit / stopLoss).toFixed(1) : '—';
  const styles = createStyles(theme);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Configurar Estratégia</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isEdit ? `Editando: ${currentStrategy.name}` : 'Nova estratégia de cruzamento de MAs'}
          </Text>
        </View>
        {isEdit && (
          <View style={[styles.activeBadge, { backgroundColor: theme.success + '22' }]}>
            <Ionicons name="checkmark-circle" size={13} color={theme.success} />
            <Text style={[styles.activeBadgeText, { color: theme.success }]}>Ativa</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {/* Ativo */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Ativo</Text>
          <TouchableOpacity
            style={[styles.assetSelector, { backgroundColor: theme.card, borderColor: showAssetPicker ? theme.primary : theme.border }]}
            onPress={() => setShowAssetPicker(!showAssetPicker)}
          >
            <View>
              <Text style={[styles.assetSymbol, { color: theme.text }]}>{selectedAsset}</Text>
              <Text style={[styles.assetName, { color: theme.textSecondary }]}>{assetName}</Text>
            </View>
            <Ionicons name={showAssetPicker ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {showAssetPicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {assets.map(a => (
                <TouchableOpacity
                  key={a.symbol}
                  style={[styles.pickerItem, selectedAsset === a.symbol && { backgroundColor: theme.primary + '18' }]}
                  onPress={() => { setSelectedAsset(a.symbol); setShowAssetPicker(false); }}
                >
                  <Text style={[styles.pickerSymbol, { color: selectedAsset === a.symbol ? theme.primary : theme.text }]}>{a.symbol}</Text>
                  <Text style={[styles.pickerName, { color: theme.textSecondary }]}>{a.name}</Text>
                  {selectedAsset === a.symbol && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Timeframe */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Timeframe do candle</Text>
          <View style={styles.tfRow}>
            {TIMEFRAMES.map(tf => (
              <TouchableOpacity
                key={tf.value}
                style={[styles.tfBtn, { borderColor: selectedTimeframe === tf.value ? theme.primary : theme.border, backgroundColor: selectedTimeframe === tf.value ? theme.primary + '18' : 'transparent' }]}
                onPress={() => setSelectedTimeframe(tf.value)}
              >
                <Text style={[styles.tfLabel, { color: selectedTimeframe === tf.value ? theme.primary : theme.textSecondary }]}>{tf.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* MAs */}
        <View style={[styles.section, styles.maCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Médias móveis</Text>

          {/* MA Curta */}
          <View style={styles.sliderBlock}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <View style={[styles.maColorDot, { backgroundColor: '#fbbf24' }]} />
                <Text style={[styles.sliderLabel, { color: theme.text }]}>MA Curta (rápida)</Text>
              </View>
              <View style={[styles.valuePill, { backgroundColor: '#fbbf2420' }]}>
                <Text style={[styles.valueText, { color: '#fbbf24' }]}>{maShort}</Text>
              </View>
            </View>
            <Slider style={styles.slider} minimumValue={2} maximumValue={50} step={1}
              value={maShort} onValueChange={v => setMaShort(v)}
              minimumTrackTintColor='#fbbf24' maximumTrackTintColor={theme.border} thumbTintColor='#fbbf24' />
          </View>

          {/* MA Longa */}
          <View style={styles.sliderBlock}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <View style={[styles.maColorDot, { backgroundColor: '#93c5fd' }]} />
                <Text style={[styles.sliderLabel, { color: theme.text }]}>MA Longa (lenta)</Text>
              </View>
              <View style={[styles.valuePill, { backgroundColor: '#93c5fd20' }]}>
                <Text style={[styles.valueText, { color: '#93c5fd' }]}>{maLong}</Text>
              </View>
            </View>
            <Slider style={styles.slider} minimumValue={5} maximumValue={200} step={1}
              value={maLong} onValueChange={v => setMaLong(v)}
              minimumTrackTintColor='#93c5fd' maximumTrackTintColor={theme.border} thumbTintColor='#93c5fd' />
          </View>

          {maShort >= maLong && (
            <View style={[styles.warning, { backgroundColor: theme.error + '18' }]}>
              <Ionicons name="warning" size={14} color={theme.error} />
              <Text style={[styles.warningText, { color: theme.error }]}>MA Curta deve ser menor que MA Longa</Text>
            </View>
          )}
        </View>

        {/* Risco */}
        <View style={[styles.section, styles.riskCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Gerenciamento de risco</Text>
          <View style={styles.riskRow}>
            <View style={styles.riskItem}>
              <Text style={[styles.riskLabel, { color: theme.textSecondary }]}>Stop Loss</Text>
              <View style={[styles.riskInput, { borderColor: theme.error, backgroundColor: theme.error + '11' }]}>
                <Text style={[styles.riskValue, { color: theme.error }]}>−{stopLoss.toFixed(1)}%</Text>
              </View>
              <Slider style={styles.slider} minimumValue={0.5} maximumValue={10} step={0.5}
                value={stopLoss} onValueChange={v => setStopLoss(v)}
                minimumTrackTintColor={theme.error} maximumTrackTintColor={theme.border} thumbTintColor={theme.error} />
            </View>
            <View style={styles.riskItem}>
              <Text style={[styles.riskLabel, { color: theme.textSecondary }]}>Take Profit</Text>
              <View style={[styles.riskInput, { borderColor: theme.success, backgroundColor: theme.success + '11' }]}>
                <Text style={[styles.riskValue, { color: theme.success }]}>+{takeProfit.toFixed(1)}%</Text>
              </View>
              <Slider style={styles.slider} minimumValue={0.5} maximumValue={20} step={0.5}
                value={takeProfit} onValueChange={v => setTakeProfit(v)}
                minimumTrackTintColor={theme.success} maximumTrackTintColor={theme.border} thumbTintColor={theme.success} />
            </View>
          </View>
          <View style={[styles.ratioBar, { backgroundColor: theme.border }]}>
            <Ionicons name="git-compare-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.ratioText, { color: theme.textSecondary }]}>
              Risco/Retorno: <Text style={{ color: theme.text }}>1:{riskRatio}</Text>
            </Text>
          </View>
        </View>

        {/* Estratégias salvas */}
        {strategies.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Estratégias salvas</Text>
            {strategies.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.strategyCard, { backgroundColor: theme.card, borderColor: currentStrategy?.id === s.id ? theme.primary : theme.border }]}
                onPress={() => setCurrentStrategy(s)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.strategyName, { color: theme.text }]}>{s.name}</Text>
                  <Text style={[styles.strategyDetail, { color: theme.textSecondary }]}>
                    {s.asset} · {s.timeframe} · MA {s.ma_short_period}/{s.ma_long_period}
                  </Text>
                </View>
                {currentStrategy?.id === s.id && <Ionicons name="radio-button-on" size={18} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botão salvar */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? theme.success : theme.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name={saved ? 'checkmark-circle' : (isEdit ? 'save' : 'add-circle')} size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {saved ? 'Estratégia salva!' : (isEdit ? 'Atualizar Estratégia' : 'Criar Estratégia')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  title: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 3 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  activeBadgeText: { fontSize: 12, fontWeight: '600' },
  body: { padding: 16, gap: 20, paddingBottom: 40 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '500', opacity: 0.65, marginBottom: 4 },
  assetSelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  assetSymbol: { fontSize: 17, fontWeight: '600' },
  assetName: { fontSize: 12, marginTop: 2 },
  pickerDropdown: {
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', padding: 13,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 10,
  },
  pickerSymbol: { fontSize: 14, fontWeight: '600', width: 52 },
  pickerName: { flex: 1, fontSize: 13 },
  tfRow: { flexDirection: 'row', gap: 8 },
  tfBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  tfLabel: { fontSize: 13, fontWeight: '600' },
  maCard: { borderRadius: 14, padding: 16 },
  sliderBlock: { gap: 4 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  maColorDot: { width: 10, height: 10, borderRadius: 5 },
  sliderLabel: { fontSize: 14, fontWeight: '500' },
  valuePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  valueText: { fontSize: 15, fontWeight: '600' },
  slider: { width: '100%', height: 36 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8 },
  warningText: { fontSize: 12 },
  riskCard: { borderRadius: 14, padding: 16, gap: 12 },
  riskRow: { flexDirection: 'row', gap: 16 },
  riskItem: { flex: 1, gap: 6 },
  riskLabel: { fontSize: 12, fontWeight: '600' },
  riskInput: { alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  riskValue: { fontSize: 18, fontWeight: '600' },
  ratioBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8 },
  ratioText: { fontSize: 13 },
  strategyCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12,
  },
  strategyName: { fontSize: 14, fontWeight: '600' },
  strategyDetail: { fontSize: 11, marginTop: 3 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 14, gap: 10, marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
