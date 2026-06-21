import React, { useEffect } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Ic } from "../components/Ic";

export function NetWorthScreen({ width, isMobile, isTablet, isDesktop, p, s, toast, pots, inv, debts, prevNetWorth, setPrevNetWorth }) {
  const getPast6Months = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
      result.push(monthNames[targetDate.getMonth()]);
    }
    return result;
  };
  const months = getPast6Months();
  const totalSavings = pots.reduce((a, b) => a + b.amount, 0);
  const totalInvestments = inv.reduce((a, b) => a + b.current, 0);
  const totalDebts = debts.reduce((a, d) => a + (d.remaining || 0), 0);
  const netWorthValue = totalSavings + totalInvestments - totalDebts;

  const isInitialUser = totalSavings + totalInvestments + totalDebts === 0;
  const values = isInitialUser ? [0, 0, 0, 0, 0, 0] : [
    Math.round(netWorthValue * 0.8),
    Math.round(netWorthValue * 0.85),
    Math.round(netWorthValue * 0.9),
    Math.round(netWorthValue * 0.88),
    Math.round(netWorthValue * 0.95),
    netWorthValue
  ];
  const maxVal = Math.max(...values, 1);

  // Initialize prevNetWorth automatically to netWorthValue on first time they log positive asset
  useEffect(() => {
    if (prevNetWorth === 0 && netWorthValue > 0) {
      setPrevNetWorth(netWorthValue);
    }
  }, [netWorthValue, prevNetWorth, setPrevNetWorth]);

  const formatLakhs = (val) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const text = absVal >= 100000 ? `${(absVal / 100000).toFixed(2)}L` : absVal.toLocaleString();
    return (isNegative ? "−" : "") + "₹" + text;
  };

  const exportReport = async (format) => {
    let content = "";
    content += "=========================================\n";
    content += "        WEALTHWISE FINANCIAL REPORT       \n";
    content += "=========================================\n";
    content += `Date: ${new Date().toLocaleDateString()}\n\n`;
    content += `NET WORTH SUMMARY:\n`;
    content += `  - Total Net Worth: ₹${netWorthValue.toLocaleString()}\n`;
    content += `  - Total Liquid Savings: ₹${totalSavings.toLocaleString()}\n`;
    content += `  - Total Investments Value: ₹${totalInvestments.toLocaleString()}\n`;
    content += `  - Total Outstanding Debts: ₹${totalDebts.toLocaleString()}\n\n`;

    content += `SAVINGS BREAKDOWN:\n`;
    pots.forEach(pt => {
      content += `  - ${pt.name}: ₹${pt.amount.toLocaleString()} (${pt.rate})\n`;
    });
    content += `\nINVESTMENTS BREAKDOWN:\n`;
    inv.forEach(i => {
      content += `  - ${i.name} (${i.type}): Current: ₹${i.current.toLocaleString()}, Invested: ₹${i.invested.toLocaleString()}\n`;
    });
    content += `\nDEBTS BREAKDOWN:\n`;
    debts.forEach(d => {
      content += `  - ${d.name || "Loan"}: Outstanding: ₹${(d.remaining || 0).toLocaleString()}, Monthly EMI: ₹${(d.emi || 0).toLocaleString()} (${d.months || 0} mo left)\n`;
    });

    const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).replace(" ", "_");
    const fileName = `WealthWise_Report_${monthYear}.${format.toLowerCase() === 'csv' ? 'csv' : 'txt'}`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: "WealthWise Report",
          text: "Here is your WealthWise financial report.",
          url: result.uri,
          dialogTitle: "Share Financial Report",
        });

        toast(`Report shared successfully! 📄`);
      } catch (err) {
        console.error("Error sharing report:", err);
        toast(`Failed to export report: ${err.message || err} ⚠️`);
      }
    } else {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast(`Report exported as ${format}! 📄`);
    }
  };

  const renderLeft = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {/* Total Net Worth Hero Card */}
      <div style={{ ...s.heroCard(p.heroGreen, p.accent + "40"), textAlign: "center", marginBottom: 0 }}>
        <div style={s.muted}>Total Net Worth</div>
        <div style={{ ...s.big, color: p.accent, fontSize: "40px" }}>{formatLakhs(netWorthValue)}</div>
        {prevNetWorth > 0 ? (
          <div style={s.tag(netWorthValue >= prevNetWorth ? p.accent : p.accentWarm)}>
            {netWorthValue >= prevNetWorth ? "↑" : "↓"} ₹{Math.abs(netWorthValue - prevNetWorth).toLocaleString()} this month ({(((netWorthValue - prevNetWorth) / prevNetWorth) * 100).toFixed(1)}%)
          </div>
        ) : (
          <div style={s.tag(p.accent)}>✓ Initialized</div>
        )}
      </div>

      <div style={{ ...s.label, margin: "10px 0 0" }}>6-Month Growth</div>
      <div style={{ ...s.card, marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px", justifyContent: "space-between", padding: "10px 0" }}>
          {values.map((v, i) => (
            <div key={i} className="chart-bar-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: "5px", cursor: "pointer", position: "relative" }}>
              <div className="chart-tooltip">{formatLakhs(v)}</div>
              <div style={{
                height: `${Math.max(4, (v / maxVal) * 72)}px`,
                background: i === values.length - 1
                  ? `linear-gradient(180deg, ${p.accent}, ${p.accent}aa)`
                  : `linear-gradient(180deg, ${p.accent}80, ${p.accent}30)`,
                borderRadius: "6px 6px 0 0",
                width: "100%",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: i === values.length - 1 ? `0 4px 12px ${p.accent}40` : "none"
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.15)";
                  e.currentTarget.style.transform = "scaleY(1.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "none";
                  e.currentTarget.style.transform = "none";
                }}
              />
              <div style={{ fontSize: "9px", color: p.textMuted }}>{months[i]}</div>
            </div>
          ))}
        </div>
        <div style={{ ...s.muted, marginTop: "10px", textAlign: "center" }}>
          {isInitialUser ? (
            "Start logging transactions to build your net worth chart! 📈"
          ) : (
            <>
              Net worth grew{" "}
              <span style={{ color: values[0] > 0 && netWorthValue >= values[0] ? p.accent : p.accentWarm, fontWeight: 700 }}>
                {values[0] > 0 ? (netWorthValue >= values[0] ? "+" : "") + (((netWorthValue - values[0]) / values[0]) * 100).toFixed(0) + "%" : "dynamically"}
              </span>{" "}
              in 6 months
              <div style={{ fontSize: "10px", color: p.textMuted, marginTop: "4px" }}>* Projected growth trend based on current assets & liabilities</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderRight = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      <div style={{ ...s.label, margin: 0 }}>Breakdown</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {[
          { label: "Savings", value: formatLakhs(totalSavings), color: p.accent },
          { label: "Investments", value: formatLakhs(totalInvestments), color: p.accentBlue },
          { label: "Total Debt", value: formatLakhs(-totalDebts), color: p.accentWarm },
          { label: "Net Assets", value: formatLakhs(totalSavings + totalInvestments), color: p.accentGold },
        ].map((b) => (
          <div key={b.label} style={{ ...s.card, marginBottom: 0 }}>
            <div style={s.muted}>{b.label}</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: b.color, marginTop: "4px" }}>{b.value}</div>
          </div>
        ))}
      </div>

      {/* Export */}
      <div style={{ ...s.cardAlt, display: "flex", gap: "10px", alignItems: "center", marginTop: "10px", marginBottom: 0 }}>
        <Ic n="export" size={16} color={p.accentBlue} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: p.text }}>Export Report</div>
          <div style={s.muted}>Download report as TXT or CSV</div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["TXT", "CSV"].map(fmt => (
            <button key={fmt} onClick={() => exportReport(fmt)} style={{ background: p.accentBlue + "18", color: p.accentBlue, border: `1px solid ${p.accentBlue}40`, borderRadius: "8px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{fmt}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const showTwoColumns = width >= 768;

  return (
    <div>
      <div style={s.label}>Net Worth</div>
      {showTwoColumns ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", alignItems: "start", width: "100%" }}>
          {renderLeft()}
          {renderRight()}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {renderLeft()}
          {renderRight()}
        </div>
      )}
    </div>
  );
}

export default NetWorthScreen;
