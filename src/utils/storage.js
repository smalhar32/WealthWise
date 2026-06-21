import { Preferences } from "@capacitor/preferences";
import localforage from "localforage";
import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

// Configure localforage for IndexedDB usage in Web browsers
if (!isNative) {
  localforage.config({
    name: "WealthWise",
    storeName: "keyval"
  });
}

/**
 * Migrates existing data from legacy localStorage into the new async storage layer.
 * Run once on application mount before states are loaded.
 */
export const migrateFromLocalStorage = async () => {
  try {
    const migratedKey = "ww_migrated_to_db";
    let isMigrated = false;

    if (isNative) {
      const { value } = await Preferences.get({ key: migratedKey });
      isMigrated = value === "true";
    } else {
      isMigrated = (await localforage.getItem(migratedKey)) === "true";
    }

    if (isMigrated) return;

    // Scan legacy localStorage for WealthWise keys
    const keysToMigrate = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ww_")) {
        keysToMigrate.push(key);
      }
    }

    if (keysToMigrate.length > 0) {
      for (const key of keysToMigrate) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          if (isNative) {
            await Preferences.set({ key, value });
          } else {
            await localforage.setItem(key, value);
          }
        }
      }
    }

    // Set migrated flag
    if (isNative) {
      await Preferences.set({ key: migratedKey, value: "true" });
    } else {
      await localforage.setItem(migratedKey, "true");
    }
    console.log("Local storage migration to async DB completed successfully! 📦");
  } catch (err) {
    console.error("Migration failed:", err);
  }
};

/**
 * Asynchronously gets an item from persistent storage.
 */
export const getStorageItem = async (key, fallback) => {
  try {
    let value = null;
    if (isNative) {
      const res = await Preferences.get({ key });
      value = res.value;
    } else {
      value = await localforage.getItem(key);
    }
    return value !== null ? value : fallback;
  } catch (err) {
    console.error(`Error getting storage item: ${key}`, err);
    return fallback;
  }
};

/**
 * Asynchronously sets an item in persistent storage.
 */
export const setStorageItem = async (key, value) => {
  try {
    const stringVal = typeof value === "string" ? value : JSON.stringify(value);
    if (isNative) {
      await Preferences.set({ key, value: stringVal });
    } else {
      await localforage.setItem(key, stringVal);
    }
  } catch (err) {
    console.error(`Error setting storage item: ${key}`, err);
  }
};

/**
 * Asynchronously removes an item from storage.
 */
export const removeStorageItem = async (key) => {
  try {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      await localforage.removeItem(key);
    }
  } catch (err) {
    console.error(`Error removing storage item: ${key}`, err);
  }
};
