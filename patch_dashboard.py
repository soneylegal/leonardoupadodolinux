import re

with open("mobile/src/screens/Dashboard/index.tsx", "r") as f:
    content = f.read()

# Replace loadData
old_load = """  const loadData = useCallback(async (silent = false) => {
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
  }, [asset]);"""

new_load = """  const loadData = useCallback(async (silent = false, fetchChart = false) => {
    if (!silent) setRefreshing(true);
    try {
      const promises: Promise<any>[] = [
        dashboardService.getDashboard(),
        settingsService.get()
      ];
      if (fetchChart) {
        promises.push(dashboardService.getChartData(asset, '1D'));
      }
      
      const results = await Promise.all(promises);
      setDashboard(results[0]);
      setBalance(results[1].simulated_balance);
      
      if (fetchChart && results.length > 2) {
        setChartData(results[2]);
      }
      
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [asset]);"""

if old_load in content:
    content = content.replace(old_load, new_load)
else:
    print("could not find loadData")

# Replace useEffect
old_effect = """  useEffect(() => {
    loadStrategies();
    loadData();
    intervalRef.current = setInterval(() => loadData(true), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); 
};                                                                                }, [loadData]);"""

old_effect_clean = """  useEffect(() => {
    loadStrategies();
    loadData();
    intervalRef.current = setInterval(() => loadData(true), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadData]);"""

new_effect = """  useEffect(() => {
    loadStrategies();
    loadData(false, true);
    intervalRef.current = setInterval(() => loadData(true, false), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadData]);"""

content = re.sub(r"  useEffect\(\(\) => \{[\s\S]*?\}, \[loadData\]\);", new_effect, content)

# Replace onRefresh
old_refresh = """  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);"""

new_refresh = """  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false, true);
  }, [loadData]);"""

content = content.replace(old_refresh, new_refresh)

with open("mobile/src/screens/Dashboard/index.tsx", "w") as f:
    f.write(content)

print("Patch applied for Dashboard")
