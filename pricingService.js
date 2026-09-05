import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import firebaseConfig from "./firebase-applet-config.json";

export const DEFAULT_PLANS_PRICES = {
  starter: 34,
  basic: 100,
  spark: 300,
  super: 700,
  king: 4000,
  ultra: 20000,
};

export const DEFAULT_MARKUP_PERCENT = 15;

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const PRICING_DOC_REF = doc(db, "pricing_config", "current");

/**
 * Updates prices and markup percentage in Firestore so all connected
 * clients update in real time.
 */
export async function updatePricingInFirestore(prices, markupPercent) {
  try {
    const payload = {
      updatedAt: new Date().toISOString()
    };
    if (prices && typeof prices === "object") {
      payload.prices = prices;
    }
    if (markupPercent !== undefined && markupPercent !== null && !isNaN(parseFloat(markupPercent))) {
      payload.markup_percent = parseFloat(markupPercent);
    }
    await setDoc(PRICING_DOC_REF, payload, { merge: true });
    return { success: true };
  } catch (err) {
    console.error("Error updating pricing in Firestore:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribes to real-time updates from Firestore for pricing configuration.
 */
export function subscribeToPricing(callback) {
  return onSnapshot(
    PRICING_DOC_REF,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const prices = { ...DEFAULT_PLANS_PRICES, ...(data.prices || {}) };
        const markup_percent =
          data.markup_percent !== undefined ? data.markup_percent : DEFAULT_MARKUP_PERCENT;
        callback({ prices, markup_percent, isFirestore: true });
        if (data.prices && data.prices.starter === undefined) {
          updatePricingInFirestore({ ...data.prices, starter: 34 }, markup_percent).catch(() => {});
        }
      } else {
        // Document does not exist yet; provide defaults and create initial doc
        callback({ prices: DEFAULT_PLANS_PRICES, markup_percent: DEFAULT_MARKUP_PERCENT, isFirestore: false });
        updatePricingInFirestore(DEFAULT_PLANS_PRICES, DEFAULT_MARKUP_PERCENT).catch(() => {});
      }
    },
    (err) => {
      console.warn("Firestore pricing listener fallback:", err.message);
      callback({ prices: DEFAULT_PLANS_PRICES, markup_percent: DEFAULT_MARKUP_PERCENT, isFirestore: false });
    }
  );
}

/**
 * React hook to access live synchronized pricing configuration across the app.
 */
export function usePricing() {
  const [pricing, setPricing] = useState({
    prices: DEFAULT_PLANS_PRICES,
    markupPercent: DEFAULT_MARKUP_PERCENT,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = subscribeToPricing(({ prices, markup_percent }) => {
      setPricing({
        prices,
        markupPercent: markup_percent,
        loading: false,
      });
    });

    // Initial fallback from backend endpoint
    fetch("/api/admin/prices")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.prices) {
          setPricing((prev) => ({
            ...prev,
            prices: { ...prev.prices, ...d.prices },
            markupPercent: d.markup_percent !== undefined ? d.markup_percent : prev.markupPercent,
          }));
        }
      })
      .catch(() => {});

    return () => unsubscribe();
  }, []);

  return pricing;
}
