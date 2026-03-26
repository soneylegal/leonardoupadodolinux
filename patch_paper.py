import re

with open("mobile/src/screens/PaperTrading/index.tsx", "r") as f:
    content = f.read()

new_effect = """  useEffect(() => {
    loadData();
    // Aumentando o intervalo do polling de 5s para 10s para poupar recursos em background
    intervalRef.current = setInterval(() => loadData(true), 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadData]);"""

content = re.sub(r"  useEffect\(\(\) => \{[\s\S]*?\}, \[loadData\]\);", new_effect, content)

with open("mobile/src/screens/PaperTrading/index.tsx", "w") as f:
    f.write(content)

print("Patch applied for PaperTrading")
