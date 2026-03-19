/**
 * Tipos TypeScript para o aplicativo
 */

// ================= ENUMS =================

export type TimeframeType = '1M' | '5M' | '1H' | '1D';
export type OrderType = 'BUY' | 'SELL';
export type LogLevel = 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';

// ================= USER =================

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ================= SETTINGS =================

export interface Settings {
  paper_trading_enabled: boolean;
  dark_mode_enabled: boolean;
  api_key_masked: string | null;
  simulated_balance: number;
}

// ================= STRATEGY =================

export interface Strategy {
  id: number;
  name: string;
  description?: string;
  asset: string;
  timeframe: TimeframeType;
  ma_short_period: number;
  ma_long_period: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  position_size: number;
  is_active: boolean;
  created_at: string;
}

export interface StrategyFormData {
  name: string;
  asset: string;
  timeframe: TimeframeType;
  ma_short_period: number;
  ma_long_period: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  position_size: number;
  is_active?: boolean;
}

// ================= TRADE =================

export interface Trade {
  id: number;
  asset: string;
  order_type: OrderType;
  quantity: number;
  price: number;
  total_value: number;
  status: string;
  executed_at: string;
}

export interface Position {
  asset: string;
  quantity: number;
  avg_price: number;
}

// ================= BACKTEST =================

export interface BacktestResult {
  id: number;
  strategy_id: number;
  start_date: string;
  end_date: string;
  total_return: number;
  win_rate: number;
  max_drawdown: number;
  sharpe_ratio: number;
  total_trades: number;
  avg_win?: number;
  avg_loss?: number;
  chart_data?: ChartData;
  created_at: string;
}

export interface ChartData {
  equity_curve: number[];
  buy_signals: string[];
  buy_prices: number[];
  sell_signals: string[];
  sell_prices: number[];
}

// ================= LOG =================

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  created_at: string;
}

// ================= DASHBOARD =================

export interface BotStatus {
  is_running: boolean;
  status_text: string;
}

export interface DashboardData {
  bot_status: BotStatus;
  todays_pnl: number;
  last_trade: Trade | null;
  current_price: number;
  asset: string;
  simulated_balance: number;
}

// ================= CHART =================

export interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponseData {
  asset: string;
  timeframe: string;
  candles: CandleData[];
  ma_short: number[];
  ma_long: number[];
}

// ================= ASSET =================

export interface Asset {
  symbol: string;
  name: string;
}

// ================= NAVIGATION =================

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Strategy: undefined;
  Backtest: undefined;
  Trades: undefined;
  Logs: undefined;
  Settings: undefined;
};
