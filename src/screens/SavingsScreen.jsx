import React, { useState, useRef } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Ic } from "../components/Ic";
import { Bar } from "../components/Bar";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { sortByDateDesc, formatTransactionTime, parseLocalDate } from "../utils/helpers";

export function SavingsScreen({ width, isMobile, isTablet, isDesktop, p, s, toast, pots, setPots, streak, setStreak, goals, setGoals, inv, monthlySalary, savingsHistory = [], logSavingsTransaction, setSavingsHistory }) {
  const submittingRef = useRef(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [initBankAmt, setInitBankAmt] = useState("");
  const [initCashAmt, setInitCashAmt] = useState("");
  const [bankName, setBankName] = useState("");
  const [isEmergencyClick, setIsEmergencyClick] = useState(false);

  // Edit Pot States
  const [selectedPotIdx, setSelectedPotIdx] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [opType, setOpType] = useState("deposit"); // "deposit" or "withdrawal"
  const [opTarget, setOpTarget] = useState("bank"); // "bank" or "cash"
  const [opAmount, setOpAmount] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const total = pots.reduce((a, pt) => a + pt.amount, 0);

  const exportSavingsHistory = async (format) => {
    if (savingsHistory.length === 0) {
      toast("No transactions to export! ⚠️");
      return;
    }
    let content = "";
    if (format.toLowerCase() === 'csv') {
      content = "Date,Type,Description,Amount\n";
      savingsHistory.forEach(item => {
        content += `"${parseLocalDate(item.date).toLocaleDateString()}","${item.type}","${item.desc.replace(/"/g, '""')}",${item.amount}\n`;
      });
    } else {
      content = "=========================================\n";
      content += "        WEALTHWISE SAVINGS HISTORY        \n";
      content += "=========================================\n";
      content += `Export Date: ${new Date().toLocaleDateString()}\n\n`;
      savingsHistory.forEach(item => {
        const sign = (item.type === "withdrawal" || item.type === "transfer") ? "−" : "+";
        content += `${parseLocalDate(item.date).toLocaleDateString()} | [${item.type.toUpperCase()}] ${item.desc} | ${sign}₹${item.amount.toLocaleString()}\n`;
      });
    }

    const fileName = `Savings_History_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "Savings History",
          text: "Here is your savings transaction history.",
          url: result.uri,
          dialogTitle: "Share Savings History",
        });
        toast("History shared successfully! 📄");
      } catch (err) {
        console.error(err);
        toast(`Failed to share: ${err.message || err} ⚠️`);
      }
    } else {
      const blob = new Blob([content], { type: format.toLowerCase() === 'csv' ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast(`History exported as ${format}! 📄`);
    }
  };

  const addPot = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    if (!name || !name.trim()) {
      toast("Please enter a valid pot name! ⚠️");
      return;
    }

    // Check if duplicate name already exists (case-insensitive trimmed)
    const nameExists = pots.some(pt => pt.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (nameExists) {
      toast("A saving pot with this name already exists! Please add money to it instead. ⚠️");
      return;
    }

    if (initBankAmt.toString().includes("-") || initCashAmt.toString().includes("-")) {
      toast("Initial amounts cannot be negative! ⚠️");
      return;
    }

    const bankVal = parseInt(initBankAmt) || 0;
    const cashVal = parseInt(initCashAmt) || 0;

    if (bankVal < 0 || cashVal < 0) {
      toast("Initial amounts cannot be negative! ⚠️");
      return;
    }

    if (bankVal > 1000000000 || cashVal > 1000000000) {
      toast("Initial amounts cannot exceed ₹1,000,000,000! ⚠️");
      return;
    }

    const totalAmt = bankVal + cashVal;

    let rateText = "";
    if (bankVal > 0 && cashVal > 0) {
      rateText = `Bank ${bankName ? `(${bankName})` : ""} · Cash`;
    } else if (bankVal > 0) {
      rateText = `Bank ${bankName ? `(${bankName})` : ""}`;
    } else if (cashVal > 0) {
      rateText = "Cash";
    } else {
      rateText = "Savings Account & Cash";
    }

    setPots(prev => [...prev, {
      name,
      bankAmount: bankVal,
      cashAmount: cashVal,
      amount: totalAmt,
      bankName: bankVal > 0 ? bankName : "",
      rate: rateText,
      color: [p.accent, p.accentBlue, p.accentGold, p.accentPink][prev.length % 4],
    }]);

    if (logSavingsTransaction && totalAmt > 0) {
      const isGoalPot = name.toLowerCase().trim() !== "emergency fund" && 
                        name.toLowerCase().trim() !== "emergency" && 
                        goals && goals.some(g => g.name.toLowerCase().trim() === name.toLowerCase().trim());
      const desc = isGoalPot ? `Goal Funding: ${name}` : `Pot Created: ${name}`;
      logSavingsTransaction("deposit", desc, totalAmt);
    }

    setShowAdd(false);
    setName("");
    setInitBankAmt("");
    setInitCashAmt("");
    setBankName("");
    setIsEmergencyClick(false);
    toast("Saving pot added! 🏦");
  };

  const openEditPot = (idx) => {
    const pot = pots[idx];
    setSelectedPotIdx(idx);
    setEditName(pot.name);
    setEditAmount(pot.amount.toString());
    setOpAmount("");
    setOpType("deposit");
    setOpTarget("bank");
    setEditBankName(pot.bankName || "");
    setShowConfirmDelete(false);
  };

  const handleSavePotOperation = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    if (!opAmount || isNaN(opAmount) || parseFloat(opAmount) <= 0 || opAmount.toString().includes("-")) {
      toast("Please enter a valid positive amount! ⚠️");
      return;
    }

    const value = parseFloat(opAmount);
    if (value > 1000000000) {
      toast("Amount cannot exceed ₹1,000,000,000! ⚠️");
      return;
    }
    const idx = selectedPotIdx;
    const currentPot = pots[idx];

    // If withdrawal, check if there is enough money in the selected target
    if (opType === "withdrawal") {
      if (opTarget === "bank" && value > currentPot.bankAmount) {
        toast("Insufficient funds in bank account for this pot! ⚠️");
        return;
      }
      if (opTarget === "cash" && value > currentPot.cashAmount) {
        toast("Insufficient funds in cash for this pot! ⚠️");
        return;
      }
    }

    // Calculate new bank and cash amounts
    let newBankAmt = currentPot.bankAmount || 0;
    let newCashAmt = currentPot.cashAmount || 0;

    if (opType === "deposit") {
      if (opTarget === "bank") {
        newBankAmt += value;
      } else {
        newCashAmt += value;
      }
    } else {
      if (opTarget === "bank") {
        newBankAmt -= value;
      } else {
        newCashAmt -= value;
      }
    }

    const newAmount = newBankAmt + newCashAmt;
    if (newAmount > 1000000000) {
      toast("Total pot balance cannot exceed ₹1,000,000,000! ⚠️");
      return;
    }

    // Choose rate display text
    let rateText = "";
    const bName = opTarget === "bank" ? editBankName : (currentPot.bankName || "");
    if (newBankAmt > 0 && newCashAmt > 0) {
      rateText = `Bank ${bName ? `(${bName})` : ""} · Cash`;
    } else if (newBankAmt > 0) {
      rateText = `Bank ${bName ? `(${bName})` : ""}`;
    } else if (newCashAmt > 0) {
      rateText = "Cash";
    } else {
      rateText = "Savings Account & Cash";
    }

    setPots(prev => prev.map((pt, i) => i === idx ? {
      ...pt,
      bankAmount: newBankAmt,
      cashAmount: newCashAmt,
      amount: newAmount,
      bankName: newBankAmt > 0 ? bName : "",
      rate: rateText
    } : pt));

    if (setGoals) {
      setGoals(prev => prev.map(g => {
        if (g.name.toLowerCase().trim() === currentPot.name.toLowerCase().trim()) {
          return { ...g, saved: newAmount };
        }
        return g;
      }));
    }

    if (logSavingsTransaction) {
      const isGoalPot = currentPot.name.toLowerCase().trim() !== "emergency fund" && 
                        currentPot.name.toLowerCase().trim() !== "emergency" && 
                        goals.some(g => g.name.toLowerCase().trim() === currentPot.name.toLowerCase().trim());
      const destText = opTarget === "bank" ? `Bank ${bName ? `(${bName})` : ""}` : "Cash";
      const desc = isGoalPot
        ? (opType === "deposit" ? `Goal Funding (${destText}): ${currentPot.name}` : `Goal Funding Withdrawal (${destText}): ${currentPot.name}`)
        : (opType === "deposit" ? `Added to ${currentPot.name} (${destText})` : `Withdrawn from ${currentPot.name} (${destText})`);
      logSavingsTransaction(
        opType,
        desc,
        value
      );
    }

    setSelectedPotIdx(null);
    setOpAmount("");
    toast(opType === "deposit" ? "Money added successfully! 💰" : "Money withdrawn successfully! 💸");
  };

  const deletePot = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const idx = selectedPotIdx;
    const oldPot = pots[idx];
    setPots(prev => prev.filter((_, i) => i !== idx));

    if (setGoals) {
      setGoals(prev => prev.filter(g => g.name.toLowerCase().trim() !== oldPot.name.toLowerCase().trim()));
    }

    if (logSavingsTransaction && oldPot.amount > 0) {
      logSavingsTransaction("withdrawal", `Deleted Pot: ${oldPot.name}`, oldPot.amount);
    }

    setSelectedPotIdx(null);
    setShowConfirmDelete(false);
    toast("Saving pot deleted! 🗑️");
  };

  const targetFund = monthlySalary > 0 ? monthlySalary * 6 : 150000;
  const emergencyPots = pots.filter(pt => pt.name.toLowerCase().trim() === "emergency fund" || pt.name.toLowerCase().trim() === "emergency");
  const emergencySaved = emergencyPots.reduce((a, pt) => a + pt.amount, 0);
  const emergencyProgress = targetFund > 0 ? Math.min(100, Math.round((emergencySaved / targetFund) * 100)) : (emergencySaved > 0 ? 100 : 0);

  const showTwoColumns = width >= 768;

  const renderLeftColumn = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={s.heroCard(p.heroGreen, p.accent + "40")}>
        <div style={s.muted}>Total Saved</div>
        <div style={{ ...s.big, color: p.accent }}>₹{total.toLocaleString()}</div>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
          <div style={s.tag(p.accent)}>🔥 {streak > 0 ? `${streak} month streak` : "Start saving streak"}</div>
          {total > 0 && <div style={s.tag(p.accentBlue)}>+₹{total.toLocaleString()} saved</div>}
        </div>
      </div>

      {/* Streak badges */}
      <div style={{ ...s.card, marginBottom: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: p.text, marginBottom: "12px" }}>🏆 Achievements</div>
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { icon: "🔥", label: `${streak} Month\nStreak`, earned: streak > 0, color: p.accentWarm },
            { icon: "💰", label: "₹1L\nSaved", earned: total >= 100000, color: p.accentGold },
            { icon: "🎯", label: "First\nGoal", earned: goals.some(g => g.saved > 0), color: p.accent },
            { icon: "🚀", label: "Invest\nStart", earned: inv.length > 0, color: p.accentBlue },
            { icon: "🏠", label: "Home\nFund", earned: pots.some(pt => pt.name.toLowerCase().includes("home")), color: p.textMuted },
          ].map(b => (
            <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "58px", opacity: b.earned ? 1 : 0.4 }}>
              <div style={{ width: 44, height: 44, borderRadius: "14px", background: b.earned ? b.color + "20" : p.cardAlt, border: `2px solid ${b.earned ? b.color : p.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{b.icon}</div>
              <div style={{ fontSize: "9px", color: b.earned ? p.text : p.textMuted, textAlign: "center", whiteSpace: "pre", fontWeight: 600, lineHeight: 1.3 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: "14px", fontWeight: 700, color: p.text, marginBottom: "-4px" }}>Emergency Fund</div>
      <div
        onClick={() => {
          const idx = pots.findIndex(pt => pt.name.toLowerCase().trim() === "emergency fund" || pt.name.toLowerCase().trim() === "emergency");
          if (idx !== -1) {
            openEditPot(idx);
          } else {
            setIsEmergencyClick(true);
            setName("Emergency Fund");
            setShowAdd(true);
          }
        }}
        style={{ ...s.card, cursor: "pointer", marginBottom: 0 }}
      >
        <div style={s.row}>
          <div><div style={s.small}>Emergency Fund</div><div style={s.muted}>Target: 6 months expenses (₹{targetFund.toLocaleString()})</div></div>
          <div style={{ fontWeight: 700, color: p.accent }}>{emergencyProgress}%</div>
        </div>
        <Bar pct={emergencyProgress} color={p.accent} s={s} />
        <div style={{ ...s.muted, marginTop: "8px" }}>₹{emergencySaved.toLocaleString()} saved · ₹{Math.max(0, targetFund - emergencySaved).toLocaleString()} to go</div>
      </div>

      <div style={{ fontSize: "14px", fontWeight: 700, color: p.text, marginBottom: "-4px" }}>Saving Pots</div>
      {pots.length === 0 ? (
        <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px", marginBottom: 0 }}>
          No saving pots created yet. Add a pot to start saving! 🏦
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: width >= 900 ? "1fr 1fr" : "1fr",
          gap: "10px"
        }}>
          {pots.map((pt, i) => (
            <div key={`${pt.name}-${i}`} onClick={() => openEditPot(i)} style={{ ...s.cardAlt, ...s.row, cursor: "pointer", marginBottom: 0 }}>
              <div><div style={s.small}>{pt.name}</div><div style={s.muted}>{pt.rate}</div></div>
              <div style={{ fontWeight: 700, color: pt.color }}>₹{pt.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...s.cardAlt, border: `1px solid ${p.accent}30`, marginBottom: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: p.accent }}>💡 Pay Yourself First</div>
        <div style={{ ...s.muted, marginTop: "4px" }}>
          {monthlySalary > 0
            ? `Based on your 50/30/20 rule, your target is to save ₹${Math.round(monthlySalary * 0.2).toLocaleString()} (20% of income) this month. Keep it up!`
            : "Set a monthly salary in your profile to see your recommended 20% savings target!"}
        </div>
      </div>

      <button style={{ ...s.addBtn(p.accent), marginTop: 0 }} onClick={() => {
        setIsEmergencyClick(false);
        setName("");
        setShowAdd(true);
      }}>+ Add Saving Pot</button>
    </div>
  );

  const renderRightColumn = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={{ ...s.card, padding: "16px 20px", marginBottom: 0 }}>
        <div style={{ ...s.row, borderBottom: `1px solid ${p.border}`, paddingBottom: "10px", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: p.text }}>Savings Passbook</div>
            <div style={s.muted}>{savingsHistory.length} records</div>
          </div>
          {savingsHistory.length > 0 && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: p.textMuted, fontWeight: 600 }}>Export:</span>
              {["TXT", "CSV"].map(fmt => (
                <button key={fmt} onClick={() => exportSavingsHistory(fmt)} style={{ background: p.accentBlue + "12", color: p.accentBlue, border: `1px solid ${p.accentBlue}25`, borderRadius: "6px", padding: "4px 8px", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{fmt}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
          {savingsHistory.length === 0 ? (
            <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px 0" }}>
              No saving transactions recorded yet. 🏦
            </div>
          ) : (
            sortByDateDesc(savingsHistory).slice(0, 8).map((item, idx) => {
              const isWithdrawal = item.type === "withdrawal";
              const isTransfer = item.type === "transfer";

              let typeColor = p.accent;
              let typeSign = "+";
              let typeIcon = "📥";

              if (isWithdrawal) {
                typeColor = p.accentWarm;
                typeSign = "−";
                typeIcon = "📤";
              } else if (isTransfer) {
                typeColor = p.accentWarm;
                typeSign = "−";
                typeIcon = "🔄";
              }

              return (
                <div key={item.id || idx} style={{ ...s.row, padding: "11px 0", borderBottom: idx === Math.min(savingsHistory.length, 8) - 1 ? "none" : `1px solid ${p.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: typeColor + "15",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px"
                    }}>
                      {typeIcon}
                    </div>
                    <div>
                      <div style={{ ...s.small, fontWeight: 600 }}>{item.desc}</div>
                      <div style={{ ...s.muted, fontSize: "10px", marginTop: "2px" }}>{formatTransactionTime(item)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontWeight: 700, color: typeColor, whiteSpace: "nowrap" }}>
                      {typeSign}₹{item.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {savingsHistory.length > 0 && (
          <button
            onClick={() => setShowAllHistory(true)}
            style={{
              ...s.addBtn(p.accentBlue),
              marginTop: "12px",
              background: "none",
              color: p.accentBlue,
              border: `1px solid ${p.accentBlue}40`
            }}
          >
            View All Transactions
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={s.label}>Your Savings</div>
      {showTwoColumns ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "24px", alignItems: "start", width: "100%" }}>
          {renderLeftColumn()}
          {renderRightColumn()}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {renderLeftColumn()}
          {renderRightColumn()}
        </div>
      )}

      <Modal
        open={showAllHistory}
        onClose={() => { setShowAllHistory(false); setSearchQuery(""); }}
        title="Savings Passbook History"
        p={p}
      >
        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by description or amount..."
            style={{
              width: "100%",
              background: p.cardAlt,
              border: `1px solid ${p.border}`,
              borderRadius: "12px",
              padding: "10px 36px 10px 14px",
              color: p.text,
              fontSize: "13px",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.2s"
            }}
            onFocus={e => { e.target.style.borderColor = p.accent; e.target.style.boxShadow = `0 0 0 3px ${p.accent}20`; }}
            onBlur={e => { e.target.style.borderColor = p.border; e.target.style.boxShadow = "none"; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}
            >
              <Ic n="close" size={14} color={p.textMuted} />
            </button>
          )}
        </div>
        <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
          {(() => {
            const q = searchQuery.toLowerCase().trim();
            const filtered = q
              ? savingsHistory.filter(item => (
                  (item.desc || "").toLowerCase().includes(q) ||
                  Math.abs(item.amount).toString().includes(q)
                ))
              : savingsHistory;
            if (filtered.length === 0) {
              return (
                <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px" }}>
                  {q ? `No transactions matching "${searchQuery}"` : "No transactions logged yet."}
                </div>
              );
            }
            return sortByDateDesc(filtered).map((item, idx) => {
              const isWithdrawal = item.type === "withdrawal";
              const isTransfer = item.type === "transfer";

              let typeColor = p.accent;
              let typeSign = "+";
              let typeIcon = "📥";

              if (isWithdrawal) {
                typeColor = p.accentWarm;
                typeSign = "−";
                typeIcon = "📤";
              } else if (isTransfer) {
                typeColor = p.accentWarm;
                typeSign = "−";
                typeIcon = "🔄";
              }

              return (
                <div key={item.id || idx} style={{ ...s.row, padding: "12px 0", borderBottom: idx === filtered.length - 1 ? "none" : `1px solid ${p.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: typeColor + "15",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px"
                    }}>
                      {typeIcon}
                    </div>
                    <div>
                      <div style={{ ...s.small, fontWeight: 600 }}>{item.desc}</div>
                      <div style={{ ...s.muted, fontSize: "10px", marginTop: "2px" }}>{formatTransactionTime(item)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontWeight: 700, color: typeColor, whiteSpace: "nowrap" }}>
                      {typeSign}₹{item.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </Modal>

      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setInitBankAmt("");
          setInitCashAmt("");
          setBankName("");
          setIsEmergencyClick(false);
          setName("");
        }}
        title={isEmergencyClick ? "Emergency Fund" : "New Saving Pot"}
        p={p}
      >
        <Input label="Name" value={name} onChange={setName} placeholder="e.g. Emergency Fund" p={p} />

        <Input label="Initial Savings Account (Bank) Amount (₹)" value={initBankAmt} onChange={setInitBankAmt} type="number" placeholder="e.g. 10000 (optional)" p={p} />
        
        {parseInt(initBankAmt) > 0 && (
          <Input label="Bank Name" value={bankName} onChange={setBankName} placeholder="e.g. HDFC, SBI" p={p} />
        )}

        <Input label="Initial Cash Amount (₹)" value={initCashAmt} onChange={setInitCashAmt} type="number" placeholder="e.g. 5000 (optional)" p={p} />

        <button style={s.addBtn(p.accent)} onClick={addPot}>Create Pot</button>
      </Modal>

      {/* Edit Saving Pot Modal */}
      <Modal
        open={selectedPotIdx !== null}
        onClose={() => { setSelectedPotIdx(null); setShowConfirmDelete(false); }}
        title={editName}
        p={p}
        headerAction={
          <button
            onClick={() => setShowConfirmDelete(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              borderRadius: "50%",
              transition: "background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = p.accentWarm + "15"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <Ic n="trash" size={18} color={p.accentWarm} />
          </button>
        }
      >
        {showConfirmDelete ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: p.text, marginBottom: "12px" }}>Delete this saving pot?</div>
            <div style={{ ...s.muted, marginBottom: "20px", lineHeight: "1.5" }}>
              Are you sure you want to delete <strong>{editName}</strong>? This will withdraw the remaining balance of <strong>₹{parseInt(editAmount).toLocaleString()}</strong>.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                style={{
                  background: p.cardAlt,
                  color: p.text,
                  border: `1px solid ${p.border}`,
                  borderRadius: "12px",
                  padding: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  background: p.accentWarm,
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
                onClick={deletePot}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ ...s.cardAlt, display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px", background: p.cardAlt }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={s.muted}>Total Balance</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: p.text }}>
                  ₹{((pots[selectedPotIdx]?.bankAmount || 0) + (pots[selectedPotIdx]?.cashAmount || 0)).toLocaleString()}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", borderTop: `1px solid ${p.border}`, paddingTop: "12px", marginTop: "4px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ ...s.muted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Bank Savings</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: p.accentBlue, marginTop: "2px" }}>
                    ₹{(pots[selectedPotIdx]?.bankAmount || 0).toLocaleString()}
                  </div>
                  <div style={{ ...s.muted, fontSize: "10px", marginTop: "2px" }}>
                    {pots[selectedPotIdx]?.bankName || "Savings A/c"}
                  </div>
                </div>
                <div style={{ textAlign: "center", borderLeft: `1px solid ${p.border}` }}>
                  <div style={{ ...s.muted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cash Savings</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: p.accentGold, marginTop: "2px" }}>
                    ₹{(pots[selectedPotIdx]?.cashAmount || 0).toLocaleString()}
                  </div>
                  <div style={{ ...s.muted, fontSize: "10px", marginTop: "2px" }}>
                    Cash
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Operation</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { id: "deposit", label: "Add Money" },
                  { id: "withdrawal", label: "Withdraw" }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOpType(item.id)}
                    style={{
                      background: opType === item.id ? (item.id === "deposit" ? p.accent : p.accentWarm) : p.cardAlt,
                      color: opType === item.id ? "#fff" : p.textMuted,
                      border: `1px solid ${opType === item.id ? (item.id === "deposit" ? p.accent : p.accentWarm) : p.border}`,
                      borderRadius: "12px",
                      padding: "12px 4px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s"
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Keep Money In / Withdraw From</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { id: "bank", label: "Savings Account" },
                  { id: "cash", label: "Cash" }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOpTarget(item.id)}
                    style={{
                      background: opTarget === item.id ? p.accent : p.cardAlt,
                      color: opTarget === item.id ? "#fff" : p.textMuted,
                      border: `1px solid ${opTarget === item.id ? p.accent : p.border}`,
                      borderRadius: "12px",
                      padding: "12px 4px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s"
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {opTarget === "bank" && (
              <Input
                label="Bank Name"
                value={editBankName}
                onChange={setEditBankName}
                placeholder="e.g. HDFC, SBI"
                p={p}
              />
            )}

            <Input
              label={`Amount to ${opType === "deposit" ? "Add" : "Withdraw"} (₹)`}
              value={opAmount}
              onChange={setOpAmount}
              type="number"
              placeholder="e.g. 5000"
              p={p}
            />

            <button
              style={s.addBtn(opType === "deposit" ? p.accent : p.accentWarm)}
              onClick={handleSavePotOperation}
            >
              {opType === "deposit" ? "Confirm Add Money" : "Confirm Withdrawal"}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
export default SavingsScreen;
