import React, { useState, useRef } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Ic } from "../components/Ic";
import { Bar } from "../components/Bar";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { sortByDateDesc, formatTransactionTime, parseLocalDate } from "../utils/helpers";

const GoalCard = ({ g, i, openEditGoal, p, s }) => {
  const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : (g.saved > 0 ? 100 : 0);
  const monthly = Math.round((g.target - g.saved) / 12);
  const done = pct >= 100;
  return (
    <div onClick={() => openEditGoal(i)} style={{ ...s.card, border: done ? `2px solid ${p.accent}` : `1px solid ${p.border}`, cursor: "pointer" }}>
      <div style={s.row}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>{g.emoji}</span>
          <div>
            <div style={{ ...s.small, display: "flex", alignItems: "center", gap: "6px" }}>
              {g.name} {done && <span style={s.tag(p.accent)}>✓ Done</span>}
            </div>
            <div style={s.muted}>By {g.deadline}</div>
          </div>
        </div>
        <div style={s.tag(done ? p.accent : g.color)}>{pct}%</div>
      </div>
      <Bar pct={pct} color={done ? p.accent : g.color} s={s} />
      <div style={{ ...s.row, marginTop: "8px" }}>
        <div style={s.muted}>₹{g.saved.toLocaleString()} / ₹{g.target.toLocaleString()}</div>
        {!done && <div style={s.muted}>₹{monthly.toLocaleString()}/mo needed</div>}
      </div>
    </div>
  );
};

