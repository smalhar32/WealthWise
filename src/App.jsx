import React, { useState, useEffect, useRef } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

// Theme and Global Styles
import { darkP, lightP, ms } from "./theme/palettes";

// Component imports
import { Ic, LogoIcon } from "./components/Ic";
import { Bar } from "./components/Bar";
import { Modal } from "./components/Modal";
import { Input } from "./components/Input";
import { Toast } from "./components/Toast";
import { Confetti } from "./components/Confetti";

// Screen imports
import { HomeScreen } from "./screens/HomeScreen";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { SavingsScreen } from "./screens/SavingsScreen";
import { InvestmentsScreen } from "./screens/InvestmentsScreen";
import { GoalsScreen } from "./screens/GoalsScreen";
import { DebtsScreen } from "./screens/DebtsScreen";
import { NetWorthScreen } from "./screens/NetWorthScreen";
import { InvestLoansScreen } from "./screens/InvestLoansScreen";
import { SecurityScreen } from "./screens/SecurityScreen";
import { PinLockScreen } from "./screens/PinLockScreen";
import { MonthlyReportScreen } from "./screens/MonthlyReportScreen";

// Helpers imports
import { hashPin, formatTransactionTime, sortByDateDesc, calculateFDAccruedValue } from "./utils/helpers";
import { getStorageItem, setStorageItem, migrateFromLocalStorage, removeStorageItem } from "./utils/storage";
import { handleOAuthCallback, uploadBackup } from "./utils/gdrive";

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const sidebarItems = [
  { label: "Home", icon: "home", screen: "Home" },
  { label: "Expenses", icon: "card", screen: "Expenses" },
  { label: "Savings", icon: "save", screen: "Savings" },
  { label: "Invest & Loans", icon: "trend", screen: "InvestLoans" },
  { label: "Goals", icon: "target", screen: "Goals" },
  { label: "Net Worth", icon: "bar", screen: "Net Worth" },
  { label: "Monthly Report", icon: "sparkle", screen: "MonthlyReport" },
  { label: "Security", icon: "shield", screen: "Security" },
];

const navItems = [
  { label: "Home", icon: "home", screen: "Home" },
  { label: "Expenses", icon: "card", screen: "Expenses" },
  { label: "Savings", icon: "save", screen: "Savings" },
  { label: "Goals", icon: "target", screen: "Goals" },
  { label: "Invest & Loans", icon: "trend", screen: "InvestLoans" },
];

const screenMap = { Home: HomeScreen, Expenses: ExpensesScreen, Savings: SavingsScreen, Investments: InvestmentsScreen, Goals: GoalsScreen, Debts: DebtsScreen, "Net Worth": NetWorthScreen, InvestLoans: InvestLoansScreen, Security: SecurityScreen, MonthlyReport: MonthlyReportScreen };







