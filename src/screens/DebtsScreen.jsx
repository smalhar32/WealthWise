import React, { useState } from "react";
import { Bar } from "../components/Bar";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";

export function DebtsScreen({ p, s, toast, debts, setDebts, txns, monthlySalary, addExpense }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [emi, setEmi] = useState("");
  const [remaining, setRemaining] = useState("");
  const [total, setTotal] = useState("");
  const [months, setMonths] = useState("");

  // Edit Debt States
  const [selectedDebtIdx, setSelectedDebtIdx] = useState(null);
  const [editDebtName, setEditDebtName] = useState("");
  const [editDebtEmi, setEditDebtEmi] = useState("");
  const [editDebtRemaining, setEditDebtRemaining] = useState("");
  const [editDebtTotal, setEditDebtTotal] = useState("");
  const [editDebtMonths, setEditDebtMonths] = useState("");
  const [payAmt, setPayAmt] = useState("");

  const totalDebt = debts.reduce((a, d) => a + (d.remaining || 0), 0);
  const totalEmi = debts.reduce((a, d) => a + (d.emi || 0), 0);
  const earned = monthlySalary + txns.filter(t => t.amount > 0 && !t.name.toLowerCase().includes("salary") && t.cat !== "Income").reduce((a, b) => a + b.amount, 0);

  const addDebt = () => {
    if (!name || !name.trim()) {
      toast("Please enter a valid loan name! ⚠️");
      return;
    }
    if (
      !emi || isNaN(emi) || parseFloat(emi) <= 0 || emi.toString().includes("-") ||
      !total || isNaN(total) || parseFloat(total) <= 0 || total.toString().includes("-") ||
      !remaining || isNaN(remaining) || parseFloat(remaining) < 0 || remaining.toString().includes("-") ||
      !months || isNaN(months) || parseInt(months) < 0 || months.toString().includes("-")
    ) {
      toast("Please enter valid positive numbers! ⚠️");
      return;
    }

    const emiVal = parseFloat(emi);
    const totalVal = parseFloat(total);
    const remainingVal = parseFloat(remaining);
    const monthsVal = parseInt(months);

    if (emiVal > 1000000000 || totalVal > 1000000000 || remainingVal > 1000000000) {
      toast("Amounts cannot exceed ₹1,000,000,000! ⚠️");
      return;
    }
    if (remainingVal > totalVal) {
      toast("Remaining balance cannot exceed the total loan amount! ⚠️");
      return;
    }
    if (monthsVal > 1200) {
      toast("Months remaining cannot exceed 1,200 (100 years)! ⚠️");
      return;
    }

    setDebts(prev => [...prev, {
      name: name.trim(),
      emi: emiVal,
      remaining: remainingVal,
      total: totalVal,
      months: monthsVal,
      color: [p.accentWarm, p.accentPink, p.accentGold, p.accentBlue][prev.length % 4]
    }]);
    setShowAdd(false);
    setName(""); setEmi(""); setRemaining(""); setTotal(""); setMonths("");
    toast("Debt entry added! 🏦");
  };

  const openEditDebt = (idx) => {
    const d = debts[idx];
    setSelectedDebtIdx(idx);
    setEditDebtName(d.name);
    setEditDebtEmi(d.emi.toString());
    setEditDebtTotal(d.total.toString());
    setEditDebtRemaining(d.remaining.toString());
    setEditDebtMonths(d.months.toString());
    setPayAmt("");
  };

  const saveEditDebt = () => {
    if (!editDebtName.trim()) {
      toast("Loan name cannot be empty! ⚠️");
      return;
    }
    if (
      isNaN(editDebtEmi) || parseFloat(editDebtEmi) <= 0 || editDebtEmi.toString().includes("-") ||
      isNaN(editDebtTotal) || parseFloat(editDebtTotal) <= 0 || editDebtTotal.toString().includes("-") ||
      isNaN(editDebtRemaining) || parseFloat(editDebtRemaining) < 0 || editDebtRemaining.toString().includes("-") ||
      isNaN(editDebtMonths) || parseInt(editDebtMonths) < 0 || editDebtMonths.toString().includes("-")
    ) {
      toast("Please enter valid positive numbers! ⚠️");
      return;
    }

    const emiVal = parseFloat(editDebtEmi);
    const totalVal = parseFloat(editDebtTotal);
    const remainingVal = parseFloat(editDebtRemaining);
    const monthsVal = parseInt(editDebtMonths);

    if (emiVal > 1000000000 || totalVal > 1000000000 || remainingVal > 1000000000) {
      toast("Amounts cannot exceed ₹1,000,000,000! ⚠️");
      return;
    }
    if (remainingVal > totalVal) {
      toast("Remaining balance cannot exceed the total loan amount! ⚠️");
      return;
    }
    if (monthsVal > 1200) {
      toast("Months remaining cannot exceed 1,200 (100 years)! ⚠️");
      return;
    }

    const idx = selectedDebtIdx;
    setDebts(prev => prev.map((d, i) => i === idx ? {
      ...d,
      name: editDebtName.trim(),
      emi: emiVal,
      total: totalVal,
      remaining: remainingVal,
      months: monthsVal
    } : d));
    setSelectedDebtIdx(null);
    toast("Debt entry updated! ✨");
  };

  const deleteDebt = () => {
    const idx = selectedDebtIdx;
    setDebts(prev => prev.filter((_, i) => i !== idx));
    setSelectedDebtIdx(null);
    toast("Debt entry deleted! 🗑️");
  };

  const payEmi = () => {
    const idx = selectedDebtIdx;
    if (idx === null) return;
    const d = debts[idx];
    const emiVal = d.emi || 0;
    if (emiVal <= 0) {
      toast("Invalid EMI amount! ⚠️");
      return;
    }
    const newRemaining = Math.max(0, (d.remaining || 0) - emiVal);
    const newMonths = Math.max(0, (d.months || 0) - 1);

    setDebts(prev => prev.map((item, i) => i === idx ? {
      ...item,
      remaining: newRemaining,
      months: newMonths
    } : item));

    if (typeof addExpense === "function") {
      addExpense(emiVal, "EMI & Loans", `EMI Repayment: ${d.name}`, null, false, new Date().toISOString());
    }
    setSelectedDebtIdx(null);
    toast(`Paid EMI of ₹${emiVal.toLocaleString()}! 🏦`);
  };

  const payCustom = () => {
    const idx = selectedDebtIdx;
    if (idx === null) return;
    if (!payAmt || isNaN(payAmt) || parseFloat(payAmt) <= 0 || payAmt.toString().includes("-")) {
      toast("Please enter a valid positive payment amount! ⚠️");
      return;
    }
    const amt = parseFloat(payAmt);
    const d = debts[idx];
    if (amt > (d.remaining || 0)) {
      toast(`Amount cannot exceed remaining balance of ₹${(d.remaining || 0).toLocaleString()}! ⚠️`);
      return;
    }
    const newRemaining = Math.max(0, (d.remaining || 0) - amt);
    const emiVal = d.emi || 1;
    const newMonths = Math.ceil(newRemaining / emiVal);

    setDebts(prev => prev.map((item, i) => i === idx ? {
      ...item,
      remaining: newRemaining,
      months: newMonths
    } : item));

    if (typeof addExpense === "function") {
      addExpense(amt, "EMI & Loans", `Repayment: ${d.name}`, null, false, new Date().toISOString());
    }
    setSelectedDebtIdx(null);
    setPayAmt("");
    toast(`Paid ₹${amt.toLocaleString()} towards ${d.name}! 🏦`);
  };

  const emiPctOfIncome = earned > 0 ? Math.round((totalEmi / earned) * 100) : (totalEmi > 0 ? 100 : 0);

  return (
    <div>
      <div style={s.label}>Debt Overview</div>
      <div style={s.heroCard(p.heroRed, p.accentWarm + "40")}>
        <div style={s.muted}>Total Outstanding</div>
        <div style={{ ...s.big, color: p.accentWarm }}>₹{totalDebt >= 100000 ? `${(totalDebt / 100000).toFixed(2)}L` : totalDebt.toLocaleString()}</div>
        <div style={s.row}>
          <div style={s.muted}>Monthly EMIs: ₹{totalEmi.toLocaleString()}</div>
          <div style={s.tag(p.accentWarm)}>{emiPctOfIncome}% of income</div>
        </div>
      </div>
      {(() => {
        const creditCardDebt = debts.find(d => d.name.toLowerCase().includes("credit card") || d.name.toLowerCase().includes("card"));
        const highestEmiDebt = [...debts].sort((a, b) => (b.emi || 0) - (a.emi || 0))[0];
        const smallestDebt = [...debts].sort((a, b) => (a.remaining || 0) - (b.remaining || 0))[0];

        let debtTip = "";
        if (debts.length > 0) {
          if (creditCardDebt) {
            debtTip = `Focus on paying off your ${creditCardDebt.name} first (highest interest rate risk). Consider paying an extra ₹1,000/mo to clear it faster!`;
          } else if (highestEmiDebt) {
            debtTip = `Focus on paying off ${highestEmiDebt.name} to free up ₹${(highestEmiDebt.emi || 0).toLocaleString()}/mo in cash flow (Avalanche method).`;
          } else if (smallestDebt) {
            debtTip = `Focus on paying off ${smallestDebt.name} (₹${(smallestDebt.remaining || 0).toLocaleString()} remaining) first to build momentum (Snowball method).`;
          }
        }

        return debts.length > 0 ? (
          <div style={{ ...s.cardAlt, border: `1px solid ${p.accentGold}30` }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: p.accentGold }}>💡 Debt-Free Strategy</div>
            <div style={{ ...s.muted, marginTop: "4px" }}>{debtTip}</div>
          </div>
        ) : null;
      })()}

      <div style={s.label}>Your Loans</div>
      {debts.length === 0 ? (
        <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px" }}>
          You are debt-free! 🎉 Add a loan or EMI to manage repayments.
        </div>
      ) : (
        debts.map((d, idx) => {
          const total = d.total || 0;
          const remaining = d.remaining || 0;
          const emi = d.emi || 0;
          const months = d.months || 0;
          const color = d.color || p.accentWarm;
          const paidPct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
          return (
            <div key={`${d.name || 'loan'}-${idx}`} onClick={() => openEditDebt(idx)} style={{ ...s.card, cursor: "pointer" }}>
              <div style={s.row}>
                <div style={s.small}>{d.name || "Loan"}</div>
                <div style={s.tag(color)}>{paidPct}% paid</div>
              </div>
              <Bar pct={paidPct} color={color} s={s} />
              <div style={{ ...s.row, marginTop: "8px" }}>
                <div style={s.muted}>EMI: ₹{emi.toLocaleString()}/mo</div>
                <div style={s.muted}>{months} months left</div>
              </div>
              <div style={{ ...s.muted, marginTop: "4px" }}>Remaining: ₹{remaining.toLocaleString()}</div>
            </div>
          );
        })
      )}

      <button style={s.addBtn(p.accent)} onClick={() => setShowAdd(true)}>+ Add Debt / Loan</button>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Debt / Loan" p={p}>
        <Input label="Loan Name" value={name} onChange={setName} placeholder="e.g. Car Loan" p={p} />
        <Input label="Monthly EMI (₹)" value={emi} onChange={setEmi} type="number" placeholder="e.g. 8000" p={p} />
        <Input label="Total Loan Amount (₹)" value={total} onChange={setTotal} type="number" placeholder="e.g. 500000" p={p} />
        <Input label="Remaining Balance (₹)" value={remaining} onChange={setRemaining} type="number" placeholder="e.g. 350000" p={p} />
        <Input label="Months Remaining" value={months} onChange={setMonths} type="number" placeholder="e.g. 48" p={p} />
        <button style={s.addBtn(p.accent)} onClick={addDebt}>Create Loan Entry</button>
      </Modal>

      {/* Edit Debt / Loan Modal */}
      <Modal open={selectedDebtIdx !== null} onClose={() => setSelectedDebtIdx(null)} title="Edit Debt / Loan" p={p}>
        <Input label="Loan Name" value={editDebtName} onChange={setEditDebtName} placeholder="e.g. Car Loan" p={p} />
        <Input label="Monthly EMI (₹)" value={editDebtEmi} onChange={setEditDebtEmi} type="number" placeholder="e.g. 8000" p={p} />
        <Input label="Total Loan Amount (₹)" value={editDebtTotal} onChange={setEditDebtTotal} type="number" placeholder="e.g. 500000" p={p} />
        <Input label="Remaining Balance (₹)" value={editDebtRemaining} onChange={setEditDebtRemaining} type="number" placeholder="e.g. 350000" p={p} />
        <Input label="Months Remaining" value={editDebtMonths} onChange={setEditDebtMonths} type="number" placeholder="e.g. 48" p={p} />

        {/* Record Repayment section */}
        <div style={{
          background: p.cardAlt,
          border: `1px solid ${p.border}`,
          borderRadius: "14px",
          padding: "14px",
          marginBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: p.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Record Repayment</div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              style={{
                flex: 1,
                background: p.accent,
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              onClick={payEmi}
            >
              Pay EMI (₹{(parseFloat(editDebtEmi) || 0).toLocaleString()})
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="number"
              placeholder="Custom Payment Amount"
              value={payAmt}
              onChange={e => setPayAmt(e.target.value)}
              style={{
                flex: 1,
                background: p.bg,
                color: p.text,
                border: `1px solid ${p.border}`,
                borderRadius: "10px",
                padding: "9px 12px",
                fontSize: "12px",
                outline: "none",
                fontFamily: "inherit"
              }}
            />
            <button
              type="button"
              style={{
                background: p.accentBlue,
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "9px 16px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              onClick={payCustom}
            >
              Pay
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button style={s.addBtn(p.accentWarm)} onClick={deleteDebt}>Delete</button>
          <button style={s.addBtn(p.accent)} onClick={saveEditDebt}>Save Changes</button>
        </div>
      </Modal>
    </div>
  );
}

export default DebtsScreen;