export function GoalsScreen({ width, isMobile, isTablet, isDesktop, p, s, toast, confetti, goals, setGoals, pots, setPots, logSavingsTransaction, savingsHistory = [], setSavingsHistory }) {
  const submittingRef = useRef(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAllGoalsHistory, setShowAllGoalsHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gName, setGName] = useState("");
  const [gTarget, setGTarget] = useState("");
  const [gDeadline, setGDeadline] = useState("");
  const [gTerm, setGTerm] = useState("short");
  const [gEmoji, setGEmoji] = useState("⭐");

  // Goal Edit States
  const [selectedGoalIdx, setSelectedGoalIdx] = useState(null);
  const [editGoalName, setEditGoalName] = useState("");
  const [editGoalEmoji, setEditGoalEmoji] = useState("⭐");
  const [editGoalTarget, setEditGoalTarget] = useState("");
  const [editGoalSaved, setEditGoalSaved] = useState("");
  const [editGoalDeadline, setEditGoalDeadline] = useState("");
  const [editGoalTerm, setEditGoalTerm] = useState("short");

  const goalsHistory = savingsHistory.filter(item => 
    item.desc && 
    item.desc.includes("Goal Funding") && 
    !item.desc.toLowerCase().includes("emergency fund") &&
    !item.desc.toLowerCase().includes("emergency")
  );

  const exportGoalsHistory = async (format) => {
    if (goalsHistory.length === 0) {
      toast("No transactions to export! ⚠️");
      return;
    }
    let content = "";
    if (format.toLowerCase() === 'csv') {
      content = "Date,Type,Description,Amount\n";
      goalsHistory.forEach(item => {
        content += `"${parseLocalDate(item.date).toLocaleDateString()}","${item.type}","${item.desc.replace(/"/g, '""')}",${item.amount}\n`;
      });
    } else {
      content = "=========================================\n";
      content += "         WEALTHWISE GOAL HISTORY         \n";
      content += "=========================================\n";
      content += `Export Date: ${new Date().toLocaleDateString()}\n\n`;
      goalsHistory.forEach(item => {
        const isWithdrawal = item.type === "withdrawal" || item.desc.includes("Withdrawal");
        const sign = isWithdrawal ? "−" : "+";
        content += `${parseLocalDate(item.date).toLocaleDateString()} | [FUNDING] ${item.desc} | ${sign}₹${item.amount.toLocaleString()}\n`;
      });
    }

    const fileName = `Goals_History_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "Goal History",
          text: "Here is your goal funding transaction history.",
          url: result.uri,
          dialogTitle: "Share Goal History",
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

  const addGoal = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    if (!gName || !gName.trim()) {
      toast("Please enter a valid goal name! ⚠️");
      return;
    }
    if (!gTarget || isNaN(gTarget) || parseFloat(gTarget) <= 0 || gTarget.toString().includes("-")) {
      toast("Goal target must be a positive number! ⚠️");
      return;
    }
    const targetVal = parseFloat(gTarget);
    if (targetVal > 1000000000) {
      toast("Goal target cannot exceed ₹1,000,000,000! ⚠️");
      return;
    }

    // Check if duplicate name already exists (case-insensitive trimmed)
    const nameExists = goals.some(g => g.name.toLowerCase().trim() === gName.toLowerCase().trim()) || pots.some(pt => pt.name.toLowerCase().trim() === gName.toLowerCase().trim());
    if (nameExists) {
      toast("A goal or saving pot with this name already exists! ⚠️");
      return;
    }

    setGoals(g => [...g, { name: gName.trim(), emoji: gEmoji, target: Math.round(targetVal), saved: 0, deadline: gDeadline || "TBD", term: gTerm, color: p.accentBlue }]);
    setPots(prev => [...prev, {
      name: gName.trim(),
      bankAmount: 0,
      cashAmount: 0,
      amount: 0,
      bankName: "",
      rate: "Savings Account & Cash",
      color: p.accentBlue,
    }]);
    setShowAdd(false);
    setGName("");
    setGTarget("");
    setGDeadline("");
    setGEmoji("⭐");
    toast("Goal created! 🎯");
  };

  const openEditGoal = (globalIndex) => {
    const goal = goals[globalIndex];
    setSelectedGoalIdx(globalIndex);
    setEditGoalName(goal.name);
    setEditGoalEmoji(goal.emoji || "⭐");
    setEditGoalTarget(goal.target.toString());
    setEditGoalSaved(goal.saved.toString());
    setEditGoalDeadline(goal.deadline);
    setEditGoalTerm(goal.term || "short");
  };

  const saveEditGoal = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    if (!editGoalName.trim()) {
      toast("Goal name cannot be empty! ⚠️");
      return;
    }
    if (isNaN(editGoalTarget) || parseFloat(editGoalTarget) <= 0 || editGoalTarget.toString().includes("-")) {
      toast("Goal target must be a positive number! ⚠️");
      return;
    }
    const targetVal = parseFloat(editGoalTarget);
    if (targetVal > 1000000000) {
      toast("Goal target cannot exceed ₹1,000,000,000! ⚠️");
      return;
    }
    const idx = selectedGoalIdx;
    const oldGoal = goals[idx];
    if (oldGoal) {
      const newName = editGoalName.trim();
      setPots(prev => prev.map(pt => {
        if (pt.name.toLowerCase().trim() === oldGoal.name.toLowerCase().trim()) {
          return {
            ...pt,
            name: newName
          };
        }
        return pt;
      }));
    }
    setGoals(prev => prev.map((g, i) => i === idx ? {
      ...g,
      name: editGoalName.trim(),
      emoji: editGoalEmoji,
      target: Math.round(targetVal),
      saved: parseInt(editGoalSaved) || 0,
      deadline: editGoalDeadline.trim() || "TBD",
      term: editGoalTerm
    } : g));
    setSelectedGoalIdx(null);
    toast("Goal updated! ✨");
  };

  const deleteGoal = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const idx = selectedGoalIdx;
    const oldGoal = goals[idx];
    if (oldGoal) {
      const matchingPot = (pots || []).find(pt => pt.name.toLowerCase().trim() === oldGoal.name.toLowerCase().trim());
      if (matchingPot && matchingPot.amount > 0) {
        if (logSavingsTransaction) {
          logSavingsTransaction("withdrawal", `Deleted Pot (Linked to Goal): ${matchingPot.name}`, matchingPot.amount);
        }
      }
      setPots(prev => prev.filter(pt => pt.name.toLowerCase().trim() !== oldGoal.name.toLowerCase().trim()));
    }
    setGoals(prev => prev.filter((_, i) => i !== idx));
    setSelectedGoalIdx(null);
    toast("Goal deleted! 🗑️");
  };

  const renderGoalsLeft = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={{ ...s.label, margin: 0 }}>Short Term Goals</div>
      {goals.filter(g => g.term === "short").length === 0 ? (
        <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px", marginBottom: 0 }}>
          No short-term goals. Set a target! 🎯
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: width >= 1000 ? "1fr 1fr" : "1fr",
          gap: "10px"
        }}>
          {goals.filter(g => g.term === "short").map((g, i) => {
            const originalIndex = goals.findIndex(item => item === g);
            return <GoalCard key={`${g.name}-${originalIndex}`} g={g} i={originalIndex} openEditGoal={openEditGoal} p={p} s={s} />;
          })}
        </div>
      )}

      <div style={{ ...s.label, margin: "10px 0 0" }}>Long Term Goals</div>
      {goals.filter(g => g.term === "long").length === 0 ? (
        <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px", marginBottom: 0 }}>
          No long-term goals. Plan for the future! 🚀
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: width >= 1000 ? "1fr 1fr" : "1fr",
          gap: "10px"
        }}>
          {goals.filter(g => g.term === "long").map((g, i) => {
            const originalIndex = goals.findIndex(item => item === g);
            return <GoalCard key={`${g.name}-${originalIndex}`} g={g} i={originalIndex} openEditGoal={openEditGoal} p={p} s={s} />;
          })}
        </div>
      )}

      <button style={{ ...s.addBtn(p.accent), marginTop: "10px" }} onClick={() => setShowAdd(true)}>+ Add Goal</button>
    </div>
  );

  const renderGoalsRight = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {/* Goal Funding Passbook */}
      <div style={{ ...s.label, margin: 0 }}>Goal Funding Passbook</div>
      <div style={{ ...s.card, padding: "16px 20px", marginBottom: 0 }}>
        <div style={{ ...s.row, borderBottom: `1px solid ${p.border}`, paddingBottom: "10px", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: p.text }}>Funding History</div>
            <div style={s.muted}>{goalsHistory.length} records</div>
          </div>
          {goalsHistory.length > 0 && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: p.textMuted, fontWeight: 600 }}>Export:</span>
              {["TXT", "CSV"].map(fmt => (
                <button key={fmt} onClick={() => exportGoalsHistory(fmt)} style={{ background: p.accentBlue + "12", color: p.accentBlue, border: `1px solid ${p.accentBlue}25`, borderRadius: "6px", padding: "4px 8px", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{fmt}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
          {goalsHistory.length === 0 ? (
            <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px 0" }}>
              No funding transactions recorded yet. 🎯
            </div>
          ) : (
            sortByDateDesc(goalsHistory).slice(0, 4).map((item, idx) => {
              const isWithdrawal = item.type === "withdrawal" || item.desc.includes("Withdrawal");
              const typeColor = isWithdrawal ? p.accentWarm : p.accent;
              const typeSign = isWithdrawal ? "−" : "+";
              return (
                <div key={item.id || idx} style={{ ...s.row, padding: "11px 0", borderBottom: idx === Math.min(goalsHistory.length, 4) - 1 ? "none" : `1px solid ${p.border}` }}>
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
                      🎯
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
        {goalsHistory.length > 0 && (
          <button
            onClick={() => setShowAllGoalsHistory(true)}
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

  const showTwoColumns = width >= 768;

  return (
    <div>
      {showTwoColumns ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "24px", alignItems: "start", width: "100%" }}>
          {renderGoalsLeft()}
          {renderGoalsRight()}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {renderGoalsLeft()}
          {renderGoalsRight()}
        </div>
      )}

      {/* --- ADD GOAL MODAL --- */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Goal" p={p}>
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Pick Emoji</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "85px", overflowY: "auto", padding: "4px" }}>
            {["🍔", "🍕", "🍎", "📱", "💻", "📞", "🏍️", "🚗", "🚲", "✈️", "🏝️", "🧳", "💡", "🔌", "🧾", "🏠", "🔑", "🛍️", "🛒", "🎬", "🎮", "🍿", "🏋️", "🏃", "📚", "🎓", "💊", "🩺", "🐶", "🐱", "💰", "📈", "⭐", "🚀", "🎯", "💍", "🎁", "🔄"].map(e => (
              <button key={e} onClick={() => setGEmoji(e)} style={{ fontSize: "20px", background: gEmoji === e ? p.accent + "30" : p.cardAlt, border: `1px solid ${gEmoji === e ? p.accent : p.border}`, borderRadius: "10px", padding: "6px 10px", cursor: "pointer" }}>{e}</button>
            ))}
          </div>
        </div>
        <Input label="Goal Name" value={gName} onChange={setGName} placeholder="e.g. Europe Trip" p={p} />
        <Input label="Target Amount (₹)" value={gTarget} onChange={setGTarget} type="number" placeholder="e.g. 150000" p={p} />
        <Input label="Deadline" value={gDeadline} onChange={setGDeadline} placeholder="e.g. Dec 2027" p={p} />
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Term</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {["short", "long"].map(t => (
              <button key={t} onClick={() => { setGTerm(t); setGEmoji(t === "short" ? "⭐" : "🚀"); }} style={{ flex: 1, background: gTerm === t ? p.accent : p.cardAlt, color: gTerm === t ? "#fff" : p.textMuted, border: `1px solid ${gTerm === t ? p.accent : p.border}`, borderRadius: "12px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t === "short" ? "Short Term" : "Long Term"}
              </button>
            ))}
          </div>
        </div>
        <button style={s.addBtn(p.accent)} onClick={addGoal}>Create Goal</button>
      </Modal>

      {/* --- EDIT GOAL MODAL --- */}
      <Modal open={selectedGoalIdx !== null} onClose={() => setSelectedGoalIdx(null)} title="Edit Goal" p={p}>
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Pick Emoji</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "85px", overflowY: "auto", padding: "4px" }}>
            {["🍔", "🍕", "🍎", "📱", "💻", "📞", "🏍️", "🚗", "🚲", "✈️", "🏝️", "🧳", "💡", "🔌", "🧾", "🏠", "🔑", "🛍️", "🛒", "🎬", "🎮", "🍿", "🏋️", "🏃", "📚", "🎓", "💊", "🩺", "🐶", "🐱", "💰", "📈", "⭐", "🚀", "🎯", "💍", "🎁", "🔄"].map(e => (
              <button key={e} onClick={() => setEditGoalEmoji(e)} style={{ fontSize: "20px", background: editGoalEmoji === e ? p.accent + "30" : p.cardAlt, border: `1px solid ${editGoalEmoji === e ? p.accent : p.border}`, borderRadius: "10px", padding: "6px 10px", cursor: "pointer" }}>{e}</button>
            ))}
          </div>
        </div>
        <Input label="Goal Name" value={editGoalName} onChange={setEditGoalName} placeholder="e.g. Europe Trip" p={p} />
        <Input label="Target Amount (₹)" value={editGoalTarget} onChange={setEditGoalTarget} type="number" placeholder="e.g. 150000" p={p} />
        
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Amount Saved (₹)</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: p.text, background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", padding: "12px 14px", boxSizing: "border-box" }}>
            ₹{parseInt(editGoalSaved).toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: p.textMuted, marginTop: "4px" }}>
            Manage balance by adding/withdrawing money on the Savings tab.
          </div>
        </div>

        <Input label="Deadline" value={editGoalDeadline} onChange={setEditGoalDeadline} placeholder="e.g. Dec 2027" p={p} />

        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Term</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {["short", "long"].map(t => (
              <button key={t} onClick={() => setEditGoalTerm(t)} style={{ flex: 1, background: editGoalTerm === t ? p.accent : p.cardAlt, color: editGoalTerm === t ? "#fff" : p.textMuted, border: `1px solid ${editGoalTerm === t ? p.accent : p.border}`, borderRadius: "12px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t === "short" ? "Short Term" : "Long Term"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button style={s.addBtn(p.accentWarm)} onClick={deleteGoal}>Delete</button>
          <button style={s.addBtn(p.accent)} onClick={saveEditGoal}>Save Changes</button>
        </div>
      </Modal>

      <Modal open={showAllGoalsHistory} onClose={() => { setShowAllGoalsHistory(false); setSearchQuery(""); }} title="Goals Passbook History" p={p}>
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
              ? goalsHistory.filter(item => (
                  (item.desc || "").toLowerCase().includes(q) ||
                  Math.abs(item.amount).toString().includes(q)
                ))
              : goalsHistory;
            if (filtered.length === 0) {
              return (
                <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px" }}>
                  {q ? `No transactions matching "${searchQuery}"` : "No transactions logged yet."}
                </div>
              );
            }
            return sortByDateDesc(filtered).map((item, idx) => {
              const isWithdrawal = item.type === "withdrawal" || item.desc.includes("Withdrawal");
              const typeColor = isWithdrawal ? p.accentWarm : p.accent;
              const typeSign = isWithdrawal ? "−" : "+";
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
                      🎯
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
    </div>
  );
}

export default GoalsScreen;
