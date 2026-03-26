import re

with open("mobile/src/screens/Backtest/index.tsx", "r") as f:
    content = f.read()

# Removing the svg polyfill and replace with a standard conditional view
old_web = """    if (Platform.OS === 'web') {
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
      
      const fillPts = `${pad},${H - pad} ${pts} ${pad + (equityCurve.length - 1)
 * step},${H - pad}`;                                                           
      return (
        <View style={{ height: H, width: '100%', overflow: 'hidden', padding: 12
 }}>                                                                                      {/* @ts-ignore */}
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ wid
th: '100%', height: '100%' }}>                                                              <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#42a5f5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#42a5f5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPts} fill="url(#eqGrad)" />
            <polyline points={pts} fill="none" stroke="#42a5f5" strokeWidth="3" 
strokeLinejoin="round" />                                                                 </svg>
        </View>
      );
    }"""

old_web_clean = """    if (Platform.OS === 'web') {
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
    }"""

new_web = """    if (Platform.OS === 'web') {
      return (
        <View style={{ height: 180, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
          <Text style={{color: theme.textSecondary}}>Gráfico renderizado nativamente no mobile. Resultado em formato texto disponível na plataforma web.</Text>
        </View>
      );
    }"""

content = content.replace(old_web_clean, new_web)

with open("mobile/src/screens/Backtest/index.tsx", "w") as f:
    f.write(content)

print("Patch applied for Backtest")
