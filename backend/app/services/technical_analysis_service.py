"""
Serviço de Análise Técnica com implementações próprias (numpy/pandas)
Não requer pandas-ta ou ta-lib
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime


class TechnicalAnalysisService:
    """Serviço para cálculo de indicadores técnicos"""
    
    def _sma(self, series: pd.Series, period: int) -> pd.Series:
        """Calcula Média Móvel Simples (SMA)"""
        return series.rolling(window=period).mean()
    
    def _ema(self, series: pd.Series, period: int) -> pd.Series:
        """Calcula Média Móvel Exponencial (EMA)"""
        return series.ewm(span=period, adjust=False).mean()
    
    def calculate_moving_averages(
        self,
        df: pd.DataFrame,
        short_period: int = 9,
        long_period: int = 21
    ) -> pd.DataFrame:
        """Calcula médias móveis simples"""
        df = df.copy()
        df[f'MA_{short_period}'] = self._sma(df['close'], short_period)
        df[f'MA_{long_period}'] = self._sma(df['close'], long_period)
        return df
    
    def calculate_ema(
        self,
        df: pd.DataFrame,
        short_period: int = 9,
        long_period: int = 21
    ) -> pd.DataFrame:
        """Calcula médias móveis exponenciais"""
        df = df.copy()
        df[f'EMA_{short_period}'] = self._ema(df['close'], short_period)
        df[f'EMA_{long_period}'] = self._ema(df['close'], long_period)
        return df
    
    def calculate_rsi(
        self,
        df: pd.DataFrame,
        period: int = 14
    ) -> pd.DataFrame:
        """Calcula o Índice de Força Relativa (RSI/IFR)"""
        df = df.copy()
        delta = df['close'].diff()
        
        gain = delta.where(delta > 0, 0)
        loss = (-delta).where(delta < 0, 0)
        
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        
        rs = avg_gain / avg_loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        return df
    
    def calculate_macd(
        self,
        df: pd.DataFrame,
        fast: int = 12,
        slow: int = 26,
        signal: int = 9
    ) -> pd.DataFrame:
        """Calcula o MACD"""
        df = df.copy()
        
        ema_fast = self._ema(df['close'], fast)
        ema_slow = self._ema(df['close'], slow)
        
        df[f'MACD_{fast}_{slow}_{signal}'] = ema_fast - ema_slow
        df[f'MACDs_{fast}_{slow}_{signal}'] = self._ema(
            df[f'MACD_{fast}_{slow}_{signal}'], signal
        )
        df[f'MACDh_{fast}_{slow}_{signal}'] = (
            df[f'MACD_{fast}_{slow}_{signal}'] - df[f'MACDs_{fast}_{slow}_{signal}']
        )
        
        return df
    
    def calculate_bollinger_bands(
        self,
        df: pd.DataFrame,
        period: int = 20,
        std: float = 2.0
    ) -> pd.DataFrame:
        """Calcula Bandas de Bollinger"""
        df = df.copy()
        
        sma = self._sma(df['close'], period)
        rolling_std = df['close'].rolling(window=period).std()
        
        df[f'BBM_{period}_{std}'] = sma  # Middle Band
        df[f'BBU_{period}_{std}'] = sma + (rolling_std * std)  # Upper Band
        df[f'BBL_{period}_{std}'] = sma - (rolling_std * std)  # Lower Band
        df[f'BBB_{period}_{std}'] = (
            (df[f'BBU_{period}_{std}'] - df[f'BBL_{period}_{std}']) / sma * 100
        )  # Bandwidth
        
        return df
    
    def calculate_stochastic(
        self,
        df: pd.DataFrame,
        k_period: int = 14,
        d_period: int = 3
    ) -> pd.DataFrame:
        """Calcula o Estocástico"""
        df = df.copy()
        
        lowest_low = df['low'].rolling(window=k_period).min()
        highest_high = df['high'].rolling(window=k_period).max()
        
        df['STOCH_K'] = 100 * (df['close'] - lowest_low) / (highest_high - lowest_low)
        df['STOCH_D'] = df['STOCH_K'].rolling(window=d_period).mean()
        
        return df
    
    def calculate_atr(
        self,
        df: pd.DataFrame,
        period: int = 14
    ) -> pd.DataFrame:
        """Calcula o Average True Range (ATR)"""
        df = df.copy()
        
        high_low = df['high'] - df['low']
        high_close = np.abs(df['high'] - df['close'].shift())
        low_close = np.abs(df['low'] - df['close'].shift())
        
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df['ATR'] = tr.rolling(window=period).mean()
        
        return df
    
    def calculate_all_indicators(
        self,
        df: pd.DataFrame,
        ma_short: int = 9,
        ma_long: int = 21,
        rsi_period: int = 14,
        macd_fast: int = 12,
        macd_slow: int = 26,
        macd_signal: int = 9
    ) -> pd.DataFrame:
        """Calcula todos os indicadores de uma vez"""
        df = self.calculate_moving_averages(df, ma_short, ma_long)
        df = self.calculate_ema(df, ma_short, ma_long)
        df = self.calculate_rsi(df, rsi_period)
        df = self.calculate_macd(df, macd_fast, macd_slow, macd_signal)
        df = self.calculate_bollinger_bands(df)
        df = self.calculate_stochastic(df)
        df = self.calculate_atr(df)
        return df
    
    def detect_ma_crossover(
        self,
        df: pd.DataFrame,
        short_col: str,
        long_col: str
    ) -> pd.DataFrame:
        """Detecta cruzamentos de médias móveis"""
        df = df.copy()
        
        # Sinal de compra: MA curta cruza acima da MA longa
        df['MA_Cross_Up'] = (
            (df[short_col] > df[long_col]) & 
            (df[short_col].shift(1) <= df[long_col].shift(1))
        )
        
        # Sinal de venda: MA curta cruza abaixo da MA longa
        df['MA_Cross_Down'] = (
            (df[short_col] < df[long_col]) & 
            (df[short_col].shift(1) >= df[long_col].shift(1))
        )
        
        return df
    
    def generate_signals(
        self,
        df: pd.DataFrame,
        strategy_type: str = "ma_crossover",
        **params
    ) -> pd.DataFrame:
        """Gera sinais de compra/venda baseado na estratégia"""
        df = df.copy()
        df['Signal'] = 0  # 0 = Hold, 1 = Buy, -1 = Sell
        
        if strategy_type == "ma_crossover":
            short_period = params.get('ma_short_period', 9)
            long_period = params.get('ma_long_period', 21)
            
            short_col = f'MA_{short_period}'
            long_col = f'MA_{long_period}'
            
            if short_col not in df.columns:
                df = self.calculate_moving_averages(df, short_period, long_period)
            
            df = self.detect_ma_crossover(df, short_col, long_col)
            
            df.loc[df['MA_Cross_Up'], 'Signal'] = 1
            df.loc[df['MA_Cross_Down'], 'Signal'] = -1
        
        elif strategy_type == "rsi":
            period = params.get('rsi_period', 14)
            overbought = params.get('rsi_overbought', 70)
            oversold = params.get('rsi_oversold', 30)
            
            if 'RSI' not in df.columns:
                df = self.calculate_rsi(df, period)
            
            # Compra quando RSI sai de sobrevenda
            df.loc[
                (df['RSI'] > oversold) & (df['RSI'].shift(1) <= oversold),
                'Signal'
            ] = 1
            
            # Vende quando RSI entra em sobrecompra
            df.loc[
                (df['RSI'] < overbought) & (df['RSI'].shift(1) >= overbought),
                'Signal'
            ] = -1
        
        elif strategy_type == "macd":
            fast = params.get('macd_fast', 12)
            slow = params.get('macd_slow', 26)
            signal = params.get('macd_signal', 9)
            
            macd_col = f'MACD_{fast}_{slow}_{signal}'
            signal_col = f'MACDs_{fast}_{slow}_{signal}'
            
            if macd_col not in df.columns:
                df = self.calculate_macd(df, fast, slow, signal)
            
            # Compra quando MACD cruza acima da linha de sinal
            df.loc[
                (df[macd_col] > df[signal_col]) & 
                (df[macd_col].shift(1) <= df[signal_col].shift(1)),
                'Signal'
            ] = 1
            
            # Vende quando MACD cruza abaixo da linha de sinal
            df.loc[
                (df[macd_col] < df[signal_col]) & 
                (df[macd_col].shift(1) >= df[signal_col].shift(1)),
                'Signal'
            ] = -1
        
        elif strategy_type == "bollinger":
            period = params.get('bb_period', 20)
            std = params.get('bb_std', 2.0)
            
            lower_col = f'BBL_{period}_{std}'
            upper_col = f'BBU_{period}_{std}'
            
            if lower_col not in df.columns:
                df = self.calculate_bollinger_bands(df, period, std)
            
            # Compra quando preço toca banda inferior
            df.loc[df['close'] <= df[lower_col], 'Signal'] = 1
            
            # Vende quando preço toca banda superior
            df.loc[df['close'] >= df[upper_col], 'Signal'] = -1
        
        return df
    
    def calculate_support_resistance(
        self,
        df: pd.DataFrame,
        window: int = 20
    ) -> Dict[str, List[float]]:
        """Calcula níveis de suporte e resistência"""
        pivots_high = df['high'].rolling(window=window, center=True).max()
        pivots_low = df['low'].rolling(window=window, center=True).min()
        
        # Encontrar pontos de resistência (máximas locais)
        resistance_mask = df['high'] == pivots_high
        resistance_levels = df.loc[resistance_mask, 'high'].unique().tolist()
        
        # Encontrar pontos de suporte (mínimas locais)
        support_mask = df['low'] == pivots_low
        support_levels = df.loc[support_mask, 'low'].unique().tolist()
        
        # Ordenar e retornar os níveis mais recentes
        resistance_levels = sorted(resistance_levels, reverse=True)[:5]
        support_levels = sorted(support_levels)[:5]
        
        return {
            'resistance': resistance_levels,
            'support': support_levels
        }
    
    def get_trend_direction(
        self,
        df: pd.DataFrame,
        period: int = 20
    ) -> str:
        """Determina a direção da tendência"""
        if len(df) < period:
            return "undefined"
        
        ma = self._sma(df['close'], period)
        current_price = df['close'].iloc[-1]
        current_ma = ma.iloc[-1]
        
        # Calcular a inclinação da MA
        ma_slope = ma.iloc[-1] - ma.iloc[-5] if len(ma) >= 5 else 0
        
        if current_price > current_ma and ma_slope > 0:
            return "bullish"
        elif current_price < current_ma and ma_slope < 0:
            return "bearish"
        else:
            return "neutral"


    def get_signal_points(self, df: pd.DataFrame) -> Dict:
        """Extrai pontos de compra e venda de um DataFrame já processado com generate_signals"""
        buy_mask = df['Signal'] == 1
        sell_mask = df['Signal'] == -1

        buy_df = df[buy_mask]
        sell_df = df[sell_mask]

        def fmt_index(idx):
            if hasattr(idx, 'strftime'):
                return idx.strftime('%Y-%m-%d')
            return str(idx)

        return {
            'buy_dates': [fmt_index(i) for i in buy_df.index.tolist()],
            'buy_prices': buy_df['close'].tolist(),
            'sell_dates': [fmt_index(i) for i in sell_df.index.tolist()],
            'sell_prices': sell_df['close'].tolist(),
        }


# Instância global do serviço
technical_analysis_service = TechnicalAnalysisService()
