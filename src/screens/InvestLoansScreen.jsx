import React, { useState, useRef } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Ic } from "../components/Ic";
import { Bar } from "../components/Bar";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { sortByDateDesc, formatTransactionTime, parseLocalDate, getLocalISODateString, calculateFDAccruedValue, calculateFDMaturityValue } from "../utils/helpers";

export function InvestLoansScreen({ width, isMobile, isTablet, isDesktop, p, s, toast, inv, setInv, debts, setDebts, txns, monthlySalary, addExpense, investmentsHistory = [], logInvestmentTransaction, loansHistory = [], logLoanTransaction, setInvestmentsHistory, setLoansHistory }) {
  const submittingRef = useRef(false);
  const [activeTab, setActiveTab] = useState("investments"); // "investments" or "loans"
  const [showAllInvHistory, setShowAllInvHistory] = useState(false);
  const [showAllLoanHistory, setShowAllLoanHistory] = useState(false);
  const [invSearchQuery, setInvSearchQuery] = useState("");
  const [loanSearchQuery, setLoanSearchQuery] = useState("");

  // -- INVESTMENT STATES --
  const [showAddInv, setShowAddInv] = useState(false);
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

  // FD addition states
  const [newRate, setNewRate] = useState("7.0");
  const [newStartDate, setNewStartDate] = useState(() => getLocalISODateString().slice(0, 10)); // default today (YYYY-MM-DD)
  const [newTenure, setNewTenure] = useState("12"); // default 12 months
  const [newCompounding, setNewCompounding] = useState("Quarterly"); // default Quarterly

  // FD editing states
  const [editInvRate, setEditInvRate] = useState("7.0");
  const [editInvStartDate, setEditInvStartDate] = useState("");
  const [editInvTenure, setEditInvTenure] = useState("12");
  const [editInvCompounding, setEditInvCompounding] = useState("Quarterly");

  // -- DEBT STATES --
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [debtName, setDebtName] = useState("");
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
  const [invTxnAmt, setInvTxnAmt] = useState("");

  // -- CALCULATIONS --
  const totalInvested = inv.reduce((a, i) => a + (i.invested || 0), 0);
  const totalCurrent = inv.reduce((a, i) => a + (i.current || 0), 0);
  const gain = totalCurrent - totalInvested;

  const totalDebt = debts.reduce((a, d) => a + (d.remaining || 0), 0);
  const totalEmi = debts.reduce((a, d) => a + (d.emi || 0), 0);
  const earned = monthlySalary + txns.filter(t => t.amount > 0 && !t.name.toLowerCase().includes("salary") && t.cat !== "Income").reduce((a, b) => a + b.amount, 0);

  const exportInvestmentsHistory = async (format) => {
    if (!investmentsHistory || investmentsHistory.length === 0) {
      toast("No transactions to export! ⚠️");
      return;
    }
    let content = "";
    if (format.toLowerCase() === 'csv') {
      content = "Date,Type,Description,Amount\n";
      investmentsHistory.forEach(item => {
        content += `"${parseLocalDate(item.date).toLocaleDateString()}","${item.type}","${item.desc.replace(/"/g, '""')}",${item.amount}\n`;
      });
    } else {
      content = "=========================================\n";
      content += "      WEALTHWISE INVESTMENT HISTORY       \n";
      content += "=========================================\n";
      content += `Export Date: ${new Date().toLocaleDateString()}\n\n`;
      investmentsHistory.forEach(item => {
        const descUpper = item.desc ? item.desc.toUpperCase() : "";
        const isSell = item.type === "sell" || 
                       item.type === "value_down" ||
                       descUpper.includes("SELL") ||
                       descUpper.includes("SOLD") ||
                       descUpper.includes("CLOSED") ||
                       descUpper.includes("WITHDRAW") ||
                       descUpper.includes("DELETE") ||
                       descUpper.includes("REMOVE");
        const sign = isSell ? "−" : "+";
        content += `${parseLocalDate(item.date).toLocaleDateString()} | [${item.type.toUpperCase()}] ${item.desc} | ${sign}₹${item.amount.toLocaleString()}\n`;
      });
    }

    const fileName = `Investment_History_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "Investment History",
          text: "Here is your investment transaction history.",
          url: result.uri,
          dialogTitle: "Share Investment History",
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

  const exportLoansHistory = async (format) => {
    if (!loansHistory || loansHistory.length === 0) {
      toast("No transactions to export! ⚠️");
      return;
    }
    let content = "";
    if (format.toLowerCase() === 'csv') {
      content = "Date,Type,Description,Amount\n";
      loansHistory.forEach(item => {
        content += `"${parseLocalDate(item.date).toLocaleDateString()}","${item.type}","${item.desc.replace(/"/g, '""')}",${item.amount}\n`;
      });
    } else {
      content = "=========================================\n";
      content += "        WEALTHWISE LOAN HISTORY          \n";
      content += "=========================================\n";
      content += `Export Date: ${new Date().toLocaleDateString()}\n\n`;
      loansHistory.forEach(item => {
        const descUpper = item.desc ? item.desc.toUpperCase() : "";
        const isDisbursement = item.type === "disbursement" || 
                               descUpper.includes("OPEN") ||
                               descUpper.includes("DISBURSE") ||
                               descUpper.includes("TAKEN");
        const sign = isDisbursement ? "−" : "+";
        content += `${parseLocalDate(item.date).toLocaleDateString()} | [${item.type.toUpperCase()}] ${item.desc} | ${sign}₹${item.amount.toLocaleString()}\n`;
      });
    }

    const fileName = `Loan_Payment_History_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "Loan Payment History",
          text: "Here is your loan payment history.",
          url: result.uri,
          dialogTitle: "Share Loan Payment History",
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

  // -- INVESTMENT HANDLERS --
  const addInv = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const isUnitBased = newType !== "FD" && newType !== "Real Estate";

    if (newType === "FD") {
      if (!newName.trim() || !newBuyPrice || isNaN(newBuyPrice) || parseFloat(newBuyPrice) <= 0) {
        toast("Please enter a valid invested value! ⚠️");
        return;
      }
      if (!newRate || isNaN(newRate) || parseFloat(newRate) < 0) {
        toast("Please enter a valid interest rate! ⚠️");
        return;
      }
      if (!newTenure || isNaN(newTenure) || parseInt(newTenure) <= 0) {
        toast("Please enter a valid tenure in months! ⚠️");
        return;
      }
      if (!newStartDate) {
        toast("Please enter a start date! ⚠️");
        return;
      }
    } else if (isUnitBased) {
      if (!newName.trim() || !newShares || isNaN(newShares) || parseFloat(newShares) <= 0 || !newBuyPrice || isNaN(newBuyPrice) || parseFloat(newBuyPrice) < 0 || !newCurrentPrice || isNaN(newCurrentPrice) || parseFloat(newCurrentPrice) < 0) {
        toast("Please enter valid positive values! ⚠️");
        return;
      }
    } else {
      if (!newName.trim() || !newBuyPrice || isNaN(newBuyPrice) || parseFloat(newBuyPrice) < 0 || !newCurrentPrice || isNaN(newCurrentPrice) || parseFloat(newCurrentPrice) < 0) {
        toast("Please enter valid positive values! ⚠️");
        return;
      }
    }

    let shares = 1;
    let buyPrice = parseFloat(newBuyPrice);
    let currentPrice = parseFloat(newCurrentPrice);
    let invested = Math.round(shares * buyPrice);
    let current = Math.round(shares * currentPrice);

    let extraFD = {};

    if (newType === "FD") {
      const rate = parseFloat(newRate);
      const tenure = parseInt(newTenure);
      const compounding = newCompounding;
      const startDate = newStartDate;
      
      const calculatedCurrent = calculateFDAccruedValue(buyPrice, rate, startDate, tenure, compounding);
      
      shares = 1;
      invested = Math.round(buyPrice);
      current = calculatedCurrent;
      buyPrice = invested;
      currentPrice = calculatedCurrent;
      
      extraFD = {
        rate,
        startDate,
        tenure,
        compounding
      };
    } else if (isUnitBased) {
      shares = parseFloat(newShares);
      buyPrice = parseFloat(newBuyPrice);
      currentPrice = parseFloat(newCurrentPrice);
      invested = Math.round(shares * buyPrice);
      current = Math.round(shares * currentPrice);
    } else {
      shares = 1;
      buyPrice = parseFloat(newBuyPrice);
      currentPrice = parseFloat(newCurrentPrice);
      invested = Math.round(buyPrice);
      current = Math.round(currentPrice);
    }
    
    if (shares > 1000000000 || buyPrice > 1000000000 || currentPrice > 1000000000) {
      toast("Value exceeds maximum limit! ⚠️");
      return;
    }

    setInv(prev => [...prev, {
      name: newName.trim(),
      type: newType,
      shares,
      buyPrice,
      currentPrice,
      invested,
      current,
      color: typeColors[newType] || p.accent,
      ...extraFD
    }]);

    if (logInvestmentTransaction) {
      logInvestmentTransaction("buy", `Initial Purchase: ${newName} (${newType})`, invested);
    }
    setShowAddInv(false);
    setNewName("");
    setNewShares("");
    setNewBuyPrice("");
    setNewCurrentPrice("");
    setNewRate("7.0");
    setNewStartDate(getLocalISODateString().slice(0, 10));
    setNewTenure("12");
    setNewCompounding("Quarterly");
    toast("Investment added! 📈");
  };

  const openEditInv = (idx) => {
    const item = inv[idx];
    setSelectedInvIdx(idx);
    setEditInvName(item.name);
    setEditInvType(item.type || "Mutual Fund");
    
    const shares = typeof item.shares === 'number' && item.shares > 0 ? item.shares : 1;
    const buyPrice = typeof item.buyPrice === 'number' ? item.buyPrice : item.invested;
    const currentPrice = typeof item.currentPrice === 'number' ? item.currentPrice : (item.current !== undefined ? item.current : buyPrice);

    setEditInvShares(shares.toString());
    setEditInvBuyPrice(buyPrice.toString());
    setEditInvCurrentPrice(currentPrice.toString());
    
    if (item.type === "FD") {
      setEditInvRate((item.rate !== undefined ? item.rate : 7.0).toString());
      setEditInvStartDate(item.startDate || getLocalISODateString().slice(0, 10));
      setEditInvTenure((item.tenure || 12).toString());
      setEditInvCompounding(item.compounding || "Quarterly");
    } else {
      setEditInvRate("7.0");
      setEditInvStartDate("");
      setEditInvTenure("12");
      setEditInvCompounding("Quarterly");
    }
    setInvTxnAmt("");
  };

  const saveEditInv = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const isEditUnitBased = editInvType !== "FD" && editInvType !== "Real Estate";

    if (!editInvName.trim()) {
      toast("Please enter a name! ⚠️");
      return;
    }
    if (editInvType === "FD") {
      if (!editInvBuyPrice || isNaN(editInvBuyPrice) || parseFloat(editInvBuyPrice) <= 0) {
        toast("Please enter a valid invested value! ⚠️");
        return;
      }
      if (!editInvRate || isNaN(editInvRate) || parseFloat(editInvRate) < 0) {
        toast("Please enter a valid interest rate! ⚠️");
        return;
      }
      if (!editInvTenure || isNaN(editInvTenure) || parseInt(editInvTenure) <= 0) {
        toast("Please enter a valid tenure in months! ⚠️");
        return;
      }
      if (!editInvStartDate) {
        toast("Please enter a start date! ⚠️");
        return;
      }
    } else {
      if (isEditUnitBased) {
        if (!editInvShares || isNaN(editInvShares) || parseFloat(editInvShares) <= 0) {
          toast("Please enter valid positive quantity/shares! ⚠️");
          return;
        }
      }
      if (!editInvBuyPrice || isNaN(editInvBuyPrice) || parseFloat(editInvBuyPrice) < 0) {
        toast("Please enter a valid buy price! ⚠️");
        return;
      }
      if (!editInvCurrentPrice || isNaN(editInvCurrentPrice) || parseFloat(editInvCurrentPrice) < 0) {
        toast("Please enter a valid current price! ⚠️");
        return;
      }
    }

    let shares = 1;
    let buyPrice = parseFloat(editInvBuyPrice);
    let currentPrice = parseFloat(editInvCurrentPrice);
    let invested = Math.round(shares * buyPrice);
    let current = Math.round(shares * currentPrice);

    let extraFD = {};

    if (editInvType === "FD") {
      const rate = parseFloat(editInvRate);
      const tenure = parseInt(editInvTenure);
      const compounding = editInvCompounding;
      const startDate = editInvStartDate;
      
      const calculatedCurrent = calculateFDAccruedValue(buyPrice, rate, startDate, tenure, compounding);
      
      shares = 1;
      invested = Math.round(buyPrice);
      current = calculatedCurrent;
      buyPrice = invested;
      currentPrice = calculatedCurrent;
      
      extraFD = {
        rate,
        startDate,
        tenure,
        compounding
      };
    } else if (isEditUnitBased) {
      shares = parseFloat(editInvShares);
      buyPrice = parseFloat(editInvBuyPrice);
      currentPrice = parseFloat(editInvCurrentPrice);
      invested = Math.round(shares * buyPrice);
      current = Math.round(shares * currentPrice);
    } else {
      shares = 1;
      buyPrice = parseFloat(editInvBuyPrice);
      currentPrice = parseFloat(editInvCurrentPrice);
      invested = Math.round(buyPrice);
      current = Math.round(currentPrice);
    }
    
    if (shares > 1000000000 || buyPrice > 1000000000 || currentPrice > 1000000000) {
      toast("Value exceeds maximum limit! ⚠️");
      return;
    }

    const idx = selectedInvIdx;
    const oldItem = inv[idx];

    setInv(prev => prev.map((item, i) => i === idx ? {
      ...item,
      name: editInvName.trim(),
      type: editInvType,
      shares,
      buyPrice,
      currentPrice,
      invested,
      current,
      color: typeColors[editInvType] || p.accent,
      ...extraFD
    } : item));

    if (logInvestmentTransaction && oldItem) {
      const oldCurrent = oldItem.current !== undefined ? oldItem.current : oldItem.invested;
      const diff = current - oldCurrent;
      if (diff > 0) {
        logInvestmentTransaction("value_up", `Value Appreciated: ${editInvName.trim()}`, diff);
      } else if (diff < 0) {
        logInvestmentTransaction("value_down", `Value Depreciated: ${editInvName.trim()}`, Math.abs(diff));
      }
    }
    setSelectedInvIdx(null);
    toast("Investment updated! ✨");
  };

  const deleteInv = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const idx = selectedInvIdx;
    const item = inv[idx];
    setInv(prev => prev.filter((_, i) => i !== idx));
    if (logInvestmentTransaction && item) {
      const currentVal = item.current !== undefined ? item.current : item.invested;
      logInvestmentTransaction("sell", `Closed Investment: ${item.name}`, currentVal);
    }
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

    if (logInvestmentTransaction) {
      logInvestmentTransaction("buy", `Invested: ${item.name}`, amt);
    }

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

    if (logInvestmentTransaction) {
      logInvestmentTransaction("sell", `Sold: ${item.name}`, amt);
    }

    setSelectedInvIdx(null);
    setInvTxnAmt("");
    toast(`Sold ₹${amt.toLocaleString()} of ${item.name}! 💸`);
  };

  // -- DEBT HANDLERS --
  const addDebt = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    if (!debtName || !emi || !remaining || !total || !months || isNaN(emi) || isNaN(remaining) || isNaN(total) || isNaN(months)) {
      toast("Please fill all fields! ⚠️");
      return;
    }
    const totalVal = parseFloat(total);
    setDebts(prev => [...prev, {
      name: debtName,
      emi: parseFloat(emi),
      remaining: parseFloat(remaining),
      total: totalVal,
      months: parseInt(months),
      color: [p.accentWarm, p.accentPink, p.accentGold, p.accentBlue][prev.length % 4]
    }]);
    if (logLoanTransaction) {
      logLoanTransaction("disbursement", `Loan Opened: ${debtName}`, totalVal);
    }
    setShowAddDebt(false);
    setDebtName(""); setEmi(""); setRemaining(""); setTotal(""); setMonths("");
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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    if (!editDebtName.trim() || !editDebtEmi || isNaN(editDebtEmi) || !editDebtTotal || isNaN(editDebtTotal) || !editDebtRemaining || isNaN(editDebtRemaining) || !editDebtMonths || isNaN(editDebtMonths)) {
      toast("Please enter valid details! ⚠️");
      return;
    }
    const idx = selectedDebtIdx;
    const oldDebt = debts[idx];
    const newRemaining = parseFloat(editDebtRemaining) || 0;
    setDebts(prev => prev.map((d, i) => i === idx ? {
      ...d,
      name: editDebtName.trim(),
      emi: parseFloat(editDebtEmi) || 0,
      total: parseFloat(editDebtTotal) || 0,
      remaining: newRemaining,
      months: parseInt(editDebtMonths) || 0
    } : d));
    if (logLoanTransaction && oldDebt) {
      const diff = oldDebt.remaining - newRemaining;
      if (diff !== 0) {
        logLoanTransaction(diff > 0 ? "repayment" : "disbursement", `Loan Adjustment: ${editDebtName.trim()}`, Math.abs(diff));
      }
    }
    setSelectedDebtIdx(null);
    toast("Debt entry updated! ✨");
  };

  const deleteDebt = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const idx = selectedDebtIdx;
    const oldDebt = debts[idx];
    setDebts(prev => prev.filter((_, i) => i !== idx));
    if (logLoanTransaction && oldDebt) {
      logLoanTransaction("adjustment", `Loan Settled/Removed: ${oldDebt.name}`, oldDebt.remaining);
    }
    setSelectedDebtIdx(null);
    toast("Debt entry deleted! 🗑️");
  };

  const payEmi = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

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
      addExpense(emiVal, "EMI & Loans", `EMI Repayment: ${d.name}`, null, false, getLocalISODateString());
    }
    if (logLoanTransaction) {
      logLoanTransaction("repayment", `EMI Paid: ${d.name}`, emiVal);
    }
    setSelectedDebtIdx(null);
    toast(`Paid EMI of ₹${emiVal.toLocaleString()}! 🏦`);
  };

  const payCustom = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 500);

    const idx = selectedDebtIdx;
    if (idx === null) return;
    if (!payAmt || isNaN(payAmt) || parseFloat(payAmt) <= 0) {
      toast("Please enter a valid payment amount! ⚠️");
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
      addExpense(amt, "EMI & Loans", `Repayment: ${d.name}`, null, false, getLocalISODateString());
    }
    if (logLoanTransaction) {
      logLoanTransaction("repayment", `Payment: ${d.name}`, amt);
    }
    setSelectedDebtIdx(null);
    setPayAmt("");
    toast(`Paid ₹${amt.toLocaleString()} towards ${d.name}! 🏦`);
  };

  const emiPctOfIncome = earned > 0 ? Math.round((totalEmi / earned) * 100) : (totalEmi > 0 ? 100 : 0);

  // -- INVESTMENT ALLOCATION CALCS --
  const grouped = inv.reduce((acc, item) => {
    const type = item.type || "Mutual Fund";
    acc[type] = (acc[type] || 0) + item.current;
    return acc;
  }, {});

  const allocation = Object.entries(grouped).map(([type, value]) => {
    const pct = totalCurrent > 0 ? Math.round((value / totalCurrent) * 100) : 0;
    return { type, pct, color: typeColors[type] || p.accent };
  }).sort((a, b) => b.pct - a.pct);

  const showTwoColumns = width >= 768;

  const renderInvestmentsLeft = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {/* Asset Allocation */}
      <div style={{ ...s.card, marginBottom: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: p.text, marginBottom: "12px" }}>Asset Allocation</div>
        {inv.length === 0 ? (
          <div style={{ ...s.muted, textAlign: "center", padding: "10px 0" }}>No data available</div>
        ) : (
          <>
            <div style={{ display: "flex", height: "10px", borderRadius: "99px", overflow: "hidden", gap: "2px", marginBottom: "12px" }}>
              {allocation.map((alloc, idx) => (
                <div key={idx} style={{ width: `${alloc.pct}%`, background: alloc.color }} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
              {allocation.map((alloc, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={s.dot(alloc.color)} />
                  <span style={{ fontSize: "11px", color: p.textMuted }}>{alloc.type} {alloc.pct}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Holdings Section */}
      <div style={{ fontSize: "14px", fontWeight: 700, color: p.text, marginBottom: "-4px" }}>Holdings</div>
      {inv.length === 0 ? (
        <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px", marginBottom: 0 }}>
          No investments added yet. Start tracking your holdings! 📈
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: width >= 900 ? "1fr 1fr" : "1fr",
          gap: "10px"
        }}>
          {inv.map((item, idx) => {
            const shares = typeof item.shares === 'number' ? item.shares : 1;
            const buyPrice = typeof item.buyPrice === 'number' ? item.buyPrice : item.invested;
            const currentPrice = typeof item.currentPrice === 'number' ? item.currentPrice : (item.current !== undefined ? item.current : buyPrice);
            const g = item.current - item.invested;
            const gp = buyPrice > 0 ? (((currentPrice - buyPrice) / buyPrice) * 100).toFixed(1) : "0.0";
            
            const isFD = item.type === "FD";
            const isUnitBased = item.type !== "FD" && item.type !== "Real Estate";
            
            let subtitle = "";
            if (isFD) {
              const tenureText = item.tenure ? `${item.tenure}M` : "";
              const rateText = item.rate ? `${item.rate}%` : "";
              const compoundingText = item.compounding ? ` (${item.compounding.charAt(0)})` : "";
              
              let maturityText = "";
              if (item.startDate && item.tenure) {
                const start = parseLocalDate(item.startDate);
                const matDate = new Date(start);
                matDate.setMonth(matDate.getMonth() + parseInt(item.tenure));
                maturityText = ` | Mat: ${matDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })}`;
              }
              
              subtitle = `FD · Rate: ${rateText}${compoundingText} | Tenure: ${tenureText}${maturityText}`;
            } else if (isUnitBased) {
              subtitle = `${item.type} · Shares: ${shares} | Avg Price: ₹${buyPrice.toLocaleString()}`;
            } else {
              subtitle = `${item.type} · Invested: ₹${item.invested.toLocaleString()}`;
            }

            return (
              <div key={item.name + idx} onClick={() => openEditInv(idx)} style={{ ...s.cardAlt, cursor: "pointer", marginBottom: 0 }}>
                <div style={s.row}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: "11px",
                      background: item.color + "18",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <div style={s.dot(item.color)} />
                    </div>
                    <div>
                      <div style={s.small}>{item.name}</div>
                      <div style={s.muted}>
                        {subtitle}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: p.text }}>₹{item.current.toLocaleString()}</div>
                    <div style={{ fontSize: "11px", color: p.textMuted, marginTop: "2px" }}>Invested: ₹{item.invested.toLocaleString()}</div>
                    <div style={{ fontSize: "11px", color: g > 0 ? p.accent : (g < 0 ? p.accentWarm : p.textMuted), fontWeight: 700, display: "flex", alignItems: "center", gap: "3px", justifyContent: "flex-end", marginTop: "2px" }}>
                      {g > 0 ? "▲ " : (g < 0 ? "▼ " : "")}{Math.abs(parseFloat(gp))}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button style={{ ...s.addBtn(p.accent), marginTop: 0 }} onClick={() => setShowAddInv(true)}>+ Add Investment</button>
    </div>
  );

  const renderInvestmentsRight = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {/* Investment Passbook */}
      <div style={{ ...s.card, padding: "16px 20px", marginBottom: 0 }}>
        <div style={{ ...s.row, borderBottom: `1px solid ${p.border}`, paddingBottom: "10px", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: p.text }}>Investment Passbook</div>
            <div style={s.muted}>{(investmentsHistory || []).length} records</div>
          </div>
          {investmentsHistory && investmentsHistory.length > 0 && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: p.textMuted, fontWeight: 600 }}>Export:</span>
              {["TXT", "CSV"].map(fmt => (
                <button key={fmt} onClick={() => exportInvestmentsHistory(fmt)} style={{ background: p.accentBlue + "12", color: p.accentBlue, border: `1px solid ${p.accentBlue}25`, borderRadius: "6px", padding: "4px 8px", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{fmt}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
          {(!investmentsHistory || investmentsHistory.length === 0) ? (
            <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px 0" }}>
              No investment transactions recorded yet. 📈
            </div>
          ) : (
            sortByDateDesc(investmentsHistory).slice(0, 8).map((item, idx) => {
              const descUpper = item.desc ? item.desc.toUpperCase() : "";
              const isBuy = item.type === "buy" || 
                            item.type === "value_up" ||
                            descUpper.includes("BUY") ||
                            descUpper.includes("BOUGHT") ||
                            descUpper.includes("INVESTED") ||
                            descUpper.includes("ADDED") ||
                            descUpper.includes("PURCHASE") ||
                            descUpper.includes("DEPOSIT") ||
                            descUpper.includes("FUNDING");
              const isSell = item.type === "sell" || 
                             item.type === "value_down" ||
                             descUpper.includes("SELL") ||
                             descUpper.includes("SOLD") ||
                             descUpper.includes("CLOSED") ||
                             descUpper.includes("WITHDRAW") ||
                             descUpper.includes("DELETE") ||
                             descUpper.includes("REMOVE");

              let typeColor = p.accent;
              let typeSign = "+";
              let typeIcon = "📥";

              if (isSell) {
                typeColor = p.accentWarm;
                typeSign = "−";
                typeIcon = "📤";
              } else if (isBuy) {
                typeColor = p.accent;
                typeSign = "+";
                typeIcon = "📥";
              } else {
                const isNegative = item.amount < 0;
                typeColor = isNegative ? p.accentWarm : p.accent;
                typeSign = isNegative ? "−" : "+";
                typeIcon = isNegative ? "📤" : "📥";
              }

              return (
                <div key={item.id || idx} style={{ ...s.row, padding: "11px 0", borderBottom: idx === Math.min(investmentsHistory.length, 8) - 1 ? "none" : `1px solid ${p.border}` }}>
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
        {investmentsHistory && investmentsHistory.length > 0 && (
          <button
            onClick={() => setShowAllInvHistory(true)}
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

  const renderLoansLeft = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {/* Strategy Tip */}
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
          <div style={{ ...s.cardAlt, border: `1px solid ${p.accentGold}30`, marginBottom: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: p.accentGold }}>💡 Debt-Free Strategy</div>
            <div style={{ ...s.muted, marginTop: "4px" }}>{debtTip}</div>
          </div>
        ) : null;
      })()}

      {/* Loans List */}
      <div style={{ fontSize: "14px", fontWeight: 700, color: p.text, marginBottom: "-4px" }}>Your Loans</div>
      {debts.length === 0 ? (
        <div style={{ ...s.cardAlt, textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px", marginBottom: 0 }}>
          You are debt-free! 🎉 Add a loan or EMI to manage repayments.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: width >= 900 ? "1fr 1fr" : "1fr",
          gap: "10px"
        }}>
          {debts.map((d, idx) => {
            const total = d.total || 0;
            const remaining = d.remaining || 0;
            const emi = d.emi || 0;
            const months = d.months || 0;
            const color = d.color || p.accentWarm;
            const paidPct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
            return (
              <div key={`${d.name || 'loan'}-${idx}`} onClick={() => openEditDebt(idx)} style={{ ...s.card, cursor: "pointer", marginBottom: 0 }}>
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
          })}
        </div>
      )}

      <button style={{ ...s.addBtn(p.accent), marginTop: 0 }} onClick={() => setShowAddDebt(true)}>+ Add Debt / Loan</button>
    </div>
  );

  const renderLoansRight = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {/* Loan Payment Passbook */}
      <div style={{ ...s.card, padding: "16px 20px", marginBottom: 0 }}>
        <div style={{ ...s.row, borderBottom: `1px solid ${p.border}`, paddingBottom: "10px", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: p.text }}>Payment History</div>
            <div style={s.muted}>{(loansHistory || []).length} records</div>
          </div>
          {loansHistory && loansHistory.length > 0 && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: p.textMuted, fontWeight: 600 }}>Export:</span>
              {["TXT", "CSV"].map(fmt => (
                <button key={fmt} onClick={() => exportLoansHistory(fmt)} style={{ background: p.accentBlue + "12", color: p.accentBlue, border: `1px solid ${p.accentBlue}25`, borderRadius: "6px", padding: "4px 8px", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{fmt}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
          {(!loansHistory || loansHistory.length === 0) ? (
            <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px 0" }}>
              No payment transactions recorded yet. 🏦
            </div>
          ) : (
            sortByDateDesc(loansHistory).slice(0, 8).map((item, idx) => {
              const descUpper = item.desc ? item.desc.toUpperCase() : "";
              const isRepayment = item.type === "repayment" || 
                                  descUpper.includes("PAY") ||
                                  descUpper.includes("REPAY") ||
                                  descUpper.includes("EMI") ||
                                  descUpper.includes("SETTLE");
              const isDisbursement = item.type === "disbursement" || 
                                     descUpper.includes("OPEN") ||
                                     descUpper.includes("DISBURSE") ||
                                     descUpper.includes("TAKEN");

              let typeColor = p.accent;
              let typeSign = "+";
              let typeIcon = "✅";

              if (isDisbursement) {
                typeColor = p.accentWarm;
                typeSign = "−";
                typeIcon = "🚨";
              } else if (isRepayment) {
                typeColor = p.accent;
                typeSign = "+";
                typeIcon = "✅";
              } else {
                const isNegative = item.amount < 0;
                typeColor = isNegative ? p.accentWarm : p.accent;
                typeSign = isNegative ? "−" : "+";
                typeIcon = isNegative ? "🚨" : "✅";
              }

              return (
                <div key={item.id || idx} style={{ ...s.row, padding: "11px 0", borderBottom: idx === Math.min(loansHistory.length, 8) - 1 ? "none" : `1px solid ${p.border}` }}>
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
        {loansHistory && loansHistory.length > 0 && (
          <button
            onClick={() => setShowAllLoanHistory(true)}
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
      <div style={s.label}>Invest & Loans</div>

      {/* Top Cards (Portfolio and Total Debt) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
        {/* Portfolio Card */}
        <div style={s.heroCard(p.heroBlue, p.accentBlue + "40")}>
          <div style={{ ...s.muted, fontSize: "11px" }}>Portfolio</div>
          <div style={{ ...s.big, fontSize: "22px", color: p.accentBlue, margin: "6px 0" }}>₹{totalCurrent.toLocaleString()}</div>
          <div style={{ ...s.tag(gain >= 0 ? p.accent : p.accentWarm), fontSize: "10px", padding: "2px 8px" }}>
            {gain >= 0 ? "+" : ""}₹{gain.toLocaleString()}
          </div>
        </div>

        {/* Total Debt Card */}
        <div style={s.heroCard(p.heroRed, p.accentWarm + "40")}>
          <div style={{ ...s.muted, fontSize: "11px" }}>Total Debt</div>
          <div style={{ ...s.big, fontSize: "22px", color: p.accentWarm, margin: "6px 0" }}>
            {totalDebt >= 100000 ? `₹${(totalDebt / 100000).toFixed(1)}L` : `₹${totalDebt.toLocaleString()}`}
          </div>
          <div style={{ ...s.tag(p.accentWarm), fontSize: "10px", padding: "2px 8px" }}>
            EMI ₹{totalEmi.toLocaleString()}/mo
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: "flex", background: p.cardAlt, borderRadius: "14px", padding: "4px", marginBottom: "18px", border: `1px solid ${p.border}` }}>
        <button
          type="button"
          onClick={() => setActiveTab("investments")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            background: activeTab === "investments" ? p.bg : "none",
            color: activeTab === "investments" ? p.text : p.textMuted,
            border: activeTab === "investments" ? `1px solid ${p.border}` : "none",
            borderRadius: "10px",
            padding: "10px 0",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: activeTab === "investments" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          📈 Investments
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("loans")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            background: activeTab === "loans" ? p.bg : "none",
            color: activeTab === "loans" ? p.text : p.textMuted,
            border: activeTab === "loans" ? `1px solid ${p.border}` : "none",
            borderRadius: "10px",
            padding: "10px 0",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: activeTab === "loans" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          💳 Loans
        </button>
      </div>

      {/* Dynamic Tab Content */}
      {activeTab === "investments" ? (
        showTwoColumns ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "24px", alignItems: "start", width: "100%" }}>
            {renderInvestmentsLeft()}
            {renderInvestmentsRight()}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {renderInvestmentsLeft()}
            {renderInvestmentsRight()}
          </div>
        )
      ) : (
        showTwoColumns ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "24px", alignItems: "start", width: "100%" }}>
            {renderLoansLeft()}
            {renderLoansRight()}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {renderLoansLeft()}
            {renderLoansRight()}
          </div>
        )
      )}

      {/* --- INVESTMENT MODALS --- */}
      <Modal open={showAddInv} onClose={() => setShowAddInv(false)} title="Add Investment" p={p}>
        <Input label="Name" value={newName} onChange={setNewName} placeholder="e.g. Apple Inc, HDFC Mid Cap" p={p} />
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {types.map(t => <button key={t} onClick={() => { setNewType(t); if (t === "FD" || t === "Real Estate") { setNewShares("1"); } }} style={{ background: newType === t ? p.accent : p.cardAlt, color: newType === t ? "#fff" : p.textMuted, border: `1px solid ${newType === t ? p.accent : p.border}`, borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>)}
          </div>
        </div>
        {newType === "FD" ? (
          <>
            <Input label="Invested Value / Principal (₹)" value={newBuyPrice} onChange={(val) => { setNewBuyPrice(val); setNewShares("1"); }} type="number" placeholder="e.g. 100000" p={p} />
            <Input label="Interest Rate (% p.a.)" value={newRate} onChange={setNewRate} type="number" placeholder="e.g. 7.5" p={p} />
            <Input label="Start Date" value={newStartDate} onChange={setNewStartDate} type="date" placeholder="Select Start Date" p={p} />
            <Input label="Tenure (Months)" value={newTenure} onChange={setNewTenure} type="number" placeholder="e.g. 12" p={p} />
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Compounding Frequency</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["Quarterly", "Monthly", "Yearly", "Simple"].map(freq => (
                  <button key={freq} type="button" onClick={() => setNewCompounding(freq)} style={{ background: newCompounding === freq ? p.accent : p.cardAlt, color: newCompounding === freq ? "#fff" : p.textMuted, border: `1px solid ${newCompounding === freq ? p.accent : p.border}`, borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{freq}</button>
                ))}
              </div>
            </div>
          </>
        ) : newType === "Real Estate" ? (
          <>
            <Input label="Invested Value (₹)" value={newBuyPrice} onChange={(val) => { setNewBuyPrice(val); setNewShares("1"); }} type="number" placeholder="e.g. 100000" p={p} />
            <Input label="Current Value (₹)" value={newCurrentPrice} onChange={setNewCurrentPrice} type="number" placeholder="e.g. 110000" p={p} />
          </>
        ) : (
          <>
            <Input label="Quantity / Shares" value={newShares} onChange={setNewShares} type="number" placeholder="e.g. 10" p={p} />
            <Input label="Average Buy Price (₹)" value={newBuyPrice} onChange={setNewBuyPrice} type="number" placeholder="e.g. 150" p={p} />
            <Input label="Current Market Price (₹)" value={newCurrentPrice} onChange={setNewCurrentPrice} type="number" placeholder="e.g. 180" p={p} />
          </>
        )}
        <div style={{ fontSize: "11px", color: p.textMuted, marginBottom: "12px", marginTop: "-8px", lineHeight: "1.5" }}>
          {newType === "FD" ? (
            (() => {
              const principal = parseFloat(newBuyPrice) || 0;
              const rate = parseFloat(newRate) || 0;
              const tenure = parseInt(newTenure) || 0;
              const compounding = newCompounding;
              const startDate = newStartDate;
              
              if (principal > 0 && rate >= 0 && tenure > 0 && startDate) {
                const accrued = calculateFDAccruedValue(principal, rate, startDate, tenure, compounding);
                const maturity = calculateFDMaturityValue(principal, rate, tenure, compounding);
                const interestEarned = accrued - principal;
                const totalInterest = maturity - principal;
                
                const start = parseLocalDate(startDate);
                const maturityDate = new Date(start);
                maturityDate.setMonth(maturityDate.getMonth() + tenure);
                const isMature = new Date() >= maturityDate;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontWeight: 700, color: p.text }}>Live Valuations:</div>
                    <div>• <b>Current Accrued Value:</b> ₹{accrued.toLocaleString()} (Interest: +₹{interestEarned.toLocaleString()})</div>
                    <div>• <b>Maturity Value:</b> ₹{maturity.toLocaleString()} (Total Interest: +₹{totalInterest.toLocaleString()})</div>
                    <div>• <b>Maturity Date:</b> {maturityDate.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })} {isMature ? " (Matured! 🎉)" : ""}</div>
                  </div>
                );
              }
              return "Enter Invested Value, Interest Rate, Start Date, and Tenure to preview live valuations";
            })()
          ) : newType === "Real Estate" ? (
            parseFloat(newBuyPrice) >= 0 && parseFloat(newCurrentPrice) >= 0 ? (
              `Initial Cost: ₹${Math.round(parseFloat(newBuyPrice)).toLocaleString()} · Current Valuation: ₹${Math.round(parseFloat(newCurrentPrice)).toLocaleString()} (${parseFloat(newCurrentPrice) >= parseFloat(newBuyPrice) ? "+" : ""}${(parseFloat(newBuyPrice) > 0 ? ((parseFloat(newCurrentPrice) - parseFloat(newBuyPrice)) / parseFloat(newBuyPrice) * 100).toFixed(1) : "0.0")}%)`
            ) : "Enter Invested Value and Current Value to preview metrics"
          ) : (
            parseFloat(newShares) > 0 && parseFloat(newBuyPrice) >= 0 && parseFloat(newCurrentPrice) >= 0 ? (
              `Initial Cost: ₹${Math.round(parseFloat(newShares) * parseFloat(newBuyPrice)).toLocaleString()} · Current Valuation: ₹${Math.round(parseFloat(newShares) * parseFloat(newCurrentPrice)).toLocaleString()} (${parseFloat(newCurrentPrice) >= parseFloat(newBuyPrice) ? "+" : ""}${(parseFloat(newBuyPrice) > 0 ? ((parseFloat(newCurrentPrice) - parseFloat(newBuyPrice)) / parseFloat(newBuyPrice) * 100).toFixed(1) : "0.0")}%)`
            ) : "Enter Quantity, Buy Price, and Current Price to preview metrics"
          )}
        </div>
        <button style={s.addBtn(p.accent)} onClick={addInv}>Add Investment</button>
      </Modal>

      <Modal open={selectedInvIdx !== null} onClose={() => setSelectedInvIdx(null)} title="Edit Investment" p={p}>
        <Input label="Name" value={editInvName} onChange={setEditInvName} placeholder="e.g. Apple Inc, HDFC Mid Cap" p={p} />
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {types.map(t => <button key={t} onClick={() => { setEditInvType(t); if (t === "FD" || t === "Real Estate") { setEditInvShares("1"); } }} style={{ background: editInvType === t ? p.accent : p.cardAlt, color: editInvType === t ? "#fff" : p.textMuted, border: `1px solid ${editInvType === t ? p.accent : p.border}`, borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>)}
          </div>
        </div>
        {editInvType === "FD" ? (
          <>
            <Input label="Invested Value / Principal (₹)" value={editInvBuyPrice} onChange={(val) => { setEditInvBuyPrice(val); setEditInvShares("1"); }} type="number" placeholder="e.g. 100000" p={p} />
            <Input label="Interest Rate (% p.a.)" value={editInvRate} onChange={setEditInvRate} type="number" placeholder="e.g. 7.5" p={p} />
            <Input label="Start Date" value={editInvStartDate} onChange={setEditInvStartDate} type="date" placeholder="Select Start Date" p={p} />
            <Input label="Tenure (Months)" value={editInvTenure} onChange={setEditInvTenure} type="number" placeholder="e.g. 12" p={p} />
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Compounding Frequency</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["Quarterly", "Monthly", "Yearly", "Simple"].map(freq => (
                  <button key={freq} type="button" onClick={() => setEditInvCompounding(freq)} style={{ background: editInvCompounding === freq ? p.accent : p.cardAlt, color: editInvCompounding === freq ? "#fff" : p.textMuted, border: `1px solid ${editInvCompounding === freq ? p.accent : p.border}`, borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{freq}</button>
                ))}
              </div>
            </div>
          </>
        ) : editInvType === "Real Estate" ? (
          <>
            <Input label="Invested Value (₹)" value={editInvBuyPrice} onChange={(val) => { setEditInvBuyPrice(val); setEditInvShares("1"); }} type="number" placeholder="e.g. 100000" p={p} />
            <Input label="Current Value (₹)" value={editInvCurrentPrice} onChange={setEditInvCurrentPrice} type="number" placeholder="e.g. 110000" p={p} />
          </>
        ) : (
          <>
            <Input label="Quantity / Shares" value={editInvShares} onChange={setEditInvShares} type="number" placeholder="e.g. 10" p={p} />
            <Input label="Average Buy Price (₹)" value={editInvBuyPrice} onChange={setEditInvBuyPrice} type="number" placeholder="e.g. 150" p={p} />
            <Input label="Current Market Price (₹)" value={editInvCurrentPrice} onChange={setEditInvCurrentPrice} type="number" placeholder="e.g. 180" p={p} />
          </>
        )}
        <div style={{ fontSize: "11px", color: p.textMuted, marginBottom: "12px", marginTop: "-8px", lineHeight: "1.5" }}>
          {editInvType === "FD" ? (
            (() => {
              const principal = parseFloat(editInvBuyPrice) || 0;
              const rate = parseFloat(editInvRate) || 0;
              const tenure = parseInt(editInvTenure) || 0;
              const compounding = editInvCompounding;
              const startDate = editInvStartDate;
              
              if (principal > 0 && rate >= 0 && tenure > 0 && startDate) {
                const accrued = calculateFDAccruedValue(principal, rate, startDate, tenure, compounding);
                const maturity = calculateFDMaturityValue(principal, rate, tenure, compounding);
                const interestEarned = accrued - principal;
                const totalInterest = maturity - principal;
                
                const start = parseLocalDate(startDate);
                const maturityDate = new Date(start);
                maturityDate.setMonth(maturityDate.getMonth() + tenure);
                const isMature = new Date() >= maturityDate;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontWeight: 700, color: p.text }}>Live Valuations:</div>
                    <div>• <b>Current Accrued Value:</b> ₹{accrued.toLocaleString()} (Interest: +₹{interestEarned.toLocaleString()})</div>
                    <div>• <b>Maturity Value:</b> ₹{maturity.toLocaleString()} (Total Interest: +₹{totalInterest.toLocaleString()})</div>
                    <div>• <b>Maturity Date:</b> {maturityDate.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })} {isMature ? " (Matured! 🎉)" : ""}</div>
                  </div>
                );
              }
              return "Enter valid details to calculate metrics";
            })()
          ) : editInvType === "Real Estate" ? (
            parseFloat(editInvBuyPrice) >= 0 && parseFloat(editInvCurrentPrice) >= 0 ? (
              `Calculated Cost: ₹${Math.round(parseFloat(editInvBuyPrice)).toLocaleString()} · Calculated Valuation: ₹${Math.round(parseFloat(editInvCurrentPrice)).toLocaleString()} (${parseFloat(editInvCurrentPrice) >= parseFloat(editInvBuyPrice) ? "+" : ""}${(parseFloat(editInvBuyPrice) > 0 ? ((parseFloat(editInvCurrentPrice) - parseFloat(editInvBuyPrice)) / parseFloat(editInvBuyPrice) * 100).toFixed(1) : "0.0")}%)`
            ) : "Enter valid details to calculate metrics"
          ) : (
            parseFloat(editInvShares) > 0 && parseFloat(editInvBuyPrice) >= 0 && parseFloat(editInvCurrentPrice) >= 0 ? (
              `Calculated Cost: ₹${Math.round(parseFloat(editInvShares) * parseFloat(editInvBuyPrice)).toLocaleString()} · Calculated Valuation: ₹${Math.round(parseFloat(editInvShares) * parseFloat(editInvCurrentPrice)).toLocaleString()} (${parseFloat(editInvCurrentPrice) >= parseFloat(editInvBuyPrice) ? "+" : ""}${(parseFloat(editInvBuyPrice) > 0 ? ((parseFloat(editInvCurrentPrice) - parseFloat(editInvBuyPrice)) / parseFloat(editInvBuyPrice) * 100).toFixed(1) : "0.0")}%)`
            ) : "Enter valid details to calculate metrics"
          )}
        </div>

        {/* Record Transaction section */}
        {editInvType !== "FD" && (
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
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button style={s.addBtn(p.accentWarm)} onClick={deleteInv}>Delete</button>
          <button style={s.addBtn(p.accent)} onClick={saveEditInv}>Save Changes</button>
        </div>
      </Modal>

      {/* --- DEBT MODALS --- */}
      <Modal open={showAddDebt} onClose={() => setShowAddDebt(false)} title="New Debt / Loan" p={p}>
        <Input label="Loan Name" value={debtName} onChange={setDebtName} placeholder="e.g. Car Loan" p={p} />
        <Input label="Monthly EMI (₹)" value={emi} onChange={setEmi} type="number" placeholder="e.g. 8000" p={p} />
        <Input label="Total Loan Amount (₹)" value={total} onChange={setTotal} type="number" placeholder="e.g. 500000" p={p} />
        <Input label="Remaining Balance (₹)" value={remaining} onChange={setRemaining} type="number" placeholder="e.g. 350000" p={p} />
        <Input label="Months Remaining" value={months} onChange={setMonths} type="number" placeholder="e.g. 48" p={p} />
        <button style={s.addBtn(p.accent)} onClick={addDebt}>Create Loan Entry</button>
      </Modal>

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

      {/* --- ALL INVESTMENTS History MODAL --- */}
      <Modal open={showAllInvHistory} onClose={() => { setShowAllInvHistory(false); setInvSearchQuery(""); }} title="Investment History" p={p}>
        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <input
            type="text"
            value={invSearchQuery}
            onChange={e => setInvSearchQuery(e.target.value)}
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
          {invSearchQuery && (
            <button
              onClick={() => setInvSearchQuery("")}
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}
            >
              <Ic n="close" size={14} color={p.textMuted} />
            </button>
          )}
        </div>
        <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
          {(!investmentsHistory || investmentsHistory.length === 0) ? (
            <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px 0" }}>
              No investment transactions recorded yet. 📈
            </div>
          ) : (
            (() => {
              const q = invSearchQuery.toLowerCase().trim();
              const filtered = q
                ? investmentsHistory.filter(item => (
                    (item.desc || "").toLowerCase().includes(q) ||
                    Math.abs(item.amount).toString().includes(q)
                  ))
                : investmentsHistory;
              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px 0" }}>
                    No transactions matching "{invSearchQuery}"
                  </div>
                );
              }
              return sortByDateDesc(filtered).map((item, idx) => {
                const descUpper = item.desc ? item.desc.toUpperCase() : "";
                const isBuy = item.type === "buy" || 
                              item.type === "value_up" ||
                              descUpper.includes("BUY") ||
                              descUpper.includes("BOUGHT") ||
                              descUpper.includes("INVESTED") ||
                              descUpper.includes("ADDED") ||
                              descUpper.includes("PURCHASE") ||
                              descUpper.includes("DEPOSIT") ||
                              descUpper.includes("FUNDING");
                const isSell = item.type === "sell" || 
                               item.type === "value_down" ||
                               descUpper.includes("SELL") ||
                               descUpper.includes("SOLD") ||
                               descUpper.includes("CLOSED") ||
                               descUpper.includes("WITHDRAW") ||
                               descUpper.includes("DELETE") ||
                               descUpper.includes("REMOVE");

                let typeColor = p.accent;
                let typeSign = "+";
                let typeIcon = "📥";

                if (isSell) {
                  typeColor = p.accentWarm;
                  typeSign = "−";
                  typeIcon = "📤";
                } else if (isBuy) {
                  typeColor = p.accent;
                  typeSign = "+";
                  typeIcon = "📥";
                } else {
                  const isNegative = item.amount < 0;
                  typeColor = isNegative ? p.accentWarm : p.accent;
                  typeSign = isNegative ? "−" : "+";
                  typeIcon = isNegative ? "📤" : "📥";
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
            })()
          )}
        </div>
      </Modal>

      {/* --- ALL LOANS History MODAL --- */}
      <Modal open={showAllLoanHistory} onClose={() => { setShowAllLoanHistory(false); setLoanSearchQuery(""); }} title="Loan Payment History" p={p}>
        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <input
            type="text"
            value={loanSearchQuery}
            onChange={e => setLoanSearchQuery(e.target.value)}
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
          {loanSearchQuery && (
            <button
              onClick={() => setLoanSearchQuery("")}
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}
            >
              <Ic n="close" size={14} color={p.textMuted} />
            </button>
          )}
        </div>
        <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
          {(!loansHistory || loansHistory.length === 0) ? (
            <div style={{ textAlign: "center", color: p.textMuted, fontSize: "12px", padding: "20px 0" }}>
              No payment transactions recorded yet. 🏦
            </div>
          ) : (
            sortByDateDesc(loansHistory).map((item, idx) => {
              const descUpper = item.desc ? item.desc.toUpperCase() : "";
              const isRepayment = item.type === "repayment" || 
                                  descUpper.includes("PAY") ||
                                  descUpper.includes("REPAY") ||
                                  descUpper.includes("EMI") ||
                                  descUpper.includes("SETTLE");
              const isDisbursement = item.type === "disbursement" || 
                                     descUpper.includes("OPEN") ||
                                     descUpper.includes("DISBURSE") ||
                                     descUpper.includes("TAKEN");

              let typeColor = p.accent;
              let typeSign = "+";
              let typeIcon = "✅";

              if (isDisbursement) {
                typeColor = p.accentWarm;
                typeSign = "−";
                typeIcon = "🚨";
              } else if (isRepayment) {
                typeColor = p.accent;
                typeSign = "+";
                typeIcon = "✅";
              } else {
                const isNegative = item.amount < 0;
                typeColor = isNegative ? p.accentWarm : p.accent;
                typeSign = isNegative ? "−" : "+";
                typeIcon = isNegative ? "🚨" : "✅";
              }

              return (
                <div key={item.id || idx} style={{ ...s.row, padding: "12px 0", borderBottom: idx === loansHistory.length - 1 ? "none" : `1px solid ${p.border}` }}>
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
      </Modal>
    </div>
  );
}

export default InvestLoansScreen;
