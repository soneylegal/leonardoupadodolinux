"""
Serviço de Backtesting
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime

from app.services.metatrader_service import MetaTrader5Service
from app.services.technical_analysis_service import TechnicalAnalysisService
from app.models.strategy import Strategy
from app.models.log import Log, LogLevelEnum, LogTypeEnum


class BacktestingService:
    """Serviço para execução de backtests"""
    
    def __init__(self):
        self.mt5_service = MetaTrader5Service()
        self.ta_service = TechnicalAnalysisService()
    
    async def run_backtest(
        self,
        strategy: Strategy,
        start_date: datetime,
        end_date: datetime,
        initial_balance: float = 10000.0,
        db=None
    ) -> Dict:
        """Executa backtest de uma estratégia"""
        
        # Obter dados históricos
        df = await self.mt5_service.get_historical_data(
            symbol=strategy.asset,
            timeframe=strategy.timeframe.value,
            start_date=start_date,
            end_date=end_date
        )
        
        if df.empty:
            return self._empty_results(initial_balance)
        
        # Gerar sinais baseado no tipo de estratégia
        df = self.ta_service.generate_signals(
            df,
            strategy_type=strategy.strategy_type.value,
            ma_short_period=strategy.ma_short_period,
            ma_long_period=strategy.ma_long_period,
            rsi_period=strategy.rsi_period,
            rsi_overbought=strategy.rsi_overbought,
            rsi_oversold=strategy.rsi_oversold,
            macd_fast=strategy.macd_fast,
            macd_slow=strategy.macd_slow,
            macd_signal=strategy.macd_signal
        )
        
        # Simular trades
        results = self._simulate_trades(
            df=df,
            initial_balance=initial_balance,
            position_size=strategy.position_size,
            stop_loss_pct=strategy.stop_loss_percent,
            take_profit_pct=strategy.take_profit_percent
        )
        
        # Calcular métricas
        metrics = self._calculate_metrics(results, initial_balance)
        
        # Preparar dados do gráfico
        signal_points = self.ta_service.get_signal_points(df)
        
        chart_data = {
            "equity_curve": results["equity_curve"],
            "buy_signals": signal_points["buy_dates"],
            "buy_prices": signal_points["buy_prices"],
            "sell_signals": signal_points["sell_dates"],
            "sell_prices": signal_points["sell_prices"]
        }
        
        result_data = {
            "total_return": metrics["total_return"],
            "win_rate": metrics["win_rate"],
            "max_drawdown": metrics["max_drawdown"],
            "sharpe_ratio": metrics["sharpe_ratio"],
            "total_trades": metrics["total_trades"],
            "winning_trades": metrics["winning_trades"],
            "losing_trades": metrics["losing_trades"],
            "avg_win": metrics.get("avg_win"),
            "avg_loss": metrics.get("avg_loss"),
            "initial_balance": initial_balance,
            "final_balance": results["final_balance"],
            "chart_data": chart_data
        }

        # Gravar log no banco
        if db is not None:
            try:
                log = Log(
                    user_id=strategy.user_id,
                    level=LogLevelEnum.SUCCESS,
                    log_type=LogTypeEnum.SYSTEM,
                    message=f"Backtest concluído: {strategy.asset} | Retorno: {metrics['total_return']:+.1f}% | Win Rate: {metrics['win_rate']:.0f}% | Trades: {metrics['total_trades']}"
                )
                db.add(log)
                await db.commit()
            except Exception:
                pass

        return result_data
    
    def _simulate_trades(
        self,
        df: pd.DataFrame,
        initial_balance: float,
        position_size: int,
        stop_loss_pct: float,
        take_profit_pct: float
    ) -> Dict:
        """Simula a execução dos trades"""
        balance = initial_balance
        position = 0
        entry_price = 0
        trades = []
        equity_curve = [initial_balance]
        
        for i, row in df.iterrows():
            current_price = row['close']
            signal = row['Signal']
            
            # Verificar stop loss e take profit
            if position > 0:
                pnl_pct = (current_price - entry_price) / entry_price * 100
                
                if pnl_pct <= -stop_loss_pct or pnl_pct >= take_profit_pct:
                    # Fechar posição
                    pnl = (current_price - entry_price) * position
                    balance += pnl
                    trades.append({
                        "type": "SELL",
                        "price": current_price,
                        "quantity": position,
                        "pnl": pnl,
                        "reason": "Stop Loss" if pnl_pct <= -stop_loss_pct else "Take Profit"
                    })
                    position = 0
            
            # Processar sinais
            if signal == 1 and position == 0:  # Comprar
                cost = current_price * position_size
                if cost <= balance:
                    position = position_size
                    entry_price = current_price
                    balance -= cost
                    trades.append({
                        "type": "BUY",
                        "price": current_price,
                        "quantity": position,
                        "pnl": 0
                    })
            
            elif signal == -1 and position > 0:  # Vender
                pnl = (current_price - entry_price) * position
                balance += current_price * position
                trades.append({
                    "type": "SELL",
                    "price": current_price,
                    "quantity": position,
                    "pnl": pnl
                })
                position = 0
            
            # Calcular equity (saldo + valor da posição)
            equity = balance + (position * current_price)
            equity_curve.append(equity)
        
        # Fechar posição final
        if position > 0:
            final_price = df.iloc[-1]['close']
            pnl = (final_price - entry_price) * position
            balance += final_price * position
            trades.append({
                "type": "SELL",
                "price": final_price,
                "quantity": position,
                "pnl": pnl,
                "reason": "End of Backtest"
            })
        
        return {
            "trades": trades,
            "final_balance": balance,
            "equity_curve": equity_curve
        }
    
    def _calculate_metrics(self, results: Dict, initial_balance: float) -> Dict:
        """Calcula métricas de performance"""
        trades = results["trades"]
        equity_curve = results["equity_curve"]
        final_balance = results["final_balance"]
        
        # Retorno total
        total_return = ((final_balance - initial_balance) / initial_balance) * 100
        
        # Trades vencedores e perdedores
        sell_trades = [t for t in trades if t["type"] == "SELL"]
        winning_trades = len([t for t in sell_trades if t.get("pnl", 0) > 0])
        losing_trades = len([t for t in sell_trades if t.get("pnl", 0) <= 0])
        total_trades = len(sell_trades)
        
        # Win rate
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
        
        # Max Drawdown
        equity_series = pd.Series(equity_curve)
        rolling_max = equity_series.expanding().max()
        drawdown = (equity_series - rolling_max) / rolling_max * 100
        max_drawdown = drawdown.min()
        
        # Sharpe Ratio (simplificado)
        if len(equity_curve) > 1:
            returns = pd.Series(equity_curve).pct_change().dropna()
            if returns.std() != 0:
                sharpe_ratio = (returns.mean() / returns.std()) * np.sqrt(252)  # Anualizado
            else:
                sharpe_ratio = 0
        else:
            sharpe_ratio = 0
        
        # Ganho/perda médios
        winning_pnls = [t.get("pnl", 0) for t in sell_trades if t.get("pnl", 0) > 0]
        losing_pnls = [t.get("pnl", 0) for t in sell_trades if t.get("pnl", 0) <= 0]
        avg_win = round(sum(winning_pnls) / len(winning_pnls), 2) if winning_pnls else None
        avg_loss = round(sum(losing_pnls) / len(losing_pnls), 2) if losing_pnls else None
        # Converter para percentual se possível
        avg_win_pct = round((avg_win / initial_balance) * 100, 2) if avg_win and initial_balance else None
        avg_loss_pct = round((avg_loss / initial_balance) * 100, 2) if avg_loss and initial_balance else None

        return {
            "total_return": round(total_return, 2),
            "win_rate": round(win_rate, 2),
            "max_drawdown": round(max_drawdown, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "avg_win": avg_win_pct,
            "avg_loss": avg_loss_pct,
        }
    
    def _empty_results(self, initial_balance: float) -> Dict:
        """Retorna resultados vazios quando não há dados"""
        return {
            "total_return": 0,
            "win_rate": 0,
            "max_drawdown": 0,
            "sharpe_ratio": 0,
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "initial_balance": initial_balance,
            "final_balance": initial_balance,
            "chart_data": None
        }