// ─── ONBOARDING GUIDE ────────────────────────────────────────────────────────
function OnboardingGuide({ p, onFinish }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      emoji: "👋",
      title: "Welcome to WealthWise!",
      desc: "Your personal finance companion. Track spending, manage savings, stay on budget — all in one place.",
      color: "#00C896",
    },
    {
      emoji: "🏠",
      title: "Dashboard & Transactions",
      desc: "The Home screen shows your monthly budget at a glance. Tap the ＋ button to log any expense or income in seconds.",
      color: "#4D9EFF",
    },
    {
      emoji: "💰",
      title: "Savings Pots",
      desc: "Create Pots for different goals — emergency fund, vacation, gadgets. Stash money and watch it grow.",
      color: "#FFB830",
    },
    {
      emoji: "📈",
      title: "Investments & Debts",
      desc: "Track your mutual funds, stocks, and loans in the Invest & Loans tab. See your net worth update in real time.",
      color: "#FF6BD6",
    },
    {
      emoji: "🎯",
      title: "Goals",
      desc: "Set financial goals with a target amount and deadline. WealthWise tracks your progress and cheers you on!",
      color: "#FF6B6B",
    },
    {
      emoji: "🚀",
      title: "You're all set!",
      desc: "Head to Settings to enter your name and monthly salary so WealthWise can personalise your experience.",
      color: "#00C896",
    },
  ];

  const isDark = p.bg === "#0D0F18";
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 5000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: isDark ? "rgba(8,10,18,0.92)" : "rgba(230,233,255,0.92)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      padding: "24px",
      boxSizing: "border-box",
    }}>
      <style>{`
        @keyframes ob-in { from { opacity:0; transform:scale(0.94) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes ob-pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }
        .ob-card { animation: ob-in 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        .ob-emoji { animation: ob-pulse 2.4s ease-in-out infinite; display:inline-block; }
      `}</style>

      <div className="ob-card" key={step} style={{
        background: isDark ? "rgba(22,24,36,0.97)" : "rgba(255,255,255,0.97)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)"}`,
        borderRadius: "28px",
        padding: "36px 28px 28px",
        maxWidth: "360px",
        width: "100%",
        boxShadow: isDark ? "0 32px 64px rgba(0,0,0,0.6)" : "0 32px 64px rgba(100,110,200,0.15)",
        textAlign: "center",
        boxSizing: "border-box",
      }}>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "28px" }}>
          {steps.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? "22px" : "7px", height: "7px",
              borderRadius: "99px",
              background: i === step ? current.color : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"),
              transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
              cursor: "pointer",
            }} />
          ))}
        </div>

        {/* Emoji */}
        <div className="ob-emoji" style={{ fontSize: "56px", marginBottom: "20px", lineHeight: 1 }}>
          {current.emoji}
        </div>

        {/* Accent line */}
        <div style={{ width: "36px", height: "4px", borderRadius: "99px", background: current.color, margin: "0 auto 20px" }} />

        {/* Title */}
        <div style={{ fontSize: "20px", fontWeight: 800, color: p.text, marginBottom: "12px", letterSpacing: "-0.3px" }}>
          {current.title}
        </div>

        {/* Description */}
        <div style={{ fontSize: "14px", color: p.textMuted, lineHeight: "1.65", marginBottom: "32px" }}>
          {current.desc}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: "13px", borderRadius: "14px",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              background: "transparent", color: p.textMuted,
              fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              Back
            </button>
          )}
          <button onClick={() => isLast ? onFinish() : setStep(s => s + 1)} style={{
            flex: 2, padding: "13px", borderRadius: "14px",
            border: "none",
            background: current.color,
            color: "#fff",
            fontSize: "14px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            boxShadow: `0 6px 18px ${current.color}45`,
            transition: "all 0.2s ease",
          }}>
            {isLast ? "Get Started 🚀" : "Next →"}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={onFinish} style={{
            background: "none", border: "none", color: p.textMuted,
            fontSize: "12px", cursor: "pointer", marginTop: "14px",
            fontFamily: "inherit", padding: "4px 8px",
          }}>
            Skip guide
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [gToken, setGToken] = useState(null);

  const [monthlySalaries, setMonthlySalaries] = useState({});
  const [active, setActive] = useState(() => {
    const saved = sessionStorage.getItem("ww_active") || "Home";
    if (saved === "Insights" || saved === "Investments" || saved === "Debts") {
      return "InvestLoans";
    }
    return saved;
  });
  const [dashboardMode, setDashboardMode] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const toastTimer = useRef(null);

  // Responsive width detection
  const [width, setWidth] = useState(() => typeof window !== "undefined" ? window.innerWidth : 900);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const lastScrollY = useRef(0);

  const handleMobileScroll = (e) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
      setShowBottomNav(false);
    } else if (currentScrollY < lastScrollY.current) {
      setShowBottomNav(true);
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const contentWidth = (() => {
    if (isMobile) {
      return Math.min(width - 32, 480);
    }
    const sidebarWidth = isTablet ? 70 : 240;
    const paddingWidth = 96; // 48px padding on each side
    const availableWidth = width - sidebarWidth - paddingWidth;
    return Math.min(availableWidth, 1100);
  })();

  // GLOBAL LIFTED STATES
  const [userName, setUserName] = useState("");
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [biometric, setBiometric] = useState(false);
  const [backup, setBackup] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hashedPin, setHashedPin] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswerHash, setSecurityAnswerHash] = useState("");
  const [categories, setCategories] = useState([]);
  const [txns, setTxns] = useState([]);
  const [pots, setPots] = useState([]);
  const [inv, setInv] = useState([]);
  const [goals, setGoals] = useState([]);
  const [debts, setDebts] = useState([]);
  const [streak, setStreak] = useState(0);
  const [prevNetWorth, setPrevNetWorth] = useState(0);
  const [savingsHistory, setSavingsHistory] = useState([]);
  const [investmentsHistory, setInvestmentsHistory] = useState([]);
  const [loansHistory, setLoansHistory] = useState([]);

  const finishOnboarding = () => {
    setStorageItem("ww_onboarded", "1");
    setShowOnboarding(false);
  };

  const handleResetPin = async () => {
    await removeStorageItem("ww_pin");
    await removeStorageItem("ww_securityQuestion");
    await removeStorageItem("ww_securityAnswerHash");
    await setStorageItem("ww_biometric", false);
    setBiometric(false);
    setHashedPin("");
    setLocked(false);
  };

  const getSalaryForMonth = (year, month) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    if (monthlySalaries[key] !== undefined) {
      return monthlySalaries[key];
    }
    return monthlySalary;
  };

  const updateMonthlySalary = (val) => {
    setMonthlySalary(val);
    const key = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    setMonthlySalaries(prev => ({
      ...prev,
      [key]: val
    }));
  };

  useEffect(() => {
    const initStorage = async () => {
      try {
        // 1. Migrate legacy data if necessary
        await migrateFromLocalStorage();

        // 2. Load basic settings/profiles
        const storedDashboardMode = await getStorageItem("ww_dashboardMode", "true");
        setDashboardMode(JSON.parse(storedDashboardMode));

        const storedOnboarded = await getStorageItem("ww_onboarded", null);
        setShowOnboarding(!storedOnboarded);

        const storedIsDark = await getStorageItem("ww_isDark", "true");
        setIsDark(JSON.parse(storedIsDark));

        const storedUserName = await getStorageItem("ww_userName", "");
        setUserName(storedUserName);

        const storedSalary = await getStorageItem("ww_monthlySalary", "0");
        setMonthlySalary(parseFloat(storedSalary));

        const storedPin = await getStorageItem("ww_pin", "");
        if (storedPin) {
          if (storedPin.startsWith("[")) {
            try {
              const arr = JSON.parse(storedPin);
              if (Array.isArray(arr) && arr.every(d => d !== "") && arr.join("").length === 4) {
                const pinStr = arr.join("");
                const hashed = hashPin(pinStr);
                await setStorageItem("ww_pin", hashed);
                setHashedPin(hashed);
                setPin(["", "", "", ""]);
                setLocked(true);
              } else {
                setPin(["", "", "", ""]);
                setLocked(false);
              }
            } catch (e) {
              setPin(["", "", "", ""]);
              setLocked(false);
            }
          } else if (storedPin.startsWith("hash_")) {
            setHashedPin(storedPin);
            setPin(["", "", "", ""]);
            setLocked(true);
          } else {
            setPin(["", "", "", ""]);
            setLocked(false);
          }
        } else {
          setPin(["", "", "", ""]);
          setLocked(false);
        }

        const storedQuestion = await getStorageItem("ww_securityQuestion", "");
        setSecurityQuestion(storedQuestion);

        const storedAnswerHash = await getStorageItem("ww_securityAnswerHash", "");
        setSecurityAnswerHash(storedAnswerHash);

        const storedBiometric = await getStorageItem("ww_biometric", "false");
        setBiometric(JSON.parse(storedBiometric));

        const storedBackup = await getStorageItem("ww_backup", "false");
        setBackup(JSON.parse(storedBackup));

        // 3. Load transaction & collection data
        const storedTxns = await getStorageItem("ww_txns", "[]");
        const parsedTxns = JSON.parse(storedTxns);
        
        let changedTxns = false;
        const updatedTxns = parsedTxns.map(t => {
          let currentCat = t.cat;
          let nameStr = t.name || "";
          if (currentCat === "Food & Grocery") {
            currentCat = "Food & Dining";
            changedTxns = true;
          }
          if (currentCat === "Investment") {
            currentCat = "Investments";
            changedTxns = true;
          }
          if (currentCat === "Bills & Utilities" && (nameStr.startsWith("EMI Repayment:") || nameStr.startsWith("Repayment:"))) {
            currentCat = "EMI & Loans";
            changedTxns = true;
          }
          if (currentCat !== t.cat) {
            return { ...t, cat: currentCat };
          }
          return t;
        });
        if (changedTxns) {
          await setStorageItem("ww_txns", updatedTxns);
        }
        setTxns(updatedTxns);

        const storedCategories = await getStorageItem("ww_categories", null);
        let parsedCategories = storedCategories ? JSON.parse(storedCategories) : null;
        
        if (!parsedCategories) {
          parsedCategories = [
            { name: "Food & Dining", emoji: "🍔", spent: 0, budget: 0, color: darkP.accentWarm, recurring: false, type: "need" },
            { name: "Grocery", emoji: "🛒", spent: 0, budget: 0, color: darkP.accent, recurring: false, type: "need" },
            { name: "Transport", emoji: "🚗", spent: 0, budget: 0, color: darkP.accentBlue, recurring: false, type: "need" },
            { name: "Shopping", emoji: "🛍️", spent: 0, budget: 0, color: darkP.accentPink, recurring: false, type: "want" },
            { name: "Bills & Utilities", emoji: "💡", spent: 0, budget: 0, color: darkP.accentGold, recurring: true, type: "need" },
            { name: "EMI & Loans", emoji: "💳", spent: 0, budget: 0, color: darkP.accentWarm, recurring: true, type: "need" },
            { name: "Subscriptions", emoji: "🔄", spent: 0, budget: 0, color: darkP.accentBlue, recurring: true, type: "want" },
            { name: "Entertainment", emoji: "🎬", spent: 0, budget: 0, color: darkP.accent, recurring: false, type: "want" },
            { name: "Investments", emoji: "📈", spent: 0, budget: 0, color: darkP.accentBlue, recurring: false, type: "want" }
          ];
        }

        const curMonth = new Date().getMonth();
        const curYear = new Date().getFullYear();
        const getSpent = (catName) => {
          return updatedTxns
            .filter(t => t.cat === catName && t.amount < 0 && (() => {
              const d = new Date(t.date);
              return d.getMonth() === curMonth && d.getFullYear() === curYear;
            })())
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        };

        let changedCats = false;
        let updatedCategories = parsedCategories.map(c => {
          if (c.name === "Food & Grocery") {
            c.name = "Food & Dining";
            changedCats = true;
          }
          if (c.type) return c;
          const needsList = ["bills & utilities", "transport", "food & dining", "food", "rent", "groceries", "grocery", "emi & loans"];
          const isNeed = needsList.some(n => c.name.toLowerCase().includes(n));
          return { ...c, type: isNeed ? "need" : "want" };
        });

        const hasGrocery = updatedCategories.some(c => c.name.toLowerCase() === "grocery");
        if (!hasGrocery) {
          const foodIndex = updatedCategories.findIndex(c => c.name.toLowerCase().includes("food"));
          const groceryCat = { name: "Grocery", emoji: "🛒", spent: 0, budget: 0, color: darkP.accent, recurring: false, type: "need" };
          if (foodIndex !== -1) {
            updatedCategories.splice(foodIndex + 1, 0, groceryCat);
          } else {
            updatedCategories.push(groceryCat);
          }
          changedCats = true;
        }

        const hasEmiLoans = updatedCategories.some(c => c.name.toLowerCase() === "emi & loans");
        if (!hasEmiLoans) {
          updatedCategories.push({ name: "EMI & Loans", emoji: "💳", spent: 0, budget: 0, color: darkP.accentWarm, recurring: true, type: "need" });
          changedCats = true;
        }

        const hasInvestments = updatedCategories.some(c => c.name.toLowerCase() === "investments");
        if (!hasInvestments) {
          updatedCategories.push({ name: "Investments", emoji: "📈", spent: 0, budget: 0, color: darkP.accentBlue, recurring: false, type: "want" });
          changedCats = true;
        }

        updatedCategories = updatedCategories.map(c => {
          const newSpent = getSpent(c.name);
          if (c.spent !== newSpent) {
            changedCats = true;
          }
          return { ...c, spent: newSpent };
        });

        if (changedCats) {
          await setStorageItem("ww_categories", updatedCategories);
        }
        setCategories(updatedCategories);

        const storedPots = await getStorageItem("ww_pots", "[]");
        const parsedPots = JSON.parse(storedPots).map(pt => ({
          name: pt.name || "Unnamed Pot",
          amount: typeof pt.amount === 'number' ? pt.amount : 0,
          color: pt.color || darkP.accent,
          rate: pt.rate || "Savings A/c"
        }));
        setPots(parsedPots);

        const storedInv = await getStorageItem("ww_inv", "[]");
        const parsedInv = JSON.parse(storedInv);
        let changedInv = false;
        const updatedInv = parsedInv.map(item => {
          let currentVal = typeof item.current === 'number' ? item.current : 0;
          if (item.type === "FD" && item.startDate && item.tenure && item.rate !== undefined) {
            currentVal = calculateFDAccruedValue(
              item.invested || 0,
              item.rate,
              item.startDate,
              item.tenure,
              item.compounding || "Quarterly"
            );
            changedInv = true;
          }
          return {
            name: item.name || "Unnamed Investment",
            type: item.type || "Mutual Fund",
            invested: typeof item.invested === 'number' ? item.invested : 0,
            current: currentVal,
            rate: !isNaN(parseFloat(item.rate)) ? parseFloat(item.rate) : 0,
            color: item.color || darkP.accent,
            startDate: item.startDate || null,
            tenure: item.tenure ? parseInt(item.tenure) : null,
            compounding: item.compounding || null,
            shares: item.shares !== undefined ? item.shares : 1,
            buyPrice: item.buyPrice !== undefined ? item.buyPrice : (item.invested || 0),
            currentPrice: item.currentPrice !== undefined ? item.currentPrice : currentVal
          };
        });
        if (changedInv) {
          await setStorageItem("ww_inv", updatedInv);
        }
        setInv(updatedInv);

        const storedGoals = await getStorageItem("ww_goals", "[]");
        setGoals(JSON.parse(storedGoals));

        const storedDebts = await getStorageItem("ww_debts", "[]");
        const parsedDebts = JSON.parse(storedDebts).map(d => ({
          name: d.name || "Unnamed Loan",
          emi: typeof d.emi === 'number' ? d.emi : (typeof d.amount === 'number' ? Math.round(d.amount / 12) : 0),
          total: typeof d.total === 'number' ? d.total : (typeof d.amount === 'number' ? d.amount : 0),
          remaining: typeof d.remaining === 'number' ? d.remaining : (typeof d.amount === 'number' ? d.amount : 0),
          months: typeof d.months === 'number' ? d.months : 12,
          color: d.color || darkP.accentWarm,
        }));
        setDebts(parsedDebts);

        const storedStreak = await getStorageItem("ww_streak", "0");
        setStreak(parseInt(storedStreak, 10));

        const storedPrevNetWorth = await getStorageItem("ww_prevNetWorth", "0");
        setPrevNetWorth(parseFloat(storedPrevNetWorth));

        const storedSavingsHistory = await getStorageItem("ww_savingsHistory", null);
        let parsedSavingsHistory = storedSavingsHistory ? JSON.parse(storedSavingsHistory) : null;
        if (!parsedSavingsHistory) {
          if (parsedPots.length > 0) {
            parsedSavingsHistory = parsedPots.map((pt, i) => ({
              id: `init_${i}_${Date.now()}`,
              date: new Date(Date.now() - (parsedPots.length - i) * 24 * 60 * 60 * 1000).toISOString(),
              type: "deposit",
              desc: `Initial Deposit: ${pt.name} (${pt.rate || "Local"})`,
              amount: pt.amount
            }));
            await setStorageItem("ww_savingsHistory", parsedSavingsHistory);
          } else {
            parsedSavingsHistory = [];
          }
        }
        setSavingsHistory(parsedSavingsHistory);

        const storedInvestmentsHistory = await getStorageItem("ww_investmentsHistory", null);
        let parsedInvestmentsHistory = storedInvestmentsHistory ? JSON.parse(storedInvestmentsHistory) : null;
        if (!parsedInvestmentsHistory) {
          if (updatedInv.length > 0) {
            parsedInvestmentsHistory = updatedInv.map((item, i) => ({
              id: `init_inv_${i}_${Date.now()}`,
              date: new Date(Date.now() - (updatedInv.length - i) * 24 * 60 * 60 * 1000).toISOString(),
              type: "buy",
              desc: `Initial Purchase: ${item.name} (${item.type})`,
              amount: item.invested
            }));
            await setStorageItem("ww_investmentsHistory", parsedInvestmentsHistory);
          } else {
            parsedInvestmentsHistory = [];
          }
        }
        setInvestmentsHistory(parsedInvestmentsHistory);

        const storedLoansHistory = await getStorageItem("ww_loansHistory", null);
        let parsedLoansHistory = storedLoansHistory ? JSON.parse(storedLoansHistory) : null;
        if (!parsedLoansHistory) {
          if (parsedDebts.length > 0) {
            parsedLoansHistory = parsedDebts.map((d, i) => ({
              id: `init_debt_${i}_${Date.now()}`,
              date: new Date(Date.now() - (parsedDebts.length - i) * 24 * 60 * 60 * 1000).toISOString(),
              type: "disbursement",
              desc: `Loan Opened: ${d.name}`,
              amount: d.total
            }));
            await setStorageItem("ww_loansHistory", parsedLoansHistory);
          } else {
            parsedLoansHistory = [];
          }
        }
        setLoansHistory(parsedLoansHistory);

        const storedSalaries = await getStorageItem("ww_monthlySalaries", "{}");
        setMonthlySalaries(JSON.parse(storedSalaries));

        const callbackData = handleOAuthCallback();
        if (callbackData) {
          await setStorageItem("ww_gdrive_token", callbackData.accessToken);
          await setStorageItem("ww_gdrive_token_expiry", callbackData.expiryTime.toString());
          setGToken(callbackData.accessToken);
          toast("Connected to Google Drive! ☁️");
        } else {
          const storedToken = await getStorageItem("ww_gdrive_token", null);
          const storedExpiry = await getStorageItem("ww_gdrive_token_expiry", "0");
          if (storedToken && Date.now() < parseInt(storedExpiry, 10)) {
            setGToken(storedToken);
          }
        }
      } catch (err) {
        console.error("Storage initialization failed:", err);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }
    };

    initStorage();
  }, []);

  useEffect(() => {
    const pinStr = pin.join("").trim();
    if (pinStr.length === 4 && !isLoading) {
      const hashed = hashPin(pinStr);
      setStorageItem("ww_pin", hashed);
      setHashedPin(hashed);
      setLocked(true);
    }
  }, [pin, isLoading]);

  const logInvestmentTransaction = (type, desc, amount) => {
    setInvestmentsHistory(prev => [{
      id: (Date.now() + Math.random()).toString(),
      date: new Date().toISOString(),
      type,
      desc,
      amount
    }, ...prev]);
  };

  const logLoanTransaction = (type, desc, amount) => {
    setLoansHistory(prev => [{
      id: (Date.now() + Math.random()).toString(),
      date: new Date().toISOString(),
      type,
      desc,
      amount
    }, ...prev]);
  };

  // No sample data — app starts clean

  const logSavingsTransaction = (type, desc, amount) => {
    setSavingsHistory(prev => [{
      id: (Date.now() + Math.random()).toString(),
      date: new Date().toISOString(),
      type,
      desc,
      amount
    }, ...prev]);
  };

  // Save states to persistent storage
  useEffect(() => { if (!isLoading) sessionStorage.setItem("ww_active", active); }, [active, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_isDark", isDark); }, [isDark, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_userName", userName); }, [userName, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_monthlySalary", monthlySalary); }, [monthlySalary, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_categories", categories); }, [categories, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_txns", txns); }, [txns, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_monthlySalaries", monthlySalaries); }, [monthlySalaries, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_pots", pots); }, [pots, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_inv", inv); }, [inv, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_goals", goals); }, [goals, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_debts", debts); }, [debts, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_biometric", biometric); }, [biometric, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_backup", backup); }, [backup, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_streak", streak); }, [streak, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_prevNetWorth", prevNetWorth); }, [prevNetWorth, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_savingsHistory", savingsHistory); }, [savingsHistory, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_investmentsHistory", investmentsHistory); }, [investmentsHistory, isLoading]);
  useEffect(() => { if (!isLoading) setStorageItem("ww_loansHistory", loansHistory); }, [loansHistory, isLoading]);

  const toast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 2500);
  };

  // Google Drive background auto-backup
  useEffect(() => {
    if (isLoading || !gToken) return;
    
    const triggerAutoBackup = async () => {
      const isAuto = await getStorageItem("ww_gdrive_autobackup", "false");
      if (isAuto === "true") {
        try {
          const data = {
            ww_monthlySalaries: monthlySalaries,
            ww_dashboardMode: dashboardMode,
            ww_onboarded: "1",
            ww_isDark: isDark,
            ww_userName: userName,
            ww_monthlySalary: monthlySalary,
            ww_pin: hashedPin,
            ww_biometric: biometric,
            ww_backup: backup,
            ww_txns: txns,
            ww_categories: categories,
            ww_pots: pots,
            ww_inv: inv,
            ww_goals: goals,
            ww_debts: debts,
            ww_streak: streak,
            ww_prevNetWorth: prevNetWorth,
            ww_savingsHistory: savingsHistory,
            ww_investmentsHistory: investmentsHistory,
            ww_loansHistory: loansHistory,
            ww_securityQuestion,
            ww_securityAnswerHash
          };
          await uploadBackup(gToken, data);
          const nowStr = new Date().toLocaleString();
          await setStorageItem("ww_gdrive_last_sync", nowStr);
        } catch (e) {
          console.warn("Auto-backup background upload failed:", e);
        }
      }
    };

    const timer = setTimeout(triggerAutoBackup, 2000);
    return () => clearTimeout(timer);
  }, [
    txns, categories, pots, inv, goals, debts, streak, prevNetWorth,
    savingsHistory, investmentsHistory, loansHistory, userName, monthlySalary,
    monthlySalaries, hashedPin, biometric, backup, isDark, gToken, isLoading
  ]);

  const p = isDark ? darkP : lightP;
  const s = ms(p);
  const Screen = screenMap[active];

  const addExpense = (amount, catName, title, billImage, isIncome = false, customDate = null) => {
    const cat = categories.find(c => c.name === catName);
    const emoji = isIncome ? "💰" : (cat ? cat.emoji : "💸");
    const txnAmount = isIncome ? amount : -amount;

    setTxns(t => [{
      name: title && title.trim() !== "" ? title : (isIncome ? "Income" : catName),
      cat: isIncome ? "Income" : catName,
      amount: txnAmount,
      time: "Just now",
      date: customDate || new Date().toISOString(),
      emoji,
      billImage: billImage || null
    }, ...t]);

    if (!isIncome) {
      setCategories(prev => prev.map(c => c.name === catName ? { ...c, spent: c.spent + amount } : c));
    }
  };

  // ─── SHARED ADD EXPENSE MODAL STATE ──────────────────────────────────────────
  const [gShowAdd, setGShowAdd] = useState(false);
  const [gAmount, setGAmount] = useState("");
  const [gCategory, setGCategory] = useState(() => categories[0]?.name || "Food & Dining");
  const [gTitle, setGTitle] = useState("");
  const [gBillImage, setGBillImage] = useState(null);
  const [gTxnType, setGTxnType] = useState("expense");
  const [gCustomDate, setGCustomDate] = useState(null); // null = use today

  const openAddExpense = (dateHint = null) => {
    setGCustomDate(dateHint || null);
    setGAmount("");
    setGTitle("");
    setGBillImage(null);
    setGTxnType("expense");
    setGCategory(categories[0]?.name || "Food & Dining");
    setGShowAdd(true);
  };

  const handleGAddExpense = () => {
    if (!gAmount || isNaN(gAmount) || parseFloat(gAmount) <= 0) {
      toast("Please enter a valid amount! ⚠️");
      return;
    }
    const activeCat = categories.some(c => c.name === gCategory) ? gCategory : (categories[0]?.name || "");
    let txnDate = null;
    if (gCustomDate) {
      const now = new Date();
      const d = new Date(gCustomDate);
      txnDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
    }
    addExpense(parseFloat(gAmount), activeCat, gTitle, gBillImage, false, txnDate);
    setGShowAdd(false);
    toast("Expense logged! 💸");
  };

  const handleGImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setGBillImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const confetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const selectScreen = (screenName) => {
    setActive(screenName);
    setShowDrawer(false);
  };

  // Auto-reset category spent values at the beginning of a new month
  useEffect(() => {
    const handleResetMonth = async () => {
      const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const lastResetMonth = await getStorageItem("ww_lastResetMonth", null);
      if (lastResetMonth && lastResetMonth !== currentMonthStr) {
        setCategories(prev => prev.map(c => ({ ...c, spent: 0 })));
        toast("Welcome to a new month! Your category budgets have been reset. 📅");
      }
      await setStorageItem("ww_lastResetMonth", currentMonthStr);
    };
    if (!isLoading) {
      handleResetMonth();
    }
  }, [isLoading]);

  // Handle native back button gesture/button on Android
  useEffect(() => {
    let lastBackButtonPress = 0;

    const backButtonHandler = async () => {
      if (active !== "Home") {
        setActive("Home");
      } else {
        const now = Date.now();
        if (now - lastBackButtonPress < 2000) {
          CapApp.exitApp();
        } else {
          lastBackButtonPress = now;
          toast("Press back again to exit 📱");
        }
      }
    };

    let listener;
    const setupListener = async () => {
      if (Capacitor.isNativePlatform()) {
        listener = await CapApp.addListener('backButton', backButtonHandler);
      }
    };

    setupListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [active]);

  const isCollapsed = isTablet && !isDrawer;

  const renderSidebar = (isDrawer = false) => (
    <div style={{
      width: isDrawer ? "260px" : (isTablet ? "70px" : "240px"),
      background: p.navBg,
      borderRight: isDrawer ? "none" : `1px solid ${p.border}`,
      padding: isDrawer ? "24px 16px" : (isTablet ? "24px 8px" : "24px 16px"),
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      height: "100%",
      boxSizing: "border-box",
      transition: "width 0.25s ease, padding 0.25s ease"
    }}>
      <div style={{ display: "flex", justifyContent: isCollapsed ? "center" : "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "18px", fontWeight: 900, color: p.text, display: "flex", alignItems: "center", gap: "10px" }}>
          <LogoIcon size={28} />
          {!isCollapsed && (
            <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.1" }}>
              <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.5px" }}>WealthWise</span>
              <span style={{ fontSize: "7.5px", fontWeight: 700, letterSpacing: "0.8px", color: p.accent, textTransform: "uppercase" }}>Manage Your Money Wisely</span>
            </div>
          )}
        </div>
        {isDrawer && (
          <button onClick={() => setShowDrawer(false)} style={{ background: p.cardAlt, border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Ic n="close" size={16} color={p.textMuted} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto", alignItems: isCollapsed ? "center" : "stretch" }}>
        {sidebarItems.map(item => {
          const isActive = active === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => selectScreen(item.screen)}
              className={isActive ? "sidebar-btn active-sidebar-btn" : "sidebar-btn"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? "0" : "12px",
                background: isActive ? p.accent : "transparent",
                color: isActive ? "#fff" : p.textMuted,
                border: "none",
                borderRadius: "12px",
                padding: isCollapsed ? "12px" : "12px 14px",
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                outline: "none",
                width: isCollapsed ? "44px" : "auto",
                height: isCollapsed ? "44px" : "auto",
                boxSizing: "border-box"
              }}
              title={isCollapsed ? item.label : ""}
            >
              <Ic n={item.icon} size={18} color={isActive ? "#fff" : p.textMuted} />
              {!isCollapsed && item.label}
            </button>
          );
        })}
      </div>

      {!isDrawer && (
        <button
          onClick={() => setDashboardMode(!dashboardMode)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCollapsed ? "0" : "8px",
            background: p.cardAlt,
            border: `1px solid ${p.border}`,
            borderRadius: "14px",
            padding: isCollapsed ? "12px" : "12px",
            color: p.text,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            justifyContent: "center",
            outline: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            transition: "all 0.2s",
            width: isCollapsed ? "44px" : "auto",
            height: isCollapsed ? "44px" : "auto"
          }}
          className="ww-btn-glow"
          title={isCollapsed ? (dashboardMode ? "Show Emulator" : "Show Dashboard") : ""}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          {!isCollapsed && (dashboardMode ? "Show Emulator" : "Show Dashboard")}
        </button>
      )}

      <button
        onClick={() => setIsDark(!isDark)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: isCollapsed ? "0" : "8px",
          background: p.card,
          border: `1px solid ${p.border}`,
          borderRadius: "14px",
          padding: isCollapsed ? "12px" : "12px",
          color: p.text,
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          justifyContent: "center",
          outline: "none",
          width: isCollapsed ? "44px" : "auto",
          height: isCollapsed ? "44px" : "auto"
        }}
        title={isCollapsed ? (isDark ? "Light Mode" : "Dark Mode") : ""}
      >
        <Ic n={isDark ? "sun" : "moon"} size={16} color={isDark ? p.accentGold : p.accentBlue} />
        {!isCollapsed && (isDark ? "Light Mode" : "Dark Mode")}
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "#0D0F18",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        gap: "24px"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          animation: "pulse 2s infinite ease-in-out"
        }}>
          <span style={{ fontSize: "42px" }}>🪙</span>
          <span style={{
            fontSize: "26px",
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.5px",
            fontFamily: "'Sora', sans-serif"
          }}>Wealth<span style={{ color: "#00C896" }}>Wise</span></span>
        </div>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.08)",
          borderTopColor: "#00C896",
          animation: "spin 1s linear infinite"
        }} />
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 0.8; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <Confetti show={showConfetti} />
      <Toast msg={toastMsg} show={showToast} accent={p.accent} />
      {showOnboarding && <OnboardingGuide p={p} onFinish={finishOnboarding} />}

      {/* ─── SHARED ADD EXPENSE MODAL ─────────────────────────────── */}
      <Modal open={gShowAdd} onClose={() => setGShowAdd(false)} title="Log Expense" p={p}>
        {gCustomDate && (
          <div style={{ ...s.cardAlt, fontSize: "11px", color: p.accentBlue, fontWeight: 700, marginBottom: "12px", textAlign: "center" }}>
            📅 Logging for {new Date(gCustomDate).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
        <Input label="Expense Title (optional)" value={gTitle} onChange={setGTitle} placeholder="e.g. Starbucks, Groceries" p={p} />
        <Input label="Amount (₹)" value={gAmount} onChange={setGAmount} type="number" placeholder="e.g. 350" p={p} />
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Category</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {categories.map(c => (
              <button key={c.name} onClick={() => setGCategory(c.name)} style={{ background: gCategory === c.name ? p.accent : p.cardAlt, color: gCategory === c.name ? "#fff" : p.textMuted, border: `1px solid ${gCategory === c.name ? p.accent : p.border}`, borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{c.name}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Upload Bill (optional)</div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label style={{ background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", padding: "10px 14px", color: p.text, fontSize: "13px", cursor: "pointer", fontFamily: "inherit", flex: 1, textAlign: "center" }}>
              {gBillImage ? "📸 Bill Selected" : "📁 Choose File / Photo"}
              <input type="file" accept="image/*" onChange={handleGImageChange} style={{ display: "none" }} />
            </label>
            {gBillImage && (
              <button onClick={() => setGBillImage(null)} style={{ background: p.accentWarm + "22", color: p.accentWarm, border: `1px solid ${p.accentWarm}40`, borderRadius: "12px", padding: "10px 14px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
            )}
          </div>
        </div>
        <button style={s.addBtn(p.accent)} onClick={handleGAddExpense}>Save Expense</button>
      </Modal>


      <style>{`
        .sidebar-btn {
          transition: all 0.2s ease;
        }
        .sidebar-btn:hover {
          background: ${p.accent}18;
          color: ${p.accent};
        }
        .active-sidebar-btn {
          background: ${p.accent} !important;
          color: #fff !important;
        }
        .active-sidebar-btn:hover {
          background: ${p.accent} !important;
          color: #fff !important;
        }
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `}</style>

      <div style={{
        display: "flex",
        height: isMobile ? "100dvh" : "auto",
        minHeight: "100vh",
        background: p.outerBg,
        color: p.text,
        fontFamily: "'Sora', sans-serif",
        transition: "background 0.3s",
        flexDirection: isMobile ? "column" : "row",
        overflow: isMobile ? "hidden" : "visible"
      }}>

        {!isMobile && renderSidebar(false)}

        {/* Mobile Header with Safe Area Notch padding */}
        {isMobile && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px 14px",
            background: p.navBg,
            borderBottom: `1px solid ${p.border}`,
            zIndex: 10,
            flexShrink: 0
          }}>
            <button
              onClick={() => setShowDrawer(true)}
              style={{ background: "none", border: "none", color: p.text, cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <LogoIcon size={24} />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.1", textAlign: "left" }}>
                <span style={{ fontSize: "14px", fontWeight: 800, color: p.text }}>WealthWise</span>
                <span style={{ fontSize: "6.5px", fontWeight: 700, letterSpacing: "0.5px", color: p.accent, textTransform: "uppercase" }}>Manage Your Money Wisely</span>
              </div>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              style={{ background: "none", border: "none", color: p.text, cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
            >
              <Ic n={isDark ? "sun" : "moon"} size={18} color={isDark ? p.accentGold : p.accentBlue} />
            </button>
          </div>
        )}

        {isMobile && showDrawer && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex" }}>
            <div style={{ animation: "slideInLeft 0.2s ease-out", height: "100%", display: "flex" }}>
              <style>{`@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
              {renderSidebar(true)}
            </div>
            <div style={{ flex: 1 }} onClick={() => setShowDrawer(false)} />
          </div>
        )}

        {/* Mobile View Layout (Full screen adaptation with max width center) */}
        {isMobile ? (
          <div
            onScroll={handleMobileScroll}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 16px calc(88px + env(safe-area-inset-bottom))",
              background: p.bg,
              boxSizing: "border-box",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div style={{ width: "100%", maxWidth: "480px", boxSizing: "border-box" }}>
              <Screen
                width={contentWidth}
                isMobile={isMobile}
                isTablet={isTablet}
                isDesktop={isDesktop}
                p={p}
                s={s}
                toast={toast}
                confetti={confetti}
                categories={categories}
                setCategories={setCategories}
                txns={txns}
                setTxns={setTxns}
                pots={pots}
                setPots={setPots}
                inv={inv}
                setInv={setInv}
                goals={goals}
                setGoals={setGoals}
                debts={debts}
                setDebts={setDebts}
                pin={pin}
                setPin={setPin}
                biometric={biometric}
                setBiometric={setBiometric}
                backup={backup}
                setBackup={setBackup}
                addExpense={addExpense}
                openAddExpense={openAddExpense}
                userName={userName}
                setUserName={setUserName}
                monthlySalary={monthlySalary}
                setMonthlySalary={updateMonthlySalary}
                  getSalaryForMonth={getSalaryForMonth}
                streak={streak}
                setStreak={setStreak}
                prevNetWorth={prevNetWorth}
                setPrevNetWorth={setPrevNetWorth}
                savingsHistory={savingsHistory}
                logSavingsTransaction={logSavingsTransaction}
                investmentsHistory={investmentsHistory}
                logInvestmentTransaction={logInvestmentTransaction}
                loansHistory={loansHistory}
                logLoanTransaction={logLoanTransaction}
                hashedPin={hashedPin}
                setHashedPin={setHashedPin}
                securityQuestion={securityQuestion}
                setSecurityQuestion={setSecurityQuestion}
                securityAnswerHash={securityAnswerHash}
                setSecurityAnswerHash={setSecurityAnswerHash}
                gToken={gToken}
                setGToken={setGToken}
                isLoading={isLoading}
              />
            </div>

            {/* Mobile Fixed Bottom Nav with Hide/Show scroll animation & safe-area bar alignment */}
            <div style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              background: p.navBg,
              borderTop: `1px solid ${p.border}`,
              display: "flex",
              justifyContent: "center",
              boxShadow: "0 -4px 16px rgba(0,0,0,0.1)",
              transform: showBottomNav ? "translateY(0)" : "translateY(100%)",
              opacity: showBottomNav ? 1 : 0,
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s"
            }}>
              <div style={{ width: "100%", maxWidth: "480px", display: "flex", justifyContent: "space-around", padding: "10px 0 calc(18px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
                {navItems.map(n => (
                  <button key={n.label} style={s.navBtn(active === n.screen, p.accent)} onClick={() => setActive(n.screen)}>
                    <Ic n={n.icon} size={21} color={active === n.screen ? p.accent : p.textMuted} />
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : dashboardMode ? (
          /* Desktop Dashboard Layout (Full Screen) */
          <div style={{
            flex: 1,
            padding: "40px 48px",
            boxSizing: "border-box",
            height: "100vh",
            overflowY: "auto",
            background: p.bg
          }}>
            <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
              <div style={{ ...s.row, marginBottom: "32px", borderBottom: `1px solid ${p.border}`, paddingBottom: "20px" }}>
                <div>
                  <h1 style={{ fontSize: "28px", fontWeight: 800, color: p.text, margin: 0, letterSpacing: "-0.5px", fontFamily: "inherit" }}>
                    {active}
                  </h1>
                  <p style={{ ...s.muted, marginTop: "4px", fontSize: "13px" }}>
                    WealthWise Financial Intelligence Suite
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {userName && (
                    <div style={{ ...s.tag(p.accent), display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "10px", fontWeight: 700 }}>
                      👤 {userName}
                    </div>
                  )}
                  <div style={{ ...s.tag(p.accentBlue), padding: "6px 12px", borderRadius: "10px", fontWeight: 700 }}>
                    ₹{monthlySalary > 0 ? `${monthlySalary.toLocaleString()}/mo` : "Setup Profile"}
                  </div>
                </div>
              </div>

              <div className="animate-fade-in">
                <Screen
                  width={contentWidth}
                  isMobile={isMobile}
                  isTablet={isTablet}
                  isDesktop={isDesktop}
                  p={p}
                  s={s}
                  toast={toast}
                  confetti={confetti}
                  categories={categories}
                  setCategories={setCategories}
                  txns={txns}
                  setTxns={setTxns}
                  pots={pots}
                  setPots={setPots}
                  inv={inv}
                  setInv={setInv}
                  goals={goals}
                  setGoals={setGoals}
                  debts={debts}
                  setDebts={setDebts}
                  pin={pin}
                  setPin={setPin}
                  biometric={biometric}
                  setBiometric={setBiometric}
                  backup={backup}
                  setBackup={setBackup}
                  addExpense={addExpense}
                  openAddExpense={openAddExpense}
                  userName={userName}
                  setUserName={setUserName}
                  monthlySalary={monthlySalary}
                  setMonthlySalary={updateMonthlySalary}
                  getSalaryForMonth={getSalaryForMonth}
                  streak={streak}
                  setStreak={setStreak}
                  prevNetWorth={prevNetWorth}
                  setPrevNetWorth={setPrevNetWorth}
                  savingsHistory={savingsHistory}
                  logSavingsTransaction={logSavingsTransaction}
                  setSavingsHistory={setSavingsHistory}
                  investmentsHistory={investmentsHistory}
                  logInvestmentTransaction={logInvestmentTransaction}
                  setInvestmentsHistory={setInvestmentsHistory}
                  loansHistory={loansHistory}
                  logLoanTransaction={logLoanTransaction}
                  setLoansHistory={setLoansHistory}
                  hashedPin={hashedPin}
                  setHashedPin={setHashedPin}
                  securityQuestion={securityQuestion}
                  setSecurityQuestion={setSecurityQuestion}
                  securityAnswerHash={securityAnswerHash}
                  setSecurityAnswerHash={setSecurityAnswerHash}
                  gToken={gToken}
                  setGToken={setGToken}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Desktop View Layout (With physical device mockup frame) */
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            boxSizing: "border-box",
            background: p.outerBg
          }}>
            <div className="mockup-container animate-fade-in">
              <div className="mockup-notch" />
              <div className="mockup-content" style={{
                background: p.bg,
                padding: "36px 18px 84px 18px",
                height: "800px",
                overflowY: "auto",
                boxSizing: "border-box"
              }}>
                <Screen
                  width={380}
                  isMobile={true}
                  isTablet={false}
                  isDesktop={false}
                  p={p}
                  s={s}
                  toast={toast}
                  confetti={confetti}
                  categories={categories}
                  setCategories={setCategories}
                  txns={txns}
                  setTxns={setTxns}
                  pots={pots}
                  setPots={setPots}
                  inv={inv}
                  setInv={setInv}
                  goals={goals}
                  setGoals={setGoals}
                  debts={debts}
                  setDebts={setDebts}
                  pin={pin}
                  setPin={setPin}
                  biometric={biometric}
                  setBiometric={setBiometric}
                  backup={backup}
                  setBackup={setBackup}
                  addExpense={addExpense}
                  openAddExpense={openAddExpense}
                  userName={userName}
                  setUserName={setUserName}
                  monthlySalary={monthlySalary}
                  setMonthlySalary={updateMonthlySalary}
                  getSalaryForMonth={getSalaryForMonth}
                  streak={streak}
                  setStreak={setStreak}
                  prevNetWorth={prevNetWorth}
                  setPrevNetWorth={setPrevNetWorth}
                  savingsHistory={savingsHistory}
                  logSavingsTransaction={logSavingsTransaction}
                  setSavingsHistory={setSavingsHistory}
                  investmentsHistory={investmentsHistory}
                  logInvestmentTransaction={logInvestmentTransaction}
                  setInvestmentsHistory={setInvestmentsHistory}
                  loansHistory={loansHistory}
                  logLoanTransaction={logLoanTransaction}
                  setLoansHistory={setLoansHistory}
                  hashedPin={hashedPin}
                  setHashedPin={setHashedPin}
                  securityQuestion={securityQuestion}
                  setSecurityQuestion={setSecurityQuestion}
                  securityAnswerHash={securityAnswerHash}
                  setSecurityAnswerHash={setSecurityAnswerHash}
                  gToken={gToken}
                  setGToken={setGToken}
                  isLoading={isLoading}
                />
              </div>

              <div style={{
                background: p.navBg,
                borderTop: `1px solid ${p.border}`,
                display: "flex",
                justifyContent: "space-around",
                padding: "10px 0 16px",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 200
              }}>
                {navItems.map(n => (
                  <button key={n.label} style={s.navBtn(active === n.screen, p.accent)} onClick={() => setActive(n.screen)}>
                    <Ic n={n.icon} size={21} color={active === n.screen ? p.accent : p.textMuted} />
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: "10px", color: p.textMuted, textAlign: "center", marginTop: "16px" }}>
              WealthWise Device Emulator mode. Use left panel to switch to full dashboard.
            </div>
          </div>
        )}
      </div>
      {locked && (
        <PinLockScreen
          p={p}
          savedPin={hashedPin}
          biometric={biometric}
          onUnlock={() => setLocked(false)}
          securityQuestion={securityQuestion}
          securityAnswerHash={securityAnswerHash}
          monthlySalary={monthlySalary}
          onResetPin={handleResetPin}
          toast={toast}
        />
      )}
    </>
  );
}
