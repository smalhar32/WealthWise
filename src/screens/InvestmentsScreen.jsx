import React, { useState, useRef } from "react";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";

export function InvestmentsScreen({ p, s, toast, inv, setInv, addExpense }) {
  const submittingRef = useRef(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Mutual Fund");
  const [newShares, setNewShares] = useState("");
  const [newBuyPrice, setNewBuyPrice] = useState("");
  const [newCurrentPrice, setNewCurrentPrice] = useState("");
  const types = ["Mutual Fund", "Stocks", "Gold", "Crypto", "FD", "Real Estate"];
  const typeColors = { "Mutual Fund": p.accent, Stocks: p.accentBlue, Gold: p.accentGold, Crypto: "#F7931A", FD: p.accentPink, "Real Estate": p.accentWarm };

  const [selectedInvIdx, setSelectedInvIdx] = useState(null);
  const [editInvName, setEditInvName] = useState("");
  const [editInvType, setEditInvType] = useState("Mutual Fund");
  const [editInvShares, setEditInvShares] = useState("");
  const [editInvBuyPrice, setEditInvBuyPrice] = useState("");
  const [editInvCurrentPrice, setEditInvCurrentPrice] = useState("");
  const [invTxnAmt, setInvTxnAmt] = useState("");

  const totalInvested = inv.reduce((a, i) => a + i.invested, 0);
  const totalCurrent = inv.reduce((a, i) => a + i.current, 0);
  const gain = totalCurrent - totalInvested;

  const addInv = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    if (!newName.trim() || !newShares || isNaN(newShares) || parseFloat(newShares) <= 0 || !newBuyPrice || isNaN(newBuyPrice) || parseFloat(newBuyPrice) < 0 || !newCurrentPrice || isNaN(newCurrentPrice) || parseFloat(newCurrentPrice) < 0) {
      toast("Please enter valid positive values! ⚠️");
      return;
    }
    const shares = parseFloat(newShares);
    const buyPrice = parseFloat(newBuyPrice);
    const currentPrice = parseFloat(newCurrentPrice);
    
    if (shares > 1000000000 || buyPrice > 1000000000 || currentPrice > 1000000000) {
      toast("Value exceeds maximum limit! ⚠️");
      return;
    }

    const invested = Math.round(shares * buyPrice);
    const current = Math.round(shares * currentPrice);

    setInv(prev => [...prev, {
      name: newName.trim(),
      type: newType,
      shares,
      buyPrice,
      currentPrice,
      invested,
      current,
      color: typeColors[newType] || p.accent
    }]);

    setShowAdd(false);
    setNewName("");
    setNewShares("");
    setNewBuyPrice("");
    setNewCurrentPrice("");
    toast("Investment added! 📈");
  };

  const openEditInv = (idx) => {
    const item = inv[idx];
    setSelectedInvIdx(idx);
    setEditInvName(item.name);
    setEditInvType(item.type || "Mutual Fund");
    
    // Fallbacks for legacy investments
    const shares = typeof item.shares === 'number' && item.shares > 0 ? item.shares : 1;
    const buyPrice = typeof item.buyPrice === 'number' ? item.buyPrice : item.invested;
    const currentPrice = typeof item.currentPrice === 'number' ? item.currentPrice : (item.current !== undefined ? item.current : buyPrice);

    setEditInvShares(shares.toString());
    setEditInvBuyPrice(buyPrice.toString());
    setEditInvCurrentPrice(currentPrice.toString());
    setInvTxnAmt("");
  };

  const saveEditInv = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    if (!editInvName.trim()) {
      toast("Please enter a name! ⚠️");
      return;
    }
    if (!editInvShares || isNaN(editInvShares) || parseFloat(editInvShares) <= 0) {
      toast("Please enter valid positive quantity/shares! ⚠️");
      return;
    }
    if (!editInvBuyPrice || isNaN(editInvBuyPrice) || parseFloat(editInvBuyPrice) < 0) {
      toast("Please enter a valid buy price! ⚠️");
      return;
    }
    if (!editInvCurrentPrice || isNaN(editInvCurrentPrice) || parseFloat(editInvCurrentPrice) < 0) {
      toast("Please enter a valid current price! ⚠️");
      return;
    }

    const shares = parseFloat(editInvShares);
    const buyPrice = parseFloat(editInvBuyPrice);
    const currentPrice = parseFloat(editInvCurrentPrice);
    
    if (shares > 1000000000 || buyPrice > 1000000000 || currentPrice > 1000000000) {
      toast("Value exceeds maximum limit! ⚠️");
      return;
    }

    const invested = Math.round(shares * buyPrice);
    const current = Math.round(shares * currentPrice);

    const idx = selectedInvIdx;

    setInv(prev => prev.map((item, i) => i === idx ? {
      ...item,
      name: editInvName.trim(),
      type: editInvType,
      shares,
      buyPrice,
      currentPrice,
      invested,
      current,
      color: typeColors[editInvType] || p.accent
    } : item));

    setSelectedInvIdx(null);
    toast("Investment updated! ✨");
  };

  const deleteInv = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const idx = selectedInvIdx;
    setInv(prev => prev.filter((_, i) => i !== idx));
    setSelectedInvIdx(null);
    toast("Investment deleted! 🗑️");
  };

  const buyInvestment = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const idx = selectedInvIdx;
    if (idx === null) return;
    if (!invTxnAmt || isNaN(invTxnAmt) || parseFloat(invTxnAmt) <= 0) {
      toast("Please enter a valid amount! ⚠️");
      return;
    }
    const amt = parseFloat(invTxnAmt);
    if (amt > 1000000000) {
      toast("Amount exceeds maximum limit! ⚠️");
      return;
    }
    const item = inv[idx];

    // Fallbacks for legacy
    const shares = typeof item.shares === 'number' && item.shares > 0 ? item.shares : 1;
    const buyPrice = typeof item.buyPrice === 'number' ? item.buyPrice : item.invested;
    const currentPrice = typeof item.currentPrice === 'number' ? item.currentPrice : (item.current !== undefined ? item.current : buyPrice);

    // Math: buy more
    const actualCurrentPrice = currentPrice > 0 ? currentPrice : (buyPrice > 0 ? buyPrice : 1);
    const unitsBought = amt / actualCurrentPrice;
    const newShares = shares + unitsBought;
    const newInvested = Math.round((item.invested || 0) + amt);
    const newBuyPrice = newShares > 0 ? (newInvested / newShares) : buyPrice;
    const newCurrent = Math.round((item.current || 0) + amt);

    setInv(prev => prev.map((it, i) => i === idx ? {
      ...it,
      shares: newShares,
      buyPrice: newBuyPrice,
      currentPrice: currentPrice,
      invested: newInvested,
      current: newCurrent
    } : it));

    setSelectedInvIdx(null);
    setInvTxnAmt("");
    toast(`Invested ₹${amt.toLocaleString()} more into ${item.name}! 📈`);
  };

  const sellInvestment = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const idx = selectedInvIdx;
    if (idx === null) return;
    if (!invTxnAmt || isNaN(invTxnAmt) || parseFloat(invTxnAmt) <= 0) {
      toast("Please enter a valid amount! ⚠️");
      return;
    }
    const amt = parseFloat(invTxnAmt);
    const item = inv[idx];

    const currentVal = item.current !== undefined ? item.current : item.invested;
    if (amt > currentVal) {
      toast(`Amount cannot exceed current value of ₹${currentVal.toLocaleString()}! ⚠️`);
      return;
    }

    // Fallbacks for legacy
    const shares = typeof item.shares === 'number' && item.shares > 0 ? item.shares : 1;
    const buyPrice = typeof item.buyPrice === 'number' ? item.buyPrice : item.invested;
    const currentPrice = typeof item.currentPrice === 'number' ? item.currentPrice : (item.current !== undefined ? item.current : buyPrice);

    // Math: sell some
    const unitsSold = currentVal > 0 ? (amt / currentVal) * shares : 0;
    const newShares = Math.max(0, shares - unitsSold);
    const newInvested = Math.round(newShares * buyPrice);
    const newCurrent = Math.max(0, currentVal - amt);

    setInv(prev => prev.map((it, i) => i === idx ? {
      ...it,
      shares: newShares,
      buyPrice: buyPrice,
      currentPrice: currentPrice,
      invested: newInvested,
      current: newCurrent
    } : it));

    setSelectedInvIdx(null);
    setInvTxnAmt("");
    toast(`Sold ₹${amt.toLocaleString()} of ${item.name}! 💸`);
  };

  return (
    <div>
      <div style={s.label}>Portfolio</div>
      <div style={s.heroCard(p.heroBlue, p.accentBlue + "40")}>
        <div style={s.muted}>Current Value</div>
        <div style={{ ...s.big, color: p.accentBlue }}>₹{totalCurrent.toLocaleString()}</div>
        <div style={s.row}>
          <div style={s.muted}>Invested: ₹{totalInvested.toLocaleString()}</div>
          <div style={s.tag(gain > 0 ? p.accent : p.accentWarm)}>{gain > 0 ? "+" : ""}₹{gain.toLocaleString()} ({totalInvested > 0 ? ((gain / totalInvested) * 100).toFixed(1) : 0}%)</div>
        </div>
      </div>
      <div style={s.card}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: p.text, marginBottom: "10px" }}>Asset Allocation</div>
        <div style={{ display: "flex", height: "10px", borderRadius: "99px", overflow: "hidden", gap: "2px", marginBottom: "10px" }}>
          {inv.map((i, idx) => <div key={`${i.name}-${idx}`} style={{ flex: i.current || 0, background: i.color || p.accent }} />)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {inv.map((i, idx) => (
            <div key={`${i.name}-${idx}`} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={s.dot(i.color || p.accent)} />
              <div style={{ fontSize: "11px", color: p.textMuted }}>{i.type || "Mutual Fund"} {totalCurrent > 0 ? Math.round(((i.current || 0) / totalCurrent) * 100) : 0}%</div>
            </div>
          ))}
        </div>
      </div>
      <div style={s.label}>Holdings</div>
      {inv.length === 0 ? (
        <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px" }}>No investments added yet. Start tracking your holdings! 📈</div>
      ) : (
        inv.map((item, idx) => {
          const shares = typeof item.shares === 'number' ? item.shares : 1;
          const buyPrice = typeof item.buyPrice === 'number' ? item.buyPrice : item.invested;
          const currentPrice = typeof item.currentPrice === 'number' ? item.currentPrice : (item.current !== undefined ? item.current : buyPrice);
          const g = item.current - item.invested;
          const gp = buyPrice > 0 ? (((currentPrice - buyPrice) / buyPrice) * 100).toFixed(1) : "0.0";
          return (
            <div key={item.name + idx} onClick={() => openEditInv(idx)} style={{ ...s.cardAlt, cursor: "pointer" }}>
              <div style={s.row}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={s.dot(item.color)} />
                  <div>
                    <div style={s.small}>{item.name}</div>
                    <div style={s.muted}>{item.type} · Shares: {shares} | Avg Price: ₹{buyPrice.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: p.text }}>₹{item.current.toLocaleString()}</div>
                  <div style={{ fontSize: "11px", color: p.textMuted, marginTop: "1px" }}>Invested: ₹{item.invested.toLocaleString()}</div>
                  <div style={{ fontSize: "11px", color: g > 0 ? p.accent : (g < 0 ? p.accentWarm : p.textMuted), marginTop: "1px" }}>{g > 0 ? "+" : ""}{gp}% (₹{Math.abs(g).toLocaleString()})</div>
                </div>
              </div>
            </div>
          );
        })
      )}
      <button style={s.addBtn(p.accent)} onClick={() => setShowAdd(true)}>+ Add Investment</button>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Investment" p={p}>
        <Input label="Name" value={newName} onChange={setNewName} placeholder="e.g. Apple Inc, HDFC Mid Cap" p={p} />
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {types.map(t => <button key={t} onClick={() => setNewType(t)} style={{ background: newType === t ? p.accent : p.cardAlt, color: newType === t ? "#fff" : p.textMuted, border: `1px solid ${newType === t ? p.accent : p.border}`, borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>)}
          </div>
        </div>
        <Input label="Quantity / Shares" value={newShares} onChange={setNewShares} type="number" placeholder="e.g. 10" p={p} />
        <Input label="Average Buy Price (₹)" value={newBuyPrice} onChange={setNewBuyPrice} type="number" placeholder="e.g. 150" p={p} />
        <Input label="Current Market Price (₹)" value={newCurrentPrice} onChange={setNewCurrentPrice} type="number" placeholder="e.g. 180" p={p} />
        <div style={{ fontSize: "11px", color: p.textMuted, marginBottom: "12px", marginTop: "-8px" }}>
          {parseFloat(newShares) > 0 && parseFloat(newBuyPrice) >= 0 && parseFloat(newCurrentPrice) >= 0 ? (
            `Initial Cost: ₹${Math.round(parseFloat(newShares) * parseFloat(newBuyPrice)).toLocaleString()} · Current Valuation: ₹${Math.round(parseFloat(newShares) * parseFloat(newCurrentPrice)).toLocaleString()} (${parseFloat(newCurrentPrice) >= parseFloat(newBuyPrice) ? "+" : ""}${(parseFloat(newBuyPrice) > 0 ? ((parseFloat(newCurrentPrice) - parseFloat(newBuyPrice)) / parseFloat(newBuyPrice) * 100).toFixed(1) : "0.0")}%)`
          ) : "Enter Quantity, Buy Price, and Current Price to preview metrics"}
        </div>
        <button style={s.addBtn(p.accent)} onClick={addInv}>Add Investment</button>
      </Modal>
      <Modal open={selectedInvIdx !== null} onClose={() => setSelectedInvIdx(null)} title="Edit Investment" p={p}>
        <Input label="Name" value={editInvName} onChange={setEditInvName} placeholder="e.g. Apple Inc, HDFC Mid Cap" p={p} />
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {types.map(t => <button key={t} onClick={() => setEditInvType(t)} style={{ background: editInvType === t ? p.accent : p.cardAlt, color: editInvType === t ? "#fff" : p.textMuted, border: `1px solid ${editInvType === t ? p.accent : p.border}`, borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>)}
          </div>
        </div>
        <Input label="Quantity / Shares" value={editInvShares} onChange={setEditInvShares} type="number" placeholder="e.g. 10" p={p} />
        <Input label="Average Buy Price (₹)" value={editInvBuyPrice} onChange={setEditInvBuyPrice} type="number" placeholder="e.g. 150" p={p} />
        <Input label="Current Market Price (₹)" value={editInvCurrentPrice} onChange={setEditInvCurrentPrice} type="number" placeholder="e.g. 180" p={p} />
        <div style={{ fontSize: "11px", color: p.textMuted, marginBottom: "12px", marginTop: "-8px" }}>
          {parseFloat(editInvShares) > 0 && parseFloat(editInvBuyPrice) >= 0 && parseFloat(editInvCurrentPrice) >= 0 ? (
            `Calculated Cost: ₹${Math.round(parseFloat(editInvShares) * parseFloat(editInvBuyPrice)).toLocaleString()} · Calculated Valuation: ₹${Math.round(parseFloat(editInvShares) * parseFloat(editInvCurrentPrice)).toLocaleString()} (${parseFloat(editInvCurrentPrice) >= parseFloat(editInvBuyPrice) ? "+" : ""}${(parseFloat(editInvBuyPrice) > 0 ? ((parseFloat(editInvCurrentPrice) - parseFloat(editInvBuyPrice)) / parseFloat(editInvBuyPrice) * 100).toFixed(1) : "0.0")}%)`
          ) : "Enter valid details to calculate metrics"}
        </div>

        {/* Record Transaction section */}
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
          <div style={{ fontSize: "11px", fontWeight: 700, color: p.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Transaction: Buy / Sell</div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="number"
              placeholder="Amount (₹)"
              value={invTxnAmt}
              onChange={e => setInvTxnAmt(e.target.value)}
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
                background: p.accent,
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "9px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              onClick={buyInvestment}
            >
              Buy
            </button>
            <button
              type="button"
              style={{
                background: p.accentWarm,
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "9px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
              onClick={sellInvestment}
            >
              Sell
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button style={s.addBtn(p.accentWarm)} onClick={deleteInv}>Delete</button>
          <button style={s.addBtn(p.accent)} onClick={saveEditInv}>Save Changes</button>
        </div>
      </Modal>
    </div>
  );
}

export default InvestmentsScreen;
