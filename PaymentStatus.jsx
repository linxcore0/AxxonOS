import { useState, useEffect } from "react";
import { C, Card3D, Badge, Btn } from "./theme.jsx";

const API = "";

export default function PaymentStatus({ token }) {
  const [payments, setPayments] = useState([]);
  const [wallets, setWallets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/payments/my-payments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load payment history");
        return res.json();
      })
      .then(data => {
        setPayments(data.payments || []);
        setWallets(data.wallets || {});
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <Card3D style={{ padding: 24, borderRadius: 16, textAlign: "center", color: C.muted }}>
        Loading payment history...
      </Card3D>
    );
  }

  if (error) {
    return (
      <Card3D style={{ padding: 24, borderRadius: 16, color: C.pink }}>
        Error: {error}
      </Card3D>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card3D style={{
        background: "rgba(15,15,30,0.7)",
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: "24px 28px",
      }}>
        <h3 style={{
          fontFamily: "'Orbitron',monospace", fontSize: 16, fontWeight: 700,
          color: C.text, letterSpacing: "0.05em", marginBottom: 16
        }}>
          Payment History
        </h3>

        {payments.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13, fontFamily: "system-ui" }}>
            No payment records found.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {payments.map(p => {
              const statusColor = p.status === "completed" ? C.green : C.amber || C.indigo;
              return (
                <div key={p.id || p.order_id} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>
                        {(p.plan || "").toUpperCase()} Plan
                      </span>
                      <Badge color={statusColor}>{(p.status || "pending").toUpperCase()}</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: "system-ui" }}>
                      Order: {p.order_id} • {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>
                      ${p.amount_usd} {p.currency ? `(${p.currency})` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card3D>
    </div>
  );
}
