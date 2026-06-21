import React, { useState, useRef } from "react";
import { Ic } from "../components/Ic";
import { Bar } from "../components/Bar";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { formatTransactionTime, parseLocalDate } from "../utils/helpers";
import { setStorageItem } from "../utils/storage";

export function ExpensesScreen({ width, isMobile, isTablet, isDesktop, p, s, toast, categories, setCategories, txns, addExpense, setTxns, monthlySalary, openAddExpense, handleOpenEditTxn, getSalaryForMonth }) {
  const submittingRef = useRef(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showCustom, setShowCustom] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", emoji: "⭐", budget: "", type: "want" });
  const [draggedIdx, setDraggedIdx] = useState(null);

  // --- DRAG AND DROP HANDLERS (Desktop & Mobile Touch) ---
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index);
    setDraggedIdx(index);
  };

  const handleDragOver = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setCategories(prev => {
      const list = [...prev];
      const draggedItem = list[draggedIdx];
      list.splice(draggedIdx, 1);
      list.splice(targetIdx, 0, draggedItem);
      setDraggedIdx(targetIdx);
      return list;
    });
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setStorageItem("ww_categories", categories);
  };

  const handleTouchStart = (e, index) => {
    setDraggedIdx(index);
  };

  const handleTouchMove = (e) => {
    if (draggedIdx === null) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const card = element.closest("[data-index]");
    if (card) {
      const targetIdx = parseInt(card.getAttribute("data-index"));
      if (!isNaN(targetIdx) && targetIdx !== draggedIdx) {
        setCategories(prev => {
          const list = [...prev];
          const draggedItem = list[draggedIdx];
          list.splice(draggedIdx, 1);
          list.splice(targetIdx, 0, draggedItem);
          setDraggedIdx(targetIdx);
          return list;
        });
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIdx(null);
    setStorageItem("ww_categories", categories);
  };


  // Local calendar states
  const [viewMode, setViewMode] = useState("month"); // "month" or "day"
  const [showCal, setShowCal] = useState(false);
  const [calFocusDate, setCalFocusDate] = useState(() => new Date());
  const [calendarMode, setCalendarMode] = useState("month"); // "month" or "day"

  const isCurrentMonthOrFuture = (d) => {
    const now = new Date();
    return (d.getFullYear() > now.getFullYear()) || 
           (d.getFullYear() === now.getFullYear() && d.getMonth() >= now.getMonth());
  };

  const isCurrentDayOrFuture = (d) => {
    const now = new Date();
    return (d.getFullYear() > now.getFullYear()) ||
           (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth()) ||
           (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() >= now.getDate());
  };

  const isNextDisabled = viewMode === "day" 
    ? isCurrentDayOrFuture(selectedDate) 
    : isCurrentMonthOrFuture(selectedDate);

  const prev = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      if (viewMode === "day") {
        d.setDate(d.getDate() - 1);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  };

  const next = () => {
    if (isNextDisabled) return;
    setSelectedDate(prev => {
      const d = new Date(prev);
      if (viewMode === "day") {
        d.setDate(d.getDate() + 1);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  const isSameMonthYear = (dateStr, dateObj) => {
    if (!dateStr) return false;
    const d = parseLocalDate(dateStr);
    return d.getMonth() === dateObj.getMonth() && d.getFullYear() === dateObj.getFullYear();
  };

  const isSameDay = (dateStr, dateObj) => {
    if (!dateStr) return false;
    const d = parseLocalDate(dateStr);
    return (
      d.getDate() === dateObj.getDate() &&
      d.getMonth() === dateObj.getMonth() &&
      d.getFullYear() === dateObj.getFullYear()
    );
  };

  // Category Edit Modal States
  const [selectedCat, setSelectedCat] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("⭐");
  const [editBudget, setEditBudget] = useState("");
  const [editSpent, setEditSpent] = useState("");
  const [editRecurring, setEditRecurring] = useState(false);
  const [editType, setEditType] = useState("want");

  // Dynamically calculate spent amounts based on selected month/year or day
  const categoriesWithFilteredSpent = categories.map(c => {
    const spent = txns
      .filter(t => t.cat === c.name && t.amount < 0 && (
        viewMode === "day" ? isSameDay(t.date, selectedDate) : isSameMonthYear(t.date, selectedDate)
      ))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { ...c, spent };
  });

  const total = categoriesWithFilteredSpent.reduce((a, c) => a + c.spent, 0);
  const totalBudget = categoriesWithFilteredSpent.reduce((a, c) => a + c.budget, 0);
  const activeSalary = getSalaryForMonth ? getSalaryForMonth(selectedDate.getFullYear(), selectedDate.getMonth()) : monthlySalary;
  const overallBudget = activeSalary > 0 ? activeSalary * 0.8 : totalBudget;
  const overBudgetSum = categoriesWithFilteredSpent.reduce((acc, curr) => acc + Math.max(0, curr.spent - curr.budget), 0);
  const recurringCount = categoriesWithFilteredSpent.filter(c => c.recurring).length;

  const addCat = () => {
    if (submittingRef.current) return;
    if (!newCat.name || !newCat.budget || isNaN(newCat.budget)) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);
    setCategories(c => [...c, { name: newCat.name, emoji: newCat.emoji, spent: 0, budget: parseInt(newCat.budget), color: [p.accent, p.accentBlue, p.accentPink, p.accentGold, p.accentWarm][c.length % 5], recurring: false, type: newCat.type || "want" }]);
    setShowCustom(false);
    setNewCat({ name: "", emoji: "⭐", budget: "", type: "want" });
    toast("Category added! ✨");
  };

  const openEditCat = (cat) => {
    setSelectedCat(cat);
    setEditName(cat.name);
    setEditEmoji(cat.emoji || "⭐");
    setEditBudget(cat.budget.toString());
    setEditSpent(cat.spent.toString());
    setEditRecurring(cat.recurring || false);
    setEditType(cat.type || "want");
  };

  const saveEditCat = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);
    if (!editName.trim() || isNaN(editBudget) || isNaN(editSpent)) {
      toast("Please enter valid details! ⚠️");
      return;
    }
    const targetName = editName.trim();
    setCategories(prev => prev.map(c => c.name === selectedCat.name ? {
      ...c,
      name: targetName,
      emoji: editEmoji,
      budget: parseFloat(editBudget) || 0,
      spent: parseFloat(editSpent) || 0,
      recurring: editRecurring,
      type: editType
    } : c));

    // Sync transaction category names and emojis
    setTxns(prev => prev.map(t => t.cat === selectedCat.name ? {
      ...t,
      cat: targetName,
      name: t.name === selectedCat.name ? targetName : t.name,
      emoji: editEmoji
    } : t));

    setSelectedCat(null);
    toast("Category updated! ✨");
  };

  const deleteCat = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);
    setCategories(prev => prev.filter(c => c.name !== selectedCat.name));
    setSelectedCat(null);
    toast("Category deleted! 🗑️");
  };

  const openCalendarModal = () => {
    setCalFocusDate(new Date(selectedDate));
    setCalendarMode(viewMode);
    setShowCal(true);
  };

  const restoreDefaultCategories = () => {
    const defaultCategories = [
      { name: "Food & Dining", emoji: "🍔", spent: 0, budget: 0, color: p.accentWarm, recurring: false, type: "need" },
      { name: "Grocery", emoji: "🛒", spent: 0, budget: 0, color: p.accent, recurring: false, type: "need" },
      { name: "Transport", emoji: "🚗", spent: 0, budget: 0, color: p.accentBlue, recurring: false, type: "need" },
      { name: "Shopping", emoji: "🛍️", spent: 0, budget: 0, color: p.accentPink, recurring: false, type: "want" },
      { name: "Bills & Utilities", emoji: "💡", spent: 0, budget: 0, color: p.accentGold, recurring: true, type: "need" },
      { name: "EMI & Loans", emoji: "💳", spent: 0, budget: 0, color: p.accentWarm, recurring: true, type: "need" },
      { name: "Subscriptions", emoji: "🔄", spent: 0, budget: 0, color: p.accentBlue, recurring: true, type: "want" },
      { name: "Entertainment", emoji: "🎬", spent: 0, budget: 0, color: p.accent, recurring: false, type: "want" },
      { name: "Investments", emoji: "📈", spent: 0, budget: 0, color: p.accentBlue, recurring: false, type: "want" }
    ];

    setCategories(prev => {
      const updated = [...prev];
      let addedCount = 0;
      defaultCategories.forEach(def => {
        const exists = updated.some(c => c.name.toLowerCase() === def.name.toLowerCase());
        if (!exists) {
          updated.push(def);
          addedCount++;
        }
      });
      if (addedCount > 0) {
        toast(`Restored ${addedCount} default categories! 🛠️`);
      } else {
        toast("All default categories are already present!");
      }
      return updated;
    });
  };

  return (
    <div>
      <div style={{ ...s.row, marginBottom: "16px", alignItems: "center" }}>
        <div style={{ ...s.label, margin: 0 }}>
          {viewMode === "day"
            ? selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })
            : selectedDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })
          } · Expenses
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
            onClick={openCalendarModal}
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
          {/* Today button — shown when not viewing current month/day */}
          {(() => {
            const now = new Date();
            const isToday = viewMode === "month"
              ? (selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear())
              : (selectedDate.getDate() === now.getDate() && selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear());
            return !isToday ? (
              <button
                onClick={() => { setSelectedDate(new Date()); setViewMode("month"); }}
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
                Today
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

      <div style={s.heroCard(p.heroRed, p.accentWarm + "40")}>
        <div style={s.muted}>Total Spent</div>
        <div style={{ ...s.big, color: p.accentWarm }}>₹{total.toLocaleString()}</div>
        <div style={s.row}>
          <div style={s.muted}>Budget: ₹{overallBudget.toLocaleString()}</div>
          <div style={s.tag(total > overallBudget ? p.accentWarm : p.accent)}>
            {total > overallBudget ? `₹${(total - overallBudget).toLocaleString()} over limit` : "✓ Under Budget"}
          </div>
        </div>
      </div>

      {/* Recurring detector */}
      <div style={{ ...s.cardAlt, border: `1px solid ${p.accentBlue}30` }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Ic n="repeat" size={14} color={p.accentBlue} />
          <div style={{ fontSize: "12px", fontWeight: 700, color: p.accentBlue }}>{recurringCount} recurring expenses active</div>
        </div>
        <div style={{ ...s.muted, marginTop: "4px" }}>Bills & Subscriptions auto-repeat monthly. Fully operational.</div>
      </div>

      <div style={{ ...s.row, alignItems: "center", marginBottom: "16px" }}>
        <div style={{ ...s.label, margin: 0 }}>By Category (Tap card to edit)</div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: width < 600 ? "1fr" : (width < 900 ? "1fr 1fr" : "1fr 1fr 1fr"),
        gap: "12px",
        marginBottom: "16px"
      }}>
        {categoriesWithFilteredSpent.map((c, idx) => {
          const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : (c.spent > 0 ? 100 : 0);
          const isDragged = draggedIdx === idx;
          return (
            <div
              key={c.name}
              data-index={idx}
              style={{
                ...s.cardAlt,
                marginBottom: 0,
                cursor: draggedIdx !== null ? "grabbing" : "pointer",
                opacity: isDragged ? 0.6 : 1,
                background: isDragged ? `${p.accent}10` : s.cardAlt.background,
                border: isDragged ? `1px dashed ${p.accent}` : s.cardAlt.border,
                boxShadow: isDragged ? "none" : s.cardAlt.boxShadow,
                transition: "opacity 0.15s ease",
              }}
              onClick={() => draggedIdx === null && openEditCat(c)}
            >
              <div style={s.row}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* Drag Handle */}
                  <div
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, idx)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      cursor: "grab",
                      padding: "6px 10px 6px 0",
                      color: p.textMuted,
                      fontSize: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      touchAction: "none"
                    }}
                    title="Drag to reorder"
                  >
                    ☰
                  </div>
                  <span style={{ fontSize: "18px" }}>{c.emoji}</span>
                  <div>
                    <div style={{ ...s.small, display: "flex", alignItems: "center", gap: "6px" }}>
                      {c.name}
                      {c.recurring && <span style={{ ...s.tag(p.accentBlue), fontSize: "9px", padding: "1px 6px" }}>recurring</span>}
                    </div>
                    <div style={s.muted}>₹{c.spent.toLocaleString()} / ₹{c.budget.toLocaleString()}</div>
                  </div>
                </div>
                <div style={s.tag(pct > 100 ? p.accentWarm : c.color)}>{pct}%</div>
              </div>
              <Bar pct={pct} color={pct > 100 ? p.accentWarm : c.color} s={s} />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
        <button style={{ ...s.addBtn(p.accent), flex: 1, marginTop: 0 }} onClick={() => setShowCustom(true)}>+ Custom Category</button>
        <button style={{ ...s.addBtn(p.cardAlt), color: p.textMuted, border: `1px solid ${p.border}`, flex: 1, marginTop: 0, boxShadow: "none" }} onClick={restoreDefaultCategories}>Restore Defaults</button>
      </div>

      <Modal open={showCustom} onClose={() => setShowCustom(false)} title="Custom Category" p={p}>
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Pick Emoji</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "85px", overflowY: "auto", padding: "4px" }}>
            {["🍔", "🍕", "🍎", "📱", "💻", "📞", "🏍️", "🚗", "🚲", "✈️", "🏝️", "🧳", "💡", "🔌", "🧾", "🏠", "🔑", "🛍️", "🛒", "🎬", "🎮", "🍿", "🏋️", "🏃", "📚", "🎓", "💊", "🩺", "🐶", "🐱", "💰", "📈", "⭐", "🚀", "🎯", "💍", "🎁", "🔄"].map(e => (
              <button key={e} onClick={() => setNewCat(n => ({ ...n, emoji: e }))} style={{ fontSize: "20px", background: newCat.emoji === e ? p.accent + "30" : p.cardAlt, border: `1px solid ${newCat.emoji === e ? p.accent : p.border}`, borderRadius: "10px", padding: "6px 10px", cursor: "pointer" }}>{e}</button>
            ))}
          </div>
        </div>
        <Input label="Category Name" value={newCat.name} onChange={v => setNewCat(n => ({ ...n, name: v }))} placeholder="e.g. Gym" p={p} />
        <Input label="Monthly Budget (₹)" value={newCat.budget} onChange={v => setNewCat(n => ({ ...n, budget: v }))} type="number" placeholder="e.g. 2000" p={p} />
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Category Type</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {["need", "want"].map(t => (
              <button key={t} type="button" onClick={() => setNewCat(n => ({ ...n, type: t }))} style={{ flex: 1, background: newCat.type === t ? p.accent : p.cardAlt, color: newCat.type === t ? "#fff" : p.textMuted, border: `1px solid ${newCat.type === t ? p.accent : p.border}`, borderRadius: "12px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t === "need" ? "Need (50% rule)" : "Want (30% rule)"}
              </button>
            ))}
          </div>
        </div>
        <button style={s.addBtn(p.accent)} onClick={addCat}>Add Category</button>
      </Modal>


      {/* Edit Category Modal */}
      <Modal open={!!selectedCat} onClose={() => setSelectedCat(null)} title={selectedCat ? `${selectedCat.emoji} ${selectedCat.name}` : "Category Details"} p={p}>
        <Input label="Monthly Budget (₹)" value={editBudget} onChange={setEditBudget} type="number" placeholder="e.g. 10000" p={p} />
        <button style={s.addBtn(p.accent)} onClick={saveEditCat}>Save Budget Target</button>
        <button
          style={{
            ...s.addBtn(p.accentWarm),
            marginTop: "10px",
            background: "transparent",
            color: p.accentWarm,
            border: `1px solid ${p.accentWarm}`
          }}
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete the category "${selectedCat.name}"?`)) {
              deleteCat();
            }
          }}
        >
          Delete Category
        </button>

        {selectedCat && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px", borderBottom: `1px solid ${p.border}`, paddingBottom: "6px" }}>
              Expense Log Details
            </div>
            <div style={{ maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
              {(() => {
                const catTxns = txns.filter(t => t.cat === selectedCat.name && t.amount < 0 && (
                  viewMode === "day" ? isSameDay(t.date, selectedDate) : isSameMonthYear(t.date, selectedDate)
                ));
                return catTxns.length === 0 ? (
                  <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px" }}>
                    No expenses logged in this category yet.
                  </div>
                ) : (
                  catTxns.map((t, idx) => {
                    return (
                      <div key={idx} onClick={() => { setSelectedCat(null); handleOpenEditTxn(t); }} style={{ ...s.row, padding: "10px 0", borderBottom: `1px solid ${p.border}`, cursor: "pointer" }}>
                        <div>
                          <div style={{ ...s.small, fontWeight: 600 }}>{t.name}</div>
                          <div style={{ ...s.muted, fontSize: "10px", marginTop: "2px" }}>{formatTransactionTime(t)}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: p.accentWarm }}>
                          −₹{Math.abs(t.amount).toLocaleString()}
                        </div>
                      </div>
                    );
                  })
                );
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* Calendar Picker Modal */}
      <Modal open={showCal} onClose={() => setShowCal(false)} title="Select Date / Month" p={p}>
        <div style={{ display: "flex", background: p.cardAlt, borderRadius: "14px", padding: "4px", marginBottom: "18px", border: `1px solid ${p.border}` }}>
          <button
            type="button"
            onClick={() => setCalendarMode("month")}
            style={{
              flex: 1,
              background: calendarMode === "month" ? p.accent : "none",
              color: calendarMode === "month" ? "#fff" : p.textMuted,
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s ease"
            }}
          >
            Select Month
          </button>
          <button
            type="button"
            onClick={() => setCalendarMode("day")}
            style={{
              flex: 1,
              background: calendarMode === "day" ? p.accent : "none",
              color: calendarMode === "day" ? "#fff" : p.textMuted,
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s ease"
            }}
          >
            Select Day
          </button>
        </div>

        {calendarMode === "month" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 4px" }}>
              <button
                type="button"
                onClick={() => setCalFocusDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))}
                style={{ background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text, borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: 800, fontSize: "14px" }}
              >
                ‹
              </button>
              <div style={{ fontSize: "14px", fontWeight: 750, color: p.text }}>{calFocusDate.getFullYear()}</div>
              <button
                type="button"
                disabled={calFocusDate.getFullYear() >= new Date().getFullYear()}
                onClick={() => setCalFocusDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))}
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
                const isSelected = selectedDate.getMonth() === idx && selectedDate.getFullYear() === calFocusDate.getFullYear() && viewMode === "month";
                return (
                  <button
                    key={monthName}
                    type="button"
                    disabled={isFutureMonth}
                    onClick={() => {
                      setSelectedDate(new Date(calFocusDate.getFullYear(), idx, 1));
                      setViewMode("month");
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
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 4px" }}>
              <button
                type="button"
                onClick={() => setCalFocusDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                style={{ background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text, borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: 800, fontSize: "14px" }}
              >
                ‹
              </button>
              <div style={{ fontSize: "14px", fontWeight: 750, color: p.text }}>
                {calFocusDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
              </div>
              {(() => {
                const now = new Date();
                const isNextMonthCalDisabled = (calFocusDate.getFullYear() > now.getFullYear()) ||
                  (calFocusDate.getFullYear() === now.getFullYear() && calFocusDate.getMonth() >= now.getMonth());
                return (
                  <button
                    type="button"
                    disabled={isNextMonthCalDisabled}
                    onClick={() => setCalFocusDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
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
                      cursor: isNextMonthCalDisabled ? "not-allowed" : "pointer", 
                      fontWeight: 800, 
                      fontSize: "14px",
                      opacity: isNextMonthCalDisabled ? 0.3 : 1
                    }}
                  >
                    ›
                  </button>
                );
              })()}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", textAlign: "center", marginBottom: "8px" }}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                <div key={day} style={{ fontSize: "10px", fontWeight: 700, color: p.textMuted, textTransform: "uppercase" }}>{day}</div>
              ))}
            </div>
            {(() => {
              const firstDayIdx = new Date(calFocusDate.getFullYear(), calFocusDate.getMonth(), 1).getDay();
              const totalDays = new Date(calFocusDate.getFullYear(), calFocusDate.getMonth() + 1, 0).getDate();
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                  {Array.from({ length: firstDayIdx }).map((_, idx) => (
                    <div key={`empty-${idx}`} />
                  ))}
                  {Array.from({ length: totalDays }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const d = new Date(calFocusDate.getFullYear(), calFocusDate.getMonth(), dayNum);
                    const now = new Date();
                    const isFutureDay = d.getFullYear() > now.getFullYear() ||
                      (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth()) ||
                      (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() > now.getDate());
                    const isSelected = selectedDate.getDate() === dayNum &&
                      selectedDate.getMonth() === calFocusDate.getMonth() &&
                      selectedDate.getFullYear() === calFocusDate.getFullYear() &&
                      viewMode === "day";
                    return (
                      <button
                        key={`day-${dayNum}`}
                        type="button"
                        disabled={isFutureDay}
                        onClick={() => {
                          setSelectedDate(new Date(calFocusDate.getFullYear(), calFocusDate.getMonth(), dayNum));
                          setViewMode("day");
                          setShowCal(false);
                        }}
                        style={{
                          background: isSelected ? p.accent : "none",
                          color: isSelected ? "#fff" : p.text,
                          border: "none",
                          borderRadius: "8px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: isSelected ? 700 : 500,
                          cursor: isFutureDay ? "not-allowed" : "pointer",
                          opacity: isFutureDay ? 0.3 : 1,
                          fontFamily: "inherit",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
export default ExpensesScreen;
