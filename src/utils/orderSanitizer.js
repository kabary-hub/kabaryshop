// src/utils/orderSanitizer.js
// ============================================================
// Nettoyage des commandes malformées (localStorage « shop_orders »)
// ------------------------------------------------------------
// Logique PURE (aucune API navigateur) : importable depuis le navigateur
// (migration au démarrage, filtre à la synchro Supabase) ET depuis Node.js
// (scripts/migrate-shop-orders.mjs, tests).
//
// Une commande « malformée » peut venir d'une ancienne version du site,
// d'une synchro Supabase partielle ou d'une écriture interrompue :
//   - entrée null / non-objet / tableau     → supprimée ;
//   - id, reference manquants               → générés (format CMD-AAMMJJ-NNNN) ;
//   - customer manquant / malformé          → remplacé par un client « inconnu » ;
//   - items manquants / invalides           → articles par défaut ;
//   - total manquant / invalide             → recalculé depuis les articles ;
//   - status / date / paymentMethod invalides → valeurs par défaut ;
//   - shipping présent mais non-objet       → retiré.
//
// Les commandes VALIDES ne sont jamais modifiées. L'ordre de la liste est
// conservé.
// ============================================================

export const VALID_ORDER_STATUSES = new Set([
  "pending",
  "shipped",
  "completed",
  "cancelled",
]);

