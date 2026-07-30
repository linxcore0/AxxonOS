export default function AnalyticsPanel({ stats, loading }) {
  if (loading) {
    return (
      <div style={{
        marginTop: 16, padding: "20px 0", textAlign: "center",
        fontSize: 11, color: "#475569", fontFamily: "system-ui", letterSpacing: ".05em",
      }}>
        Loading analytics…
      </div>
    );
  }
  if (!stats) return null;

  const {
    total_messages, fallback_count, fallback_rate,
    messages_today, messages_this_week,
    top_questions, daily_chart,
  } = stats;

  // Build 7-day chart (fill missing days with 0)
  const today = new Date();
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const found = (daily_chart || []).find(r => {
      const rk = typeof r.day === "string" ? r.day.slice(0, 10) : new Date(r.day).toISOString().slice(0, 10);
      return rk === key;
    });
    return { label: d.toLocaleDateString("en", { weekday: "short" }), count: found ? found.count : 0 };
  });
  const maxCount = Math.max(...days7.map(d => d.count), 1);

  const statChip = (label, value, color = "#94a3b8") => (
    <div style={{
      flex: 1, minWidth: 80,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10, padding: "12px 10px", textAlign: "center",
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'Orbitron', monospace", marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, color: "#475569", letterSpacing: ".18em" }}>{label}</div>
    </div>
  );

  return (
    <div style={{
      marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
      paddingTop: 16,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#6366f1", letterSpacing: ".2em", marginBottom: 14 }}>
        📊 BOT ANALYTICS
      </div>

      {/* Stat chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {statChip("TOTAL CHATS", total_messages.toLocaleString(), "#fff")}
        {statChip("TODAY", messages_today.toLocaleString(), "#38bdf8")}
        {statChip("THIS WEEK", messages_this_week.toLocaleString(), "#a5b4fc")}
        {statChip(
          "FALLBACK RATE",
          `${fallback_rate}%`,
          fallback_rate > 40 ? "#f87171" : fallback_rate > 20 ? "#fbbf24" : "#4ade80"
        )}
      </div>

      {/* 7-day bar chart */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 8, color: "#475569", letterSpacing: ".18em", marginBottom: 10 }}>
          MESSAGES — LAST 7 DAYS
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 60 }}>
          {days7.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 7, color: "#475569" }}>{d.count > 0 ? d.count : ""}</div>
              <div
                title={`${d.label}: ${d.count} messages`}
                style={{
                  width: "100%",
                  height: `${Math.max((d.count / maxCount) * 44, d.count > 0 ? 4 : 2)}px`,
                  background: d.count > 0
                    ? "linear-gradient(180deg, #6366f1, #3b82f6)"
                    : "rgba(255,255,255,0.05)",
                  borderRadius: 4,
                  transition: "height .3s",
                }}
              />
              <div style={{ fontSize: 7, color: "#334155", letterSpacing: ".05em" }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top questions */}
      {top_questions && top_questions.length > 0 && (
        <div>
          <div style={{ fontSize: 8, color: "#475569", letterSpacing: ".18em", marginBottom: 10 }}>
            TOP MATCHED QUESTIONS
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {top_questions.map((q, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(99,102,241,0.06)", borderRadius: 8, padding: "8px 12px",
              }}>
                <div style={{ fontSize: 9, color: "#6366f1", fontWeight: 700, fontFamily: "'Orbitron', monospace", minWidth: 16 }}>
                  #{i + 1}
                </div>
                <div style={{ flex: 1, fontSize: 11, color: "#94a3b8", fontFamily: "system-ui", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.question}
                </div>
                <div style={{
                  fontSize: 9, color: "#a5b4fc", fontWeight: 700,
                  background: "rgba(99,102,241,0.15)", borderRadius: 6, padding: "2px 8px",
                  whiteSpace: "nowrap",
                }}>
                  {q.count}×
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {total_messages === 0 && (
        <div style={{ textAlign: "center", fontSize: 11, color: "#334155", fontFamily: "system-ui", padding: "8px 0" }}>
          No chats yet — share your bot link to start collecting data.
        </div>
      )}
    </div>
  );
}
