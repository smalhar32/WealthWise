import React, { useState } from "react";
import { Ic } from "../components/Ic";
import { Bar } from "../components/Bar";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { parseLocalDate } from "../utils/helpers";

export function MonthlyReportScreen({ width, isMobile, isTablet, isDesktop, p, s, toast, categories, txns, pots = [], inv = [], debts = [], monthlySalary, setMonthlySalary, getSalaryForMonth, savingsHistory = [], investmentsHistory = [] }) {
  const [localSalary, setLocalSalary] = useState("");
  const [subTab, setSubTab] = useState("report"); // "report" or "diagnostics"
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showCal, setShowCal] = useState(false);
  const [calFocusDate, setCalFocusDate] = useState(() => new Date());

  const isCurrentMonthOrFuture = (d) => {
    const now = new Date();
    return (d.getFullYear() > now.getFullYear()) || 
           (d.getFullYear() === now.getFullYear() && d.getMonth() >= now.getMonth());
  };

  const isNextDisabled = isCurrentMonthOrFuture(selectedDate);

  const prev = () => {
    setSelectedDate(prevVal => {
      const d = new Date(prevVal);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const next = () => {
    if (isNextDisabled) return;
    setSelectedDate(prevVal => {
      const d = new Date(prevVal);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const _curMonth = selectedDate.getMonth();
  const _curYear = selectedDate.getFullYear();

  // Previous month helper
  const getPrevMonthYear = (m, y) => {
    if (m === 0) return { month: 11, year: y - 1 };
    return { month: m - 1, year: y };
  };
  const { month: _prevMonth, year: _prevYear } = getPrevMonthYear(_curMonth, _curYear);

  const activeSalary = getSalaryForMonth ? getSalaryForMonth(_curYear, _curMonth) : monthlySalary;
  const previousSalary = getSalaryForMonth ? getSalaryForMonth(_prevYear, _prevMonth) : monthlySalary;

  // Category Color Helper
  const getCatColor = (catName) => {
    const matched = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (matched && matched.color) return matched.color;
    const hash = [...catName].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [p.accent, p.accentBlue, p.accentPink, p.accentGold, p.accentWarm, "#9B5DE5", "#F15BB5", "#00F5D4", "#00BBF9", "#FF6B6B"];
    return colors[hash % colors.length];
  };

  // Earned & Spent - Current Month
  const thisMonthExtraIncome = txns
    .filter(t => t.amount > 0 && t.cat === "Income" && !t.name.toLowerCase().includes("salary") && (() => { const d = parseLocalDate(t.date); return d.getMonth() === _curMonth && d.getFullYear() === _curYear; })())
    .reduce((a, b) => a + b.amount, 0);
  const earned = activeSalary + thisMonthExtraIncome;
  const spent = txns
    .filter(t => t.amount < 0 && (() => { const d = parseLocalDate(t.date); return d.getMonth() === _curMonth && d.getFullYear() === _curYear; })())
    .reduce((a, t) => a + Math.abs(t.amount), 0);

  // Actual Deposits & Purchases - Current Month
  const curMonthSavings = (savingsHistory || []).filter(item => {
    const d = parseLocalDate(item.date);
    return d.getMonth() === _curMonth && d.getFullYear() === _curYear;
  });
  const curMonthSavingsDeposits = curMonthSavings
    .filter(item => item.type === "deposit")
    .reduce((sum, item) => sum + item.amount, 0);
  const curMonthSavingsWithdrawals = curMonthSavings
    .filter(item => item.type === "withdrawal" || item.type === "transfer")
    .reduce((sum, item) => sum + item.amount, 0);
  const curNetSavings = Math.max(0, curMonthSavingsDeposits - curMonthSavingsWithdrawals);

  const curMonthInvestments = (investmentsHistory || []).filter(item => {
    const d = parseLocalDate(item.date);
    return d.getMonth() === _curMonth && d.getFullYear() === _curYear;
  });
  const curMonthInvestmentsBuy = curMonthInvestments
    .filter(item => item.type === "buy")
    .reduce((sum, item) => sum + item.amount, 0);
  const curMonthInvestmentsSell = curMonthInvestments
    .filter(item => item.type === "sell")
    .reduce((sum, item) => sum + item.amount, 0);
  const curNetInvestments = Math.max(0, curMonthInvestmentsBuy - curMonthInvestmentsSell);

  const curActualSaved = curNetSavings + curNetInvestments;
  const savingsRate = earned > 0 ? curActualSaved / earned : 0;

  // Earned & Spent - Previous Month
  const prevMonthExtraIncome = txns
    .filter(t => t.amount > 0 && t.cat === "Income" && !t.name.toLowerCase().includes("salary") && (() => { const d = parseLocalDate(t.date); return d.getMonth() === _prevMonth && d.getFullYear() === _prevYear; })())
    .reduce((a, b) => a + b.amount, 0);
  const prevEarned = previousSalary + prevMonthExtraIncome;
  const prevSpent = txns
    .filter(t => t.amount < 0 && (() => { const d = parseLocalDate(t.date); return d.getMonth() === _prevMonth && d.getFullYear() === _prevYear; })())
    .reduce((a, t) => a + Math.abs(t.amount), 0);

  // Actual Deposits & Purchases - Previous Month
  const prevMonthSavings = (savingsHistory || []).filter(item => {
    const d = parseLocalDate(item.date);
    return d.getMonth() === _prevMonth && d.getFullYear() === _prevYear;
  });
  const prevMonthSavingsDeposits = prevMonthSavings
    .filter(item => item.type === "deposit")
    .reduce((sum, item) => sum + item.amount, 0);
  const prevMonthSavingsWithdrawals = prevMonthSavings
    .filter(item => item.type === "withdrawal" || item.type === "transfer")
    .reduce((sum, item) => sum + item.amount, 0);
  const prevNetSavings = Math.max(0, prevMonthSavingsDeposits - prevMonthSavingsWithdrawals);

  const prevMonthInvestments = (investmentsHistory || []).filter(item => {
    const d = parseLocalDate(item.date);
    return d.getMonth() === _prevMonth && d.getFullYear() === _prevYear;
  });
  const prevMonthInvestmentsBuy = prevMonthInvestments
    .filter(item => item.type === "buy")
    .reduce((sum, item) => sum + item.amount, 0);
  const prevMonthInvestmentsSell = prevMonthInvestments
    .filter(item => item.type === "sell")
    .reduce((sum, item) => sum + item.amount, 0);
  const prevNetInvestments = Math.max(0, prevMonthInvestmentsBuy - prevMonthInvestmentsSell);

  const prevActualSaved = prevNetSavings + prevNetInvestments;
  const prevSavingsRate = prevEarned > 0 ? prevActualSaved / prevEarned : 0;

  // Percentage change calculator
  const getPercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  };

  const incomeChangePct = getPercentChange(earned, prevEarned);
  const incomeBetter = earned >= prevEarned;

  const spentChangePct = getPercentChange(spent, prevSpent);
  const spentBetter = spent <= prevSpent;

  const rateDiff = (savingsRate - prevSavingsRate) * 100;
  const rateChangeText = `${rateDiff >= 0 ? "+" : ""}${rateDiff.toFixed(1)}%`;
  const rateBetter = rateDiff >= 0;

  // Category Breakdown Data
  const currentMonthExpenses = txns.filter(t => t.amount < 0 && (() => { const d = parseLocalDate(t.date); return d.getMonth() === _curMonth && d.getFullYear() === _curYear; })());
  const categoryTotals = {};
  currentMonthExpenses.forEach(t => {
    const catName = t.cat || "Other";
    categoryTotals[catName] = (categoryTotals[catName] || 0) + Math.abs(t.amount);
  });
  const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  const categoryBreakdown = Object.keys(categoryTotals).map(catName => {
    const amount = categoryTotals[catName];
    const pct = totalExpenses > 0 ? amount / totalExpenses : 0;
    const catObj = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    return {
      name: catName,
      amount,
      pct,
      emoji: catObj?.emoji || "💸",
      color: getCatColor(catName)
    };
  }).sort((a, b) => b.amount - a.amount);

  if (activeSalary === 0) {
    return (
      <div>
        <div style={s.label}>Monthly Report Config</div>
        <div style={s.card}>
          <div style={{ textAlign: "center", padding: "20px 10px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📊</div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: p.text, marginBottom: "8px" }}>Set Monthly Income</h2>
            <p style={{ ...s.muted, marginBottom: "20px" }}>
              To generate your Monthly Report & Financial Health Score, please enter your base monthly income (salary).
            </p>
            <div style={{ maxWidth: "280px", margin: "0 auto" }}>
              <Input label="Monthly Salary (₹)" value={localSalary} onChange={setLocalSalary} type="number" placeholder="e.g. 50000" p={p} />
              <button 
                onClick={() => {
                  const val = parseFloat(localSalary);
                  if (val > 0) {
                    setMonthlySalary(val, _curYear, _curMonth);
                    toast("Monthly salary configured! 📈");
                  } else {
                    toast("Please enter a valid amount! ⚠️");
                  }
                }}
                style={s.addBtn(p.accent)}
              >
                Configure & Generate
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- HEALTH DIAGNOSTIC CALCULATIONS ---
  // Pillar 1: Savings Rate (25 pts)
  const savingsScore = Math.min(25, Math.round((savingsRate / 0.2) * 25));

  // Pillar 2: Emergency Fund (25 pts)
  const totalSaved = pots.reduce((a, pt) => a + pt.amount, 0);
  const monthlyExpenseAvg = spent > 0 ? spent : activeSalary * 0.5;
  const emergencyTarget = monthlyExpenseAvg * 6;
  const emergencyScore = Math.min(25, Math.round((totalSaved / (emergencyTarget || 1)) * 25));

  // Pillar 3: Debt-to-Income (25 pts)
  const totalEMI = debts.reduce((a, d) => a + (d.emi || 0), 0);
  const dtiRatio = activeSalary > 0 ? totalEMI / activeSalary : 0;
  const debtScore = Math.max(0, Math.round((1 - dtiRatio / 0.4) * 25));

  // Pillar 4: Diversification (25 pts)
  const invTypes = new Set(inv.map(i => i.type || "Other"));
  const divScore = Math.min(25, Math.round((invTypes.size / 4) * 25));

  const totalScore = savingsScore + emergencyScore + debtScore + divScore;
  const scoreColor = totalScore >= 80 ? p.accent : totalScore >= 60 ? p.accentBlue : totalScore >= 40 ? p.accentGold : p.accentWarm;
  const grade = totalScore >= 80 ? "Excellent" : totalScore >= 60 ? "Good" : totalScore >= 40 ? "Needs Work" : "At Risk";

  const pillars = [
    {
      label: "Savings Rate",
      score: savingsScore,
      max: 25,
      color: p.accent,
      detail: `${Math.round(savingsRate * 100)}% of income`,
      desc: "Measures how much of your earned income is saved. Saving 20% or more receives full points.",
      tip: savingsRate >= 0.2 
        ? "Excellent job! You are meeting the golden rule of savings." 
        : `Try to reduce discretionary spending by ₹${Math.round(earned * (0.2 - savingsRate)).toLocaleString()} to reach the 20% target.`
    },
    {
      label: "Emergency Fund",
      score: emergencyScore,
      max: 25,
      color: p.accentBlue,
      detail: `₹${totalSaved.toLocaleString()} / ₹${Math.round(emergencyTarget).toLocaleString()}`,
      desc: "Measures savings coverage against 6 months of expenses. Having a full 6-month buffer receives full points.",
      tip: totalSaved >= emergencyTarget 
        ? "Superb! Your emergency fund is fully funded and ready." 
        : `Aim to save ₹${Math.round(emergencyTarget - totalSaved).toLocaleString()} more to secure your 6-month safety net.`
    },
    {
      label: "Debt-to-Income",
      score: debtScore,
      max: 25,
      color: dtiRatio > 0.4 ? p.accentWarm : p.accent,
      detail: `${Math.round(dtiRatio * 100)}% DTI ratio`,
      desc: "Measures EMI obligations against monthly salary. A DTI ratio below 10% is ideal, while 40% or more receives 0 points.",
      tip: dtiRatio <= 0.2 
        ? "Awesome! Your debt levels are completely under control." 
        : "Consider prepaying higher-interest debts or avoid taking on new loans to lower your monthly DTI ratio."
    },
    {
      label: "Diversification",
      score: divScore,
      max: 25,
      color: p.accentPink,
      detail: `${invTypes.size} asset type${invTypes.size !== 1 ? "s" : ""}`,
      desc: "Measures investment diversification across asset types (Mutual Funds, Stocks, Gold, FD, etc.). 4 or more types receive full points.",
      tip: invTypes.size >= 4 
        ? "Splendid! Your investments are well diversified." 
        : `Explore adding ${4 - invTypes.size} more asset type${4 - invTypes.size !== 1 ? "s" : ""} to your portfolio for better risk management.`
    }
  ];

  // Savings rate card helpers
  const savingsRatePct = Math.round(savingsRate * 100);
  let rateColor = p.accent;
  let rateGrade = "Excellent";
  let rateTip = "You saved a substantial portion of your income this month. Superb job! 🌟";

  if (savingsRatePct < 10) {
    rateColor = p.accentWarm;
    rateGrade = "Needs Attention";
    rateTip = "Try to budget strict limits on wants to secure a safe 10% buffer. ⚠️";
  } else if (savingsRatePct < 20) {
    rateColor = p.accentBlue;
    rateGrade = "Healthy";
    rateTip = "Good work! Try to trim unnecessary expenses to hit the 20% gold standard. 📈";
  }
  const showTwoColumns = width >= 768;

  const renderReportLeft = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {/* Month-End Summary Title & Card */}
      <div style={{ ...s.label, margin: 0 }}>Month-End Summary</div>
      <div style={{ ...s.card, marginBottom: 0 }}>
        <div style={{ ...s.row, marginBottom: "12px" }}>
          <div>
            <div style={{ ...s.muted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Income</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: p.accent, marginTop: "2px" }}>
              ₹{earned.toLocaleString()}
            </div>
            <div style={{ fontSize: "10px", color: p.textMuted, marginTop: "2px" }}>
              Base: ₹{activeSalary.toLocaleString()} | Extra: ₹{thisMonthExtraIncome.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...s.muted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Expenses</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: p.accentWarm, marginTop: "2px" }}>
              ₹{spent.toLocaleString()}
            </div>
            <div style={{ fontSize: "10px", color: p.textMuted, marginTop: "2px" }}>
              {earned > 0 ? `${Math.round((spent / earned) * 100)}% of income` : "0% of income"}
            </div>
          </div>
        </div>
        
        {/* Ratio Progress Bar */}
        <div style={{ ...s.track, height: "8px", background: p.border, borderRadius: "99px", overflow: "hidden" }}>
          <div 
            style={{ 
              height: "100%", 
              width: `${Math.min(100, earned > 0 ? (spent / earned) * 100 : 0)}%`, 
              background: spent > earned ? p.accentWarm : p.accentBlue, 
              borderRadius: "99px",
              transition: "width 0.5s ease"
            }} 
          />
        </div>

        {/* Income Sources Breakdown */}
        <div style={{ marginTop: "14px", borderTop: `1px solid ${p.border}`, paddingTop: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: p.text, marginBottom: "6px" }}>Income Sources</div>
          <div style={{ ...s.row, fontSize: "11px", padding: "4px 0" }}>
            <span style={{ color: p.textMuted }}>💼 Base Salary</span>
            <span style={{ fontWeight: 700, color: p.text }}>₹{activeSalary.toLocaleString()}</span>
          </div>
          {thisMonthExtraIncome > 0 && (
            <div style={{ ...s.row, fontSize: "11px", padding: "4px 0", borderTop: `1px dotted ${p.border}` }}>
              <span style={{ color: p.textMuted }}>💰 Extra Income</span>
              <span style={{ fontWeight: 700, color: p.accent }}>+₹{thisMonthExtraIncome.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...s.label, margin: "10px 0 0" }}>Comparison to Previous Month</div>
      {/* Comparison Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: 0 }}>
        {/* Income Comparison */}
        <div style={{ ...s.cardAlt, padding: "12px 10px", margin: 0, display: "flex", flexDirection: "column", alignItems: "center", borderLeft: `3px solid ${p.accent}` }}>
          <div style={{ fontSize: "10px", color: p.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Income</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: p.text, marginTop: "4px" }}>₹{earned.toLocaleString()}</div>
          <div style={{ fontSize: "10px", color: prevEarned > 0 ? (incomeBetter ? p.accent : p.accentWarm) : p.textMuted, fontWeight: 700, marginTop: "2px", display: "flex", alignItems: "center", gap: "2px" }}>
            {prevEarned > 0 ? (incomeBetter ? `▲ ${incomeChangePct}` : `▼ ${incomeChangePct}`) : "No data"}
          </div>
          <div style={{ fontSize: "9px", color: p.textMuted, marginTop: "2px" }}>Prev: ₹{prevEarned.toLocaleString()}</div>
        </div>

        {/* Expenses Comparison */}
        <div style={{ ...s.cardAlt, padding: "12px 10px", margin: 0, display: "flex", flexDirection: "column", alignItems: "center", borderLeft: `3px solid ${p.accentWarm}` }}>
          <div style={{ fontSize: "10px", color: p.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Expenses</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: p.text, marginTop: "4px" }}>₹{spent.toLocaleString()}</div>
          <div style={{ fontSize: "10px", color: prevSpent > 0 ? (spentBetter ? p.accent : p.accentWarm) : p.textMuted, fontWeight: 700, marginTop: "2px", display: "flex", alignItems: "center", gap: "2px" }}>
            {prevSpent > 0 ? (spentBetter ? `▼ ${spentChangePct}` : `▲ ${spentChangePct}`) : "No data"}
          </div>
          <div style={{ fontSize: "9px", color: p.textMuted, marginTop: "2px" }}>Prev: ₹{prevSpent.toLocaleString()}</div>
        </div>

        {/* Savings Rate Comparison */}
        <div style={{ ...s.cardAlt, padding: "12px 10px", margin: 0, display: "flex", flexDirection: "column", alignItems: "center", borderLeft: `3px solid ${p.accentBlue}` }}>
          <div style={{ fontSize: "10px", color: p.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Savings Rate</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: p.text, marginTop: "4px" }}>{Math.round(savingsRate * 100)}%</div>
          <div style={{ fontSize: "10px", color: prevEarned > 0 ? (rateBetter ? p.accent : p.accentWarm) : p.textMuted, fontWeight: 700, marginTop: "2px", display: "flex", alignItems: "center", gap: "2px" }}>
            {prevEarned > 0 ? (rateBetter ? `▲ ${rateChangeText}` : `▼ ${rateChangeText}`) : "No data"}
          </div>
          <div style={{ fontSize: "9px", color: p.textMuted, marginTop: "2px" }}>Prev: {Math.round(prevSavingsRate * 100)}%</div>
        </div>
      </div>

      <div style={{ ...s.label, margin: "10px 0 0" }}>Savings Rate Achieved</div>
      {/* Savings Rate Card */}
      <div style={{ ...s.card, marginBottom: 0 }}>
        <div style={{ ...s.row, marginBottom: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: p.text }}>Month Savings Rate</div>
          <div style={{ ...s.tag(rateColor), textTransform: "uppercase", fontSize: "10px" }}>{rateGrade}</div>
        </div>
        <div style={{ fontSize: "30px", fontWeight: 900, color: rateColor, marginBottom: "4px" }}>{savingsRatePct}%</div>
        <p style={{ ...s.muted, fontSize: "12px", lineHeight: "1.4" }}>{rateTip}</p>
        <div style={{ marginTop: "12px" }}>
          <Bar pct={savingsRatePct} color={rateColor} s={s} />
        </div>
      </div>
    </div>
  );

  const renderReportRight = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={{ ...s.label, margin: 0 }}>Category Breakdown</div>
      {/* Category breakdown pie chart */}
      <div style={{ ...s.card, marginBottom: 0 }}>
        {(() => {
          if (totalExpenses === 0) {
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="45" fill="transparent" stroke={p.border} strokeWidth="12" />
                  <text x="70" y="74" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "10px", fontWeight: 700, fill: p.textMuted }}>
                    No Expenses
                  </text>
                </svg>
                <div style={{ ...s.muted, marginTop: "12px", textAlign: "center" }}>No expenses logged this month yet.</div>
              </div>
            );
          }

          let accumulatedPercent = 0;
          const donutRadius = 45;
          const donutCircumference = 2 * Math.PI * donutRadius; // ~282.74

          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", margin: "10px 0" }}>
              {/* SVG Donut */}
              <div style={{ position: "relative", width: "140px", height: "140px" }}>
                <svg width="140" height="140" viewBox="0 0 140 140">
                  {categoryBreakdown.map(item => {
                    const strokeLength = item.pct * donutCircumference;
                    const strokeOffset = donutCircumference - (accumulatedPercent * donutCircumference);
                    accumulatedPercent += item.pct;

                    return (
                      <circle
                        key={item.name}
                        cx="70"
                        cy="70"
                        r={donutRadius}
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="12"
                        strokeDasharray={`${strokeLength} ${donutCircumference}`}
                        strokeDashoffset={strokeOffset}
                        transform="rotate(-90 70 70)"
                        style={{ transition: "all 0.5s ease" }}
                      />
                    );
                  })}
                </svg>
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center"
                }}>
                  <span style={{ fontSize: "15px", fontWeight: 900, color: p.text }}>
                    ₹{totalExpenses.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "8px", color: p.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>
                    Spent
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ width: "100%" }}>
                {categoryBreakdown.map((item, idx) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: idx === categoryBreakdown.length - 1 ? "none" : `1px solid ${p.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                      <span style={{ fontSize: "12px", fontWeight: 600, color: p.text }}>{item.emoji} {item.name}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: p.text }}>₹{item.amount.toLocaleString()}</div>
                      <div style={{ fontSize: "10px", color: p.textMuted }}>{Math.round(item.pct * 100)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );

  const renderHealthGauge = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={{ ...s.label, margin: 0 }}>Financial Diagnostics</div>
      <div style={{ ...s.card, marginBottom: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 20px" }}>
          <div style={{
            width: 130, height: 130, borderRadius: "50%",
            background: `conic-gradient(${scoreColor} ${totalScore * 3.6}deg, ${p.border} 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 24px ${scoreColor}20`,
            position: "relative"
          }}>
            <div style={{
              width: 112, height: 112, borderRadius: "50%", background: p.card,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ fontSize: "36px", fontWeight: 900, color: scoreColor, lineHeight: "1" }}>
                {totalScore}
              </span>
              <span style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>
                / 100
              </span>
            </div>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: p.text, marginTop: "16px", marginBottom: "4px" }}>
            {grade}
          </h2>
          <p style={{ ...s.muted, textAlign: "center", maxWidth: "280px", marginBottom: 0 }}>
            Your overall Financial Health Score is based on savings, buffer safety, debt load, and asset diversification.
          </p>
        </div>
      </div>
    </div>
  );

  const renderHealthPillars = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={{ ...s.label, margin: 0 }}>Diagnostic Pillars</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {pillars.map(pil => (
          <div key={pil.label} style={{ ...s.card, marginBottom: 0 }}>
            <div style={{ ...s.row, marginBottom: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: 800, color: p.text }}>{pil.label}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: pil.color }}>
                {pil.score} / {pil.max}
              </div>
            </div>
            <div style={{ fontSize: "12px", color: p.textMuted, marginBottom: "8px" }}>
              Current Status: <strong style={{ color: p.text }}>{pil.detail}</strong>
            </div>
            <Bar pct={(pil.score / pil.max) * 100} color={pil.color} s={s} />
            
            <div style={{ 
              background: p.cardAlt, 
              borderRadius: "10px", 
              padding: "10px 12px", 
              marginTop: "14px", 
              fontSize: "11px", 
              lineHeight: "1.4",
              borderLeft: `3px solid ${pil.color}`
            }}>
              <div style={{ color: p.text, fontWeight: 700, marginBottom: "4px" }}>Pillar Breakdown</div>
              <div style={{ color: p.textMuted }}>{pil.desc}</div>
              <div style={{ color: p.accent, fontWeight: 600, marginTop: "6px" }}>💡 {pil.tip}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Tab Selectors */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button
          onClick={() => setSubTab("report")}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "14px",
            border: "none",
            background: subTab === "report" ? p.accent : p.card,
            color: subTab === "report" ? "#fff" : p.text,
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: subTab === "report" ? `0 4px 12px ${p.accent}20` : "none",
            fontFamily: "inherit"
          }}
        >
          Report Summary
        </button>
        <button
          onClick={() => setSubTab("diagnostics")}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "14px",
            border: "none",
            background: subTab === "diagnostics" ? p.accent : p.card,
            color: subTab === "diagnostics" ? "#fff" : p.text,
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: subTab === "diagnostics" ? `0 4px 12px ${p.accent}20` : "none",
            fontFamily: "inherit"
          }}
        >
          Health Score
        </button>
      </div>

      <div style={{ ...s.row, marginBottom: "16px", alignItems: "center" }}>
        <div style={{ ...s.label, margin: 0 }}>
          {selectedDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })} · Monthly Report
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={prev}
            style={{
              background: p.cardAlt,
              border: `1px solid ${p.border}`,
              color: p.text,
              borderRadius: "10px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 800,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}
          >
            ‹
          </button>
          <button
            onClick={() => {
              setCalFocusDate(new Date(selectedDate));
              setShowCal(true);
            }}
            style={{
              background: p.cardAlt,
              border: `1px solid ${p.border}`,
              color: p.text,
              borderRadius: "10px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}
          >
            <Ic n="calendar" size={16} color={p.text} />
          </button>
          {(() => {
            const now = new Date();
            const isCurrent = selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear();
            return !isCurrent ? (
              <button
                onClick={() => setSelectedDate(new Date())}
                style={{
                  background: p.accent + "18",
                  border: `1px solid ${p.accent}40`,
                  color: p.accent,
                  borderRadius: "10px",
                  padding: "0 10px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}
              >
                Current Month
              </button>
            ) : null;
          })()}
          <button
            onClick={next}
            disabled={isNextDisabled}
            style={{
              background: p.cardAlt,
              border: `1px solid ${p.border}`,
              color: p.text,
              borderRadius: "10px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isNextDisabled ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 800,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              opacity: isNextDisabled ? 0.25 : 1
            }}
          >
            ›
          </button>
        </div>
      </div>

      {subTab === "report" ? (
        showTwoColumns ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", alignItems: "start", width: "100%" }}>
            {renderReportLeft()}
            {renderReportRight()}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {renderReportLeft()}
            {renderReportRight()}
          </div>
        )
      ) : (
        showTwoColumns ? (
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "24px", alignItems: "start", width: "100%" }}>
            {renderHealthGauge()}
            {renderHealthPillars()}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {renderHealthGauge()}
            {renderHealthPillars()}
          </div>
        )
      )}

      {/* Calendar Picker Modal */}
      <Modal open={showCal} onClose={() => setShowCal(false)} title="Select Month" p={p}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 4px" }}>
            <button
              type="button"
              onClick={() => setCalFocusDate(prevVal => new Date(prevVal.getFullYear() - 1, prevVal.getMonth(), 1))}
              style={{ background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text, borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: 800, fontSize: "14px" }}
            >
              ‹
            </button>
            <div style={{ fontSize: "14px", fontWeight: 750, color: p.text }}>{calFocusDate.getFullYear()}</div>
            <button
              type="button"
              disabled={calFocusDate.getFullYear() >= new Date().getFullYear()}
              onClick={() => setCalFocusDate(prevVal => new Date(prevVal.getFullYear() + 1, prevVal.getMonth(), 1))}
              style={{ 
                background: p.cardAlt, 
                border: `1px solid ${p.border}`, 
                color: p.text, 
                borderRadius: "8px", 
                width: "30px", 
                height: "30px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                cursor: calFocusDate.getFullYear() >= new Date().getFullYear() ? "not-allowed" : "pointer", 
                fontWeight: 800, 
                fontSize: "14px",
                opacity: calFocusDate.getFullYear() >= new Date().getFullYear() ? 0.3 : 1
              }}
            >
              ›
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((monthName, idx) => {
              const now = new Date();
              const isFutureMonth = (calFocusDate.getFullYear() > now.getFullYear()) ||
                (calFocusDate.getFullYear() === now.getFullYear() && idx > now.getMonth());
              const isSelected = selectedDate.getMonth() === idx && selectedDate.getFullYear() === calFocusDate.getFullYear();
              return (
                <button
                  key={monthName}
                  type="button"
                  disabled={isFutureMonth}
                  onClick={() => {
                    setSelectedDate(new Date(calFocusDate.getFullYear(), idx, 1));
                    setShowCal(false);
                  }}
                  style={{
                    background: isSelected ? p.accent : p.cardAlt,
                    color: isSelected ? "#fff" : p.text,
                    border: `1px solid ${isSelected ? p.accent : p.border}`,
                    borderRadius: "12px",
                    padding: "12px 8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: isFutureMonth ? "not-allowed" : "pointer",
                    opacity: isFutureMonth ? 0.3 : 1,
                    fontFamily: "inherit",
                    transition: "all 0.2s ease"
                  }}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MonthlyReportScreen;
