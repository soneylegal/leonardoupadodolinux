#!/bin/bash
echo "Testing Dashboard:"
curl -s http://localhost:8000/api/v1/dashboard/ | grep '{}' || echo "OK Dashboard"

echo "Testing Strategy Post:"
curl -s -X POST http://localhost:8000/api/v1/strategies/ \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Estratégia MACD",
      "description": "Teste",
      "asset": "PETR4",
      "timeframe": "1D",
      "strategy_type": "MACD",
      "macd_fast": 12,
      "macd_slow": 26,
      "macd_signal": 9,
      "stop_loss_percent": 2.5,
      "take_profit_percent": 5.0,
      "position_size": 100,
      "is_active": true
    }'

echo -e "\nTesting Trade Post:"
curl -s -X POST http://localhost:8000/api/v1/trades/paper \
    -H "Content-Type: application/json" \
    -d '{
      "asset": "PETR4",
      "order_type": "BUY",
      "quantity": 100,
      "price": 35.5
    }'