const DEFAULT_CUSTOMER = {
  name: "Client inconnu",
  email: "",
  phone: "",
  address: "",
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Nombre fini, sinon fallback. Accepte les chaînes numériques (« 15000 »,
// « 15 000 ») issues d'anciens formats.
const toFiniteNumber = (value, fallback = 0) => {
  const n =
    typeof value === "string" ? Number(value.replace(/\s+/g, "")) : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeString = (value, fallback = "") => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const sanitizeCustomer = (customer) => {
  if (!isPlainObject(customer)) {
    // Ancien format : customer pouvait être une simple chaîne (le nom)
    if (typeof customer === "string" && customer.trim()) {
      return { ...DEFAULT_CUSTOMER, name: customer.trim() };
    }
    return { ...DEFAULT_CUSTOMER };
  }
  return {
    name: normalizeString(customer.name, DEFAULT_CUSTOMER.name) || DEFAULT_CUSTOMER.name,
    email: normalizeString(customer.email),
    phone: normalizeString(customer.phone),
    address: normalizeString(customer.address),
  };
};

const sanitizeItem = (item, index) => {
  if (!isPlainObject(item)) {
    return { id: "", name: `Article ${index + 1}`, quantity: 1, price: 0 };
  }
  const fixed = { ...item };
  // Conserver l'id tel quel quand il est déjà valide (nombre ou chaîne),
  // sinon prendre originalId, sinon laisser vide.
  fixed.id =
    typeof item.id === "string" || typeof item.id === "number"
      ? item.id
      : item.originalId != null
        ? String(item.originalId)
        : "";
  fixed.name = normalizeString(item.name) || `Article ${index + 1}`;
  fixed.quantity = Math.max(1, Math.floor(toFiniteNumber(item.quantity, 1)));
  fixed.price = Math.max(0, toFiniteNumber(item.price, 0));
  if (item.image != null) fixed.image = String(item.image);
  return fixed;
};

const pad2 = (n) => String(n).padStart(2, "0");

// Génère une référence unique au même format que la boutique :
// CMD-AAMMJJ-NNNN (ex. CMD-260811-0004).
const generateReference = (existingRefs) => {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  let maxSeq = 0;
  for (const ref of existingRefs) {
    const m = String(ref || "").match(/^CMD-(\d{6})-(\d{4})$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `CMD-${datePart}-${String(maxSeq + 1).padStart(4, "0")}`;
};

// ============================================================
// sanitizeShopOrders(orders) → { orders, report }
// ------------------------------------------------------------
// report = {
//   total    : nombre d'entrées lues,
//   dropped  : entrées invalides supprimées,
//   repaired : commandes modifiées,
//   replaced : true si le stockage doit être réécrit,
//   details  : [{ id, changes: [...] }],
//   note     : message éventuel (ex. valeur non-tableau),
// }
// ============================================================
export const sanitizeShopOrders = (orders) => {
  const report = {
    total: 0,
    dropped: 0,
    repaired: 0,
    replaced: false,
    details: [],
    note: "",
  };

  // Valeur carrément illisible : on repart sur une liste vide
  if (!Array.isArray(orders)) {
    report.note = "La valeur stockée n'est pas un tableau — remplacée par une liste vide.";
    report.replaced = true;
    return { orders: [], report };
  }

  report.total = orders.length;

  // Passe 1 : références existantes (pour générer des nouvelles uniques)
  const existingRefs = [];
  for (const order of orders) {
    if (isPlainObject(order) && typeof order.reference === "string" && order.reference.trim()) {
      existingRefs.push(order.reference.trim());
    }
  }

  // Passe 2 : plus grand id numérique existant
  let nextId = 1;
  for (const order of orders) {
    if (!isPlainObject(order)) continue;
    const id = toFiniteNumber(order.id, 0);
    if (id >= nextId) nextId = id + 1;
  }

  const cleaned = [];

  for (const order of orders) {
    // Entrée totalement invalide → suppression
    if (!isPlainObject(order)) {
      report.dropped += 1;
      report.details.push({ id: null, changes: ["entrée invalide — supprimée"] });
      continue;
    }

    const fixed = { ...order };
    const changes = [];

    // --- id numérique unique ---
    const numericId = toFiniteNumber(fixed.id, 0);
    if (fixed.id == null || fixed.id === "" || numericId <= 0) {
      fixed.id = nextId;
      nextId += 1;
      changes.push("id (généré)");
    } else {
      if (typeof fixed.id !== "number") {
        fixed.id = numericId;
        changes.push("id (normalisé)");
      }
      if (numericId >= nextId) nextId = numericId + 1;
    }

    // --- référence lisible ---
    if (typeof fixed.reference !== "string" || !fixed.reference.trim()) {
      const ref = generateReference(existingRefs);
      existingRefs.push(ref);
      fixed.reference = ref;
      changes.push("reference (générée)");
    } else {
      fixed.reference = fixed.reference.trim();
    }

    // --- client ---
    const customer = sanitizeCustomer(fixed.customer);
    if (JSON.stringify(customer) !== JSON.stringify(fixed.customer)) {
      changes.push("customer (normalisé)");
    }
    fixed.customer = customer;

    // --- articles ---
    if (!Array.isArray(fixed.items)) {
      fixed.items = [];
      changes.push("items (réparé)");
    } else {
      const sanitizedItems = fixed.items.map(sanitizeItem);
      if (JSON.stringify(sanitizedItems) !== JSON.stringify(fixed.items)) {
        changes.push("items (normalisés)");
      }
      fixed.items = sanitizedItems;
    }

    // --- total (recalculé depuis les articles si manquant/invalide) ---
    // NB : null et "" sont traités comme absents — Number(null) = 0 est fini,
    // donc toFiniteNumber seul ne suffirait pas.
    const rawTotal = fixed.total;
    const totalMissing = rawTotal == null || rawTotal === "";
    const total = totalMissing ? NaN : toFiniteNumber(rawTotal, NaN);
    if (!Number.isFinite(total)) {
      fixed.total = fixed.items.reduce(
        (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
        0,
      );
      changes.push("total (recalculé)");
    } else {
      fixed.total = Math.max(0, total);
    }

    // --- statut ---
    if (!VALID_ORDER_STATUSES.has(fixed.status)) {
      fixed.status = "pending";
      changes.push("status (corrigé)");
    }

    // --- date ---
    const parsedDate = new Date(fixed.date);
    if (Number.isNaN(parsedDate.getTime())) {
      fixed.date = new Date().toISOString();
      changes.push("date (corrigée)");
    }

    // --- moyen de paiement ---
    if (typeof fixed.paymentMethod !== "string" || !fixed.paymentMethod.trim()) {
      fixed.paymentMethod = "Mobile Money";
      changes.push("paymentMethod (défaut)");
    }

    // --- expédition ---
    if (fixed.shipping !== undefined && !isPlainObject(fixed.shipping)) {
      delete fixed.shipping;
      changes.push("shipping (retiré)");
    } else if (isPlainObject(fixed.shipping)) {
      const shipping = { ...fixed.shipping };
      if (typeof shipping.by !== "string" || !shipping.by.trim()) {
        delete fixed.shipping;
        changes.push("shipping (sans expéditeur, retiré)");
      } else {
        shipping.by = shipping.by.trim();
        shipping.date =
          typeof shipping.date === "string" && shipping.date
            ? shipping.date
            : new Date().toISOString();
        fixed.shipping = shipping;
      }
    }

    if (changes.length > 0) {
      report.repaired += 1;
      report.details.push({ id: fixed.id, changes });
    }

    cleaned.push(fixed);
  }

  report.replaced = report.dropped > 0 || report.repaired > 0;
  return { orders: cleaned, report };
};
