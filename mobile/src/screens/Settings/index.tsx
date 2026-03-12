/**
 * Tela de Configurações — REESCRITA
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../../store/themeStore';
import { settingsService } from '../../services';
import { Settings } from '../../types';

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const theme = getTheme(isDarkMode);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; time?: string } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsService.get();
      setSettings(data);
      setPaperTradingEnabled(data.paper_trading_enabled);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await settingsService.update({
        paper_trading_enabled: paperTradingEnabled,
        dark_mode_enabled: isDarkMode,
        api_key: apiKey || undefined,
        api_secret: apiSecret || undefined,
      });
      setApiKey('');
      setApiSecret('');
      await loadSettings();
      Alert.alert('Salvo', 'Configurações salvas com sucesso.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const r = await settingsService.testConnection();
      setTestResult({ ok: true, message: r.message, time: new Date().toLocaleTimeString('pt-BR') });
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message ?? 'Falha na conexão', time: new Date().toLocaleTimeString('pt-BR') });
    } finally {
      setSaving(false);
    }
  };

  const handleResetBalance = async () => {
    Alert.alert('Resetar Saldo', 'Confirmar reset do saldo para R$ 10.000,00?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', style: 'destructive',
        onPress: async () => {
          try {
            await settingsService.resetBalance();
            await loadSettings();
            Alert.alert('Sucesso', 'Saldo resetado para R$ 10.000,00');
          } catch {
            Alert.alert('Erro', 'Não foi possível resetar o saldo.');
          }
        },
      },
    ]);
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const apiConfigured = !!(settings?.api_key_masked);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Configurações</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Conta, API e preferências</Text>
        </View>
        <View style={[styles.modeBadge, { backgroundColor: paperTradingEnabled ? theme.success + '22' : theme.error + '22' }]}>
          <View style={[styles.modeDot, { backgroundColor: paperTradingEnabled ? theme.success : theme.error }]} />
          <Text style={[styles.modeBadgeText, { color: paperTradingEnabled ? theme.success : theme.error }]}>
            {paperTradingEnabled ? 'Paper' : 'Live'}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Saldo simulado */}
        <View style={[styles.balanceCard, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '44' }]}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Saldo simulado</Text>
              <Text style={[styles.balanceValue, { color: theme.text }]}>
                R$ {settings?.simulated_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '10.000,00'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: theme.error, backgroundColor: theme.error + '11' }]}
            onPress={handleResetBalance}
          >
            <Ionicons name="refresh" size={14} color={theme.error} />
            <Text style={[styles.resetBtnText, { color: theme.error }]}>Resetar para R$ 10.000</Text>
          </TouchableOpacity>
        </View>

        {/* Status da conexão MT5 */}
        <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Status da conexão</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: apiConfigured ? theme.success : theme.error }]} />
              <Text style={[styles.statusLabel, { color: theme.text }]}>
                API MT5: {apiConfigured ? 'Configurada' : 'Não configurada'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: paperTradingEnabled ? theme.success : '#ffa726' }]} />
              <Text style={[styles.statusLabel, { color: theme.text }]}>
                Paper Trading: {paperTradingEnabled ? 'Ativo' : 'Desativado'}
              </Text>
            </View>
          </View>
          {testResult && (
            <View style={[styles.testResultBox, {
              backgroundColor: testResult.ok ? theme.success + '18' : theme.error + '18',
              borderColor: testResult.ok ? theme.success : theme.error,
            }]}>
              <Ionicons name={testResult.ok ? 'checkmark-circle' : 'close-circle'} size={16}
                color={testResult.ok ? theme.success : theme.error} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.testResultText, { color: testResult.ok ? theme.success : theme.error }]}>
                  {testResult.message}
                </Text>
                {testResult.time && (
                  <Text style={[styles.testResultTime, { color: theme.textSecondary }]}>às {testResult.time}</Text>
                )}
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.testBtn, { borderColor: theme.primary }]}
            onPress={handleTestConnection}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color={theme.primary} /> : (
              <>
                <Ionicons name="wifi" size={16} color={theme.primary} />
                <Text style={[styles.testBtnText, { color: theme.primary }]}>Testar Conexão</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Chaves de API */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Chave de API (MT5)</Text>
          {apiConfigured && (
            <View style={[styles.configuredBadge, { backgroundColor: theme.success + '18' }]}>
              <Ionicons name="key" size={13} color={theme.success} />
              <Text style={[styles.configuredText, { color: theme.success }]}>
                API Key salva: {settings?.api_key_masked}
              </Text>
            </View>
          )}
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={apiConfigured ? 'Nova API Key (deixe vazio para manter)' : 'Cole sua API Key aqui'}
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowApiKey(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showApiKey ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 8 }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={apiSecret}
              onChangeText={setApiSecret}
              placeholder="API Secret"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={!showApiSecret}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowApiSecret(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showApiSecret ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Toggles */}
        <View style={[styles.toggleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Preferências</Text>

          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Paper Trading</Text>
              <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>Opera com dinheiro simulado, sem riscos reais</Text>
            </View>
            <Switch
              value={paperTradingEnabled}
              onValueChange={setPaperTradingEnabled}
              trackColor={{ false: theme.border, true: theme.success }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Modo Escuro</Text>
              <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>Alterna entre tema claro e escuro</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Botão salvar */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Salvar Configurações</Text>
            </>
          )}
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 3 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  modeDot: { width: 7, height: 7, borderRadius: 4 },
  modeBadgeText: { fontSize: 12, fontWeight: '700' },
  body: { padding: 16, gap: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '500', opacity: 0.65, marginBottom: 10 },
  balanceCard: { borderRadius: 12, padding: 16, borderWidth: 1, gap: 12 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 11, opacity: 0.7, marginBottom: 2 },
  balanceValue: { fontSize: 22, fontWeight: '600', marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 9 },
  resetBtnText: { fontSize: 13, fontWeight: '600' },
  statusCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  statusRow: { gap: 8 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14 },
  testResultBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  testResultText: { fontSize: 13, fontWeight: '600' },
  testResultTime: { fontSize: 11, marginTop: 2 },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  testBtnText: { fontSize: 14, fontWeight: '600' },
  section: { gap: 6 },
  configuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 9, borderRadius: 8, marginBottom: 6 },
  configuredText: { fontSize: 12, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 14, paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  toggleSection: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0 },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleDesc: { fontSize: 12, marginTop: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 10, gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
