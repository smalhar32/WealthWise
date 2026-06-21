import React, { useState, useEffect, useRef } from "react";
import { Ic } from "../components/Ic";
import { Bar } from "../components/Bar";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { sortByDateDesc, formatTransactionTime, parseLocalDate } from "../utils/helpers";

export function HomeScreen({ width, isMobile, isTablet, isDesktop, p, s, toast, categories, setCategories, txns, setTxns, addExpense, userName, monthlySalary, setUserName, setMonthlySalary, openAddExpense, handleOpenEditTxn, pots = [], inv = [], debts = [] }) {
  const submittingRef = useRef(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [viewingBill, setViewingBill] = useState(null);
  const [showAllTxns, setShowAllTxns] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [tempName, setTempName] = useState(userName || "");
  const [tempSalary, setTempSalary] = useState(monthlySalary ? monthlySalary.toString() : "");
  const [tempExtraIncome, setTempExtraIncome] = useState("");
  const [tempExtraTitle, setTempExtraTitle] = useState("");

  useEffect(() => {
    setTempName(userName || "");
    setTempSalary(monthlySalary ? monthlySalary.toString() : "");
    setTempExtraIncome("");
    setTempExtraTitle("");
  }, [userName, monthlySalary]);

  const _now = new Date();
  const _curMonth = _now.getMonth();
  const _curYear = _now.getFullYear();
  const thisMonthExtraIncome = txns
    .filter(t => t.amount > 0 && t.cat === "Income" && !t.name.toLowerCase().includes("salary") && (() => { const d = parseLocalDate(t.date); return d.getMonth() === _curMonth && d.getFullYear() === _curYear; })())
    .reduce((a, b) => a + b.amount, 0);
  const earned = monthlySalary + thisMonthExtraIncome;
  const thisMonthIncomeTxns = txns.filter(t => t.amount > 0 && t.cat === "Income" && (() => { const d = parseLocalDate(t.date); return d.getMonth() === _curMonth && d.getFullYear() === _curYear; })());
  // Derive spent from actual txns for the current month (not stale category state)
  const spent = txns
    .filter(t => t.amount < 0 && (() => { const d = parseLocalDate(t.date); return d.getMonth() === _curMonth && d.getFullYear() === _curYear; })())
    .reduce((a, t) => a + Math.abs(t.amount), 0);
  const totalCatBudget = categories.reduce((a, c) => a + c.budget, 0);
  const overallBudget = monthlySalary > 0 ? monthlySalary * 0.8 : totalCatBudget;
  const left = earned - spent;
  const leftColor = left >= 0 ? p.accent : p.accentWarm;
  const spentPct = earned > 0 ? Math.min(100, Math.round((spent / earned) * 100)) : (spent > 0 ? 100 : 0);
  const daysInMonth = new Date(_curYear, _curMonth + 1, 0).getDate();
  const dayPct = Math.round((_now.getDate() / daysInMonth) * 100);

  const handleSaveProfile = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);
    if (!tempName.trim()) {
      toast("Please enter your name! ⚠️");
      return;
    }
    if (isNaN(tempSalary) || parseFloat(tempSalary) < 0) {
      toast("Please enter a valid income! ⚠️");
      return;
    }
    setUserName(tempName.trim());
    setMonthlySalary(parseFloat(tempSalary) || 0);
    // Log extra income as a transaction if provided
    if (tempExtraIncome && !isNaN(tempExtraIncome) && parseFloat(tempExtraIncome) > 0) {
      const incomeTitle = tempExtraTitle.trim() || "Extra Income";
      addExpense(parseFloat(tempExtraIncome), "Income", incomeTitle, null, true);
      toast(`"₹${parseFloat(tempExtraIncome).toLocaleString()} ${incomeTitle}" added to this month! 💰`);
    } else {
      toast("Profile updated! 👤");
    }
    setTempExtraIncome("");
    setTempExtraTitle("");
    setShowEditProfile(false);
  };

  const showTwoColumns = width >= 768;

  const renderLeftColumn = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={s.heroCard(p.heroGreen, p.accent + "40")}>
        <div style={s.muted}>Money Left This Month</div>
        <div style={{ ...s.big, color: leftColor, fontSize: "36px" }}>{left < 0 ? "−" : ""}₹{Math.abs(left).toLocaleString()}</div>
        <div style={s.row}>
          <div style={s.muted}>of ₹{earned.toLocaleString()} earned</div>
          <div style={s.tag(p.accent)}>{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} days left</div>
        </div>
        {thisMonthExtraIncome > 0 && (
          <div style={{ ...s.muted, fontSize: "10px", marginTop: "4px", opacity: 0.85, lineHeight: "1.3", borderTop: `1px solid ${p.accent}20`, paddingTop: "4px" }}>
            Salary: ₹{monthlySalary.toLocaleString()} • Extra: ₹{thisMonthExtraIncome.toLocaleString()}
          </div>
        )}
        <Bar pct={spentPct} color={spentPct > 80 ? p.accentWarm : p.accent} s={s} />
        <div style={{ ...s.row, marginTop: "8px" }}>
          <div style={s.muted}>Spent {spentPct}% of budget ({dayPct}% of month elapsed)</div>
          <div style={{ ...s.muted, color: spentPct > dayPct ? p.accentWarm : p.accent }}>{spentPct > dayPct ? "⚡ Faster than ideal" : "✓ Good pace"}</div>
        </div>
      </div>

      {spentPct > dayPct && (
        <div style={{ ...s.cardAlt, border: `1px solid ${p.accentWarm}40`, background: p.accentWarm + "10", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <Ic n="warn" size={16} color={p.accentWarm} />
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: p.accentWarm }}>Spending too fast this month</div>
            <div style={{ ...s.muted, marginTop: "2px" }}>Cut dining & shopping to reach month end comfortably</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: width < 400 ? "1fr" : "1fr 1fr 1fr", gap: "8px" }}>
        {[
          { label: "Spent", value: `₹${spent >= 100000 ? (spent / 100000).toFixed(2) + "L" : spent.toLocaleString()}`, color: p.accentWarm },
          { label: "Leftover", value: `${left < 0 ? "−" : ""}₹${Math.abs(left) >= 100000 ? (Math.abs(left) / 100000).toFixed(2) + "L" : Math.abs(left).toLocaleString()}`, color: leftColor },
          { label: "Active Budget", value: `₹${overallBudget >= 100000 ? (overallBudget / 100000).toFixed(2) + "L" : overallBudget.toLocaleString()}`, color: p.accentBlue },
        ].map(st => (
          <div key={st.label} style={{ ...s.card, padding: "14px", marginBottom: 0 }}>
            <div style={s.muted}>{st.label}</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: st.color, marginTop: "4px" }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* 50/30/20 Rule */}
      <div style={{ ...s.card, marginBottom: 0 }}>
        <div style={{ ...s.row, marginBottom: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: p.text }}>50/30/20 Rule</div>
          <div style={s.tag(p.accentBlue)}>Checker</div>
        </div>
        {[
          { label: "Needs (50% Budget)", target: 50, actual: earned > 0 ? Math.round(((categories.filter(c => c.type === "need").reduce((a, c) => a + c.spent, 0)) / earned) * 100) : 0, color: p.accentWarm, type: "needs" },
          { label: "Wants (30% Budget)", target: 30, actual: earned > 0 ? Math.round(((categories.filter(c => c.type === "want").reduce((a, c) => a + c.spent, 0)) / earned) * 100) : 0, color: p.accentBlue, type: "wants" },
          { label: "Savings/Invest (20%)", target: 20, actual: earned > 0 ? Math.round((Math.max(0, earned - spent) / earned) * 100) : 0, color: p.accent, type: "savings" },
        ].map(r => {
          const isWarning = r.type === "savings" ? r.actual < r.target : r.actual > r.target;
          const barColor = isWarning ? p.accentWarm : r.color;
          const textColor = isWarning ? p.accentWarm : p.accent;
          const symbol = r.type === "savings"
            ? (r.actual >= r.target ? "✓" : "↓")
            : (r.actual > r.target ? "↑" : "✓");
          return (
            <div key={r.label} style={{ marginBottom: "8px" }}>
              <div style={{ ...s.row }}>
                <div style={s.muted}>{r.label}</div>
                <div style={{ ...s.muted, color: textColor }}>{r.actual}% {symbol}</div>
              </div>
              <Bar pct={(r.actual / 70) * 100} color={barColor} s={s} />
            </div>
          );
        })}
      </div>

      <button style={{ ...s.addBtn(p.accent), marginTop: 0 }} onClick={() => openAddExpense()}>+ Log an Expense</button>
    </div>
  );

  const renderRightColumn = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={{ ...s.card, padding: "20px", marginBottom: 0 }}>
        <div style={{ ...s.row, marginBottom: "12px", borderBottom: `1px solid ${p.border}`, paddingBottom: "10px" }}>
          <div style={{ ...s.label, margin: 0 }}>Recent Transactions</div>
          <div style={s.tag(p.accentBlue)}>{txns.length} total</div>
        </div>
        {txns.length === 0 ? (
          <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px" }}>
            No transactions logged yet. Click "Log an Expense" to start! 💸
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {sortByDateDesc(txns).slice(0, 5).map((t) => {
              const globalIdx = txns.findIndex(x => x === t);
              return (
                <div key={globalIdx} onClick={() => handleOpenEditTxn(t)} style={{ ...s.row, padding: "11px 0", borderBottom: `1px solid ${p.border}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "11px", background: (t.amount < 0 ? p.accentWarm : p.accent) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>{t.emoji}</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={s.small}>{t.name}</div>
                        {t.billImage && (
                          <button onClick={(e) => { e.stopPropagation(); setViewingBill(t.billImage); }} style={{ background: p.accentBlue + "18", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "10px", padding: "2px 6px", color: p.accentBlue, display: "flex", alignItems: "center", gap: "3px", fontWeight: 700 }}>
                            🧾 Bill
                          </button>
                        )}
                      </div>
                      <div style={s.muted}>{formatTransactionTime(t)} · {t.cat}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: t.amount < 0 ? p.accentWarm : p.accent, whiteSpace: "nowrap" }}>
                    {t.amount < 0 ? "−" : "+"}₹{Math.abs(t.amount).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {txns.length > 5 && (
          <button
            onClick={() => setShowAllTxns(true)}
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
      <div style={{ ...s.row, marginBottom: "20px" }}>
        <div>
          <div style={s.muted}>Hello 👋</div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: p.text }}>{userName || "Guest"}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ ...s.tag(spentPct > 60 ? p.accentWarm : p.accent) }}>{spentPct > 60 ? "⚠️ Over pace" : "✅ On track"}</div>
          <button
            onClick={() => setShowEditProfile(true)}
            style={{ width: 38, height: 38, borderRadius: "50%", background: p.accent + "25", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: p.accent, border: "none", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}
          >
            {(userName || "Guest").charAt(0).toUpperCase()}
          </button>
        </div>
      </div>
      {!userName && monthlySalary === 0 && (
        <div style={{ ...s.card, border: `2px dashed ${p.accent}`, background: p.accent + "0a", textAlign: "center", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "28px" }}>👋</div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: p.text }}>Welcome to WealthWise</div>
          <div style={{ ...s.muted, maxWidth: "260px" }}>Let's set up your profile and monthly salary to start budgeting and tracking your finances!</div>
          <button onClick={() => setShowEditProfile(true)} style={{ ...s.addBtn(p.accent), margin: "8px 0 0", width: "auto", padding: "10px 20px" }}>Set Up Profile</button>
        </div>
      )}

      {showTwoColumns ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "24px", alignItems: "start", width: "100%" }}>
          {renderLeftColumn()}
          {renderRightColumn()}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {renderLeftColumn()}
          {/* Recent Transactions block (expanded for mobile view) */}
          <div style={{ marginTop: "16px" }}>
            <div style={s.label}>Recent Transactions</div>
            {txns.length === 0 ? (
              <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px" }}>
                No transactions logged yet. Click "Log an Expense" to start! 💸
              </div>
            ) : (
              sortByDateDesc(txns).slice(0, 4).map((t) => {
                const globalIdx = txns.findIndex(x => x === t);
                return (
                  <div key={globalIdx} onClick={() => handleOpenEditTxn(t)} style={{ ...s.row, padding: "11px 0", borderBottom: `1px solid ${p.border}`, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "11px", background: (t.amount < 0 ? p.accentWarm : p.accent) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>{t.emoji}</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={s.small}>{t.name}</div>
                          {t.billImage && (
                            <button onClick={(e) => { e.stopPropagation(); setViewingBill(t.billImage); }} style={{ background: p.accentBlue + "18", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "10px", padding: "2px 6px", color: p.accentBlue, display: "flex", alignItems: "center", gap: "3px", fontWeight: 700 }}>
                              🧾 Bill
                            </button>
                          )}
                        </div>
                        <div style={s.muted}>{formatTransactionTime(t)} · {t.cat}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: t.amount < 0 ? p.accentWarm : p.accent, whiteSpace: "nowrap" }}>
                      {t.amount < 0 ? "−" : "+"}₹{Math.abs(t.amount).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
            {txns.length > 4 && (
              <button
                onClick={() => setShowAllTxns(true)}
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
      )}

      <Modal open={showEditProfile} onClose={() => setShowEditProfile(false)} title="Edit Profile" p={p}>
        <Input label="Your Name" value={tempName} onChange={setTempName} placeholder="e.g. Rahul" p={p} />
        <Input label="Monthly Income / Salary (₹)" value={tempSalary} onChange={setTempSalary} type="number" placeholder="e.g. 45000" p={p} />

        {/* Extra Income Section */}
        <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: "14px", marginBottom: "4px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: p.accent, marginBottom: "10px" }}>
            💰 Log Extra Income (optional)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
            {["Bonus", "Freelance", "Refund", "Gift", "Other"].map(label => (
              <button key={label} type="button"
                onClick={() => setTempExtraTitle(tempExtraTitle === label ? "" : label)}
                style={{ background: tempExtraTitle === label ? p.accent : p.cardAlt, color: tempExtraTitle === label ? "#fff" : p.textMuted, border: `1px solid ${tempExtraTitle === label ? p.accent : p.border}`, borderRadius: "20px", padding: "5px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >{label}</button>
            ))}
          </div>
          <input
            type="text"
            value={tempExtraTitle}
            onChange={e => setTempExtraTitle(e.target.value)}
            placeholder="Source title (e.g. Freelance, Bonus...)"
            style={{ width: "100%", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", padding: "10px 14px", color: p.text, fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "8px" }}
          />
          <input
            type="number"
            value={tempExtraIncome}
            onChange={e => setTempExtraIncome(e.target.value)}
            placeholder="Amount (₹) e.g. 5000"
            style={{ width: "100%", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", padding: "10px 14px", color: p.text, fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ fontSize: "10px", color: p.textMuted, marginTop: "6px" }}>This will be added to your total income for this month only.</div>
        </div>

        <button style={{ ...s.addBtn(p.accent), marginTop: "14px" }} onClick={handleSaveProfile}>Save Changes</button>
      </Modal>

      <Modal open={showAllTxns} onClose={() => { setShowAllTxns(false); setSearchQuery(""); }} title="All Transactions" p={p}>
        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, category, or amount..."
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
        <div style={{ maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
          {(() => {
            const q = searchQuery.toLowerCase().trim();
            const filtered = q
              ? txns.filter(t => (
                  (t.name || "").toLowerCase().includes(q) ||
                  (t.cat || "").toLowerCase().includes(q) ||
                  Math.abs(t.amount).toString().includes(q)
                ))
              : txns;
            if (filtered.length === 0) {
              return (
                <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px" }}>
                  {q ? `No transactions matching "${searchQuery}"` : "No transactions logged yet."}
                </div>
              );
            }
            return sortByDateDesc(filtered).map((t) => {
              const globalIdx = txns.findIndex(x => x === t);
              return (
                <div key={globalIdx} onClick={() => { setShowAllTxns(false); setSearchQuery(""); handleOpenEditTxn(t); }} style={{ ...s.row, padding: "11px 0", borderBottom: `1px solid ${p.border}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "11px", background: (t.amount < 0 ? p.accentWarm : p.accent) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>{t.emoji}</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={s.small}>{t.name}</div>
                        {t.billImage && (
                          <button onClick={(e) => { e.stopPropagation(); setViewingBill(t.billImage); }} style={{ background: p.accentBlue + "18", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "10px", padding: "2px 6px", color: p.accentBlue, display: "flex", alignItems: "center", gap: "3px", fontWeight: 700 }}>
                            🧾 Bill
                          </button>
                        )}
                      </div>
                      <div style={s.muted}>{formatTransactionTime(t)} · {t.cat}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: t.amount < 0 ? p.accentWarm : p.accent, whiteSpace: "nowrap" }}>
                    {t.amount < 0 ? "−" : "+"}₹{Math.abs(t.amount).toLocaleString()}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </Modal>

      <Modal open={!!viewingBill} onClose={() => setViewingBill(null)} title="View Bill" p={p}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <img src={viewingBill} alt="Bill receipt" style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "12px", border: `1px solid ${p.border}` }} />
          <button style={s.addBtn(p.accentBlue)} onClick={() => setViewingBill(null)}>Close</button>
        </div>
      </Modal>
    </div>
  );
}
export default HomeScreen;
