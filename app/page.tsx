"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [newValue, setNewValue] = useState("");

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/sheets");
    const data = await res.json();
    setRows(data.values || []);
    setLoading(false);
  }

  async function addRow() {
    if (!newValue.trim()) return;

    await fetch("/api/sheets", {
      method: "POST",
      body: JSON.stringify({
        values: [[newValue]],
      }),
    });

    setNewValue("");
    loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>Google Sheets + Next.js</h1>

      <div>
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Novo valor"
          style={{ marginRight: 10 }}
        />
        <button onClick={addRow}>Adicionar</button>
      </div>

      {loading && <p>Carregando...</p>}

      <ul>
        {rows.map((row, i) => (
          <li key={i}>{row.join(" - ")}</li>
        ))}
      </ul>
    </main>
  );
}
