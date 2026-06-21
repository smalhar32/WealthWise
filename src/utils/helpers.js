export const hashPin = (pin) => {
  if (!pin) return "";
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return "hash_" + hash.toString(16);
};

export const getJsonItem = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  try {
    const str = String(dateStr);
    if (str.endsWith('Z') || /[-+]\d{2}:\d{2}$/.test(str)) {
      return new Date(dateStr);
    }
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const d = parseInt(match[3], 10);
      const hr = match[4] ? parseInt(match[4], 10) : 0;
      const min = match[5] ? parseInt(match[5], 10) : 0;
      const sec = match[6] ? parseInt(match[6], 10) : 0;
      return new Date(y, m, d, hr, min, sec);
    }
  } catch (e) {}
  return new Date(dateStr);
};

export const getLocalISODateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hr = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hr}:${min}:${sec}`;
};

export const formatTransactionTime = (t) => {
  if (!t.date) {
    return t.time || "Just now";
  }
  const dateVal = parseLocalDate(t.date);
  if (isNaN(dateVal.getTime())) {
    return t.time || "Just now";
  }
  const now = new Date();
  let diffMs = now.getTime() - dateVal.getTime();
  if (diffMs < 0) {
    diffMs = 0; // Cap future dates to present
  }
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return diffMins === 1 ? "1 minute ago" : `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  } else {
    const day = dateVal.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[dateVal.getMonth()];
    const year = dateVal.getFullYear();
    if (year === now.getFullYear()) {
      return `${day} ${month}`;
    }
    return `${day} ${month} ${year}`;
  }
};

export const sortByDateDesc = (list) => {
  if (!Array.isArray(list)) return [];
  const nowTime = Date.now();
  return [...list].sort((a, b) => {
    const valA = a.date ? parseLocalDate(a.date).getTime() : 0;
    const valB = b.date ? parseLocalDate(b.date).getTime() : 0;
    let da = isNaN(valA) ? 0 : valA;
    let db = isNaN(valB) ? 0 : valB;
    if (da > nowTime) da = nowTime; // Prevent future-dated transactions from pinning to top
    if (db > nowTime) db = nowTime;
    return db - da;
  });
};

export const calculateFDMaturityValue = (principal, rate, tenureMonths, compounding = "Quarterly") => {
  const P = parseFloat(principal);
  const R = parseFloat(rate) / 100;
  const T_years = parseFloat(tenureMonths) / 12;
  if (isNaN(P) || isNaN(R) || isNaN(T_years) || P <= 0 || R < 0 || T_years <= 0) return 0;

  if (compounding === "Simple") {
    return Math.round(P * (1 + R * T_years));
  }

  let n = 4; // default Quarterly
  if (compounding === "Monthly") n = 12;
  else if (compounding === "Yearly") n = 1;

  return Math.round(P * Math.pow(1 + R / n, n * T_years));
};

export const calculateFDAccruedValue = (principal, rate, startDate, tenureMonths, compounding = "Quarterly") => {
  const P = parseFloat(principal);
  const R = parseFloat(rate) / 100;
  const tenure = parseFloat(tenureMonths);
  if (isNaN(P) || isNaN(R) || isNaN(tenure) || P <= 0 || R < 0 || tenure <= 0) return 0;

  const start = parseLocalDate(startDate);
  const now = new Date();
  
  // Calculate elapsed time in days
  const elapsedMs = now.getTime() - start.getTime();
  if (elapsedMs <= 0) return Math.round(P); // not started yet or today

  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const totalDays = tenure * 30.436875; // average days per month (365.2425 / 12)
  
  // Cap elapsed days to total tenure days
  const daysToCalc = Math.min(elapsedDays, totalDays);
  const t_years = daysToCalc / 365.2425;

  if (compounding === "Simple") {
    return Math.round(P * (1 + R * t_years));
  }

  let n = 4;
  if (compounding === "Monthly") n = 12;
  else if (compounding === "Yearly") n = 1;

  return Math.round(P * Math.pow(1 + R / n, n * t_years));
};

