/**
 * Tela de Paper Trading — execução manual de ordens simuladas
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeStore, getTheme } from '../../store/themeStore';
import { tradeService, dashboardService } from '../../services';
import { Trade, Position } from '../../types';

export default function PaperTradingScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = getTheme(isDarkMode);

  const [currentPrice, setCurrentPrice] = useState(25.50);
  const [balance, setBalance] = useState(10000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [asset] = useState('PETR4');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [balanceData, positionsData, tradesData, dashboardData] = await Promise.all([
        tradeService.getBalance(),
        tradeService.getPositions(),
        tradeService.list(10),
        dashboardService.getDashboard(),
      ]);
      setBalance(balanceData.simulated_balance);
      setPositions(positionsData);
      setRecentTrades(tradesData);
      setCurrentPrice(dashboardData.current_price);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Aumentando o intervalo do polling de 5s para 10s para poupar recursos em background
    intervalRef.current = setInterval(() => loadData(true), 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleTrade = (orderType: 'BUY' | 'SELL') => {
    const quantity = 100;
    const action = orderType === 'BUY' ? 'comprar' : 'vender';
    Alert.alert(
      `Confirmar ${orderType === 'BUY' ? 'Compra' : 'Venda'}`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} ${quantity} ${asset} @ R$ ${currentPrice.toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await tradeService.executePaperTrade(asset, orderType, quantity, currentPrice);
              Alert.alert('Ordem executada', `${orderType === 'BUY' ? 'Compra' : 'Venda'} de ${quantity} ${asset} registrada.`);
              loadData();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.detail ?? 'Não foi possível executar a ordem.');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR') + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const styles = createStyles(theme);
  const currentPosition = positions.find(p => p.asset === asset);
  const pricePnl = currentPosition
    ? (currentPrice - currentPosition.avg_price) * currentPosition.quantity
    : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Paper Trading</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.modeBadge, { backgroundColor: theme.warning + '22' }]}>
          <Text style={[styles.modeBadgeText, { color: theme.warning }]}>Simulado</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Preço atual */}
        <View style={[styles.priceCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.priceAsset, { color: theme.textSecondary }]}>{asset}</Text>
          <Text style={[styles.priceValue, { color: theme.text }]}>
            {formatCurrency(currentPrice)}
          </Text>
          {currentPosition && pricePnl !== null && (
            <Text style={[styles.pricePnl, { color: pricePnl >= 0 ? theme.success : theme.error }]}>
              {pricePnl >= 0 ? '+' : ''}{formatCurrency(pricePnl)} na posição aberta
            </Text>
          )}
        </View>

        {/* Botões Comprar / Vender */}
        <View style={styles.tradeRow}>
          <TouchableOpacity
            style={[styles.tradeBtn, { backgroundColor: theme.success }]}
            onPress={() => handleTrade('BUY')}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
            <Text style={styles.tradeBtnText}>Comprar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tradeBtn, { backgroundColor: theme.error }]}
            onPress={() => handleTrade('SELL')}
          >
            <Ionicons name="arrow-down" size={18} color="#fff" />
            <Text style={styles.tradeBtnText}>Vender</Text>
          </TouchableOpacity>
        </View>

        {/* Conta */}
        <View style={[styles.accountCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Conta</Text>
          <View style={styles.accountRow}>
            <Text style={[styles.accountLabel, { color: theme.textSecondary }]}>Saldo simulado</Text>
            <Text style={[styles.accountValue, { color: theme.text }]}>{formatCurrency(balance)}</Text>
          </View>
          <View style={[styles.accountDivider, { backgroundColor: theme.border }]} />
          <View style={styles.accountRow}>
            <Text style={[styles.accountLabel, { color: theme.textSecondary }]}>Posição aberta</Text>
            {currentPosition ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.accountValue, { color: theme.text }]}>
                  {currentPosition.quantity} {asset}
                </Text>
                <Text style={[styles.accountSub, { color: theme.textSecondary }]}>
                  Preço médio {formatCurrency(currentPosition.avg_price)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.accountValue, { color: theme.textSecondary }]}>Nenhuma</Text>
            )}
          </View>
        </View>

        {/* Ordens recentes */}
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Ordens recentes</Text>
          {recentTrades.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhuma ordem ainda</Text>
            </View>
          ) : (
            recentTrades.slice(0, 5).map((trade) => (
              <View
                key={trade.id}
                style={[styles.tradeCard, { backgroundColor: theme.card }]}
              >
                <View style={[styles.tradeTypeTag, {
                  backgroundColor: trade.order_type === 'BUY' ? theme.success + '22' : theme.error + '22',
                }]}>
                  <Text style={[styles.tradeTypeText, {
                    color: trade.order_type === 'BUY' ? theme.success : theme.error,
                  }]}>
                    {trade.order_type === 'BUY' ? 'Compra' : 'Venda'}
                  </Text>
                </View>
                <View style={styles.tradeInfo}>
                  <Text style={[styles.tradeAsset, { color: theme.text }]}>
                    {trade.quantity} {trade.asset}
                  </Text>
                  <Text style={[styles.tradeDate, { color: theme.textSecondary }]}>
                    {formatDate(trade.executed_at)}
                  </Text>
                </View>
                <Text style={[styles.tradePrice, { color: theme.text }]}>
                  {formatCurrency(trade.price)}
                </Text>
              </View>
            ))
          )}
        </View>
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
  subtitle: { fontSize: 11, marginTop: 2 },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  modeBadgeText: { fontSize: 11, fontWeight: '600' },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  priceCard: {
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 4,
  },
  priceAsset: { fontSize: 13, fontWeight: '500' },
  priceValue: { fontSize: 36, fontWeight: '700' },
  pricePnl: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  tradeRow: { flexDirection: 'row', gap: 12 },
  tradeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 12, gap: 8,
  },
  tradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  accountCard: { borderRadius: 14, padding: 16, gap: 12 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountDivider: { height: 1, opacity: 0.5 },
  accountLabel: { fontSize: 13 },
  accountValue: { fontSize: 14, fontWeight: '600' },
  accountSub: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '500', opacity: 0.65, marginBottom: 8 },
  tradeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, marginBottom: 6,
  },
  tradeTypeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tradeTypeText: { fontSize: 11, fontWeight: '600' },
  tradeInfo: { flex: 1 },
  tradeAsset: { fontSize: 13, fontWeight: '600' },
  tradeDate: { fontSize: 11, marginTop: 2 },
  tradePrice: { fontSize: 13, fontWeight: '600' },
  emptyCard: { borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13 },
});
