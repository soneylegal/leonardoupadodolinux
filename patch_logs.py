import re

with open("mobile/src/screens/Logs/index.tsx", "r") as f:
    content = f.read()

old_effect = """  useEffect(() => {
    loadLogs();
    intervalRef.current = setInterval(() => loadLogs(true), 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadLogs]);"""

old_effect2 = """  useEffect(() => {
    loadLogs();
    intervalRef.current = setInterval(() => loadLogs(true), 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); 
};                                                                                }, [loadLogs]);"""

new_effect = """  useEffect(() => {
    loadLogs();
    intervalRef.current = setInterval(() => loadLogs(true), 15000); // Polling reduced for logs
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadLogs]);"""

content = re.sub(r"  useEffect\(\(\) => \{[\s\S]*?\}, \[loadLogs\]\);", new_effect, content)

with open("mobile/src/screens/Logs/index.tsx", "w") as f:
    f.write(content)

print("Patch applied for Logs")
