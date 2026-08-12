// src/utils/phone.js
// ============================================================
// Normalisation des numéros de téléphone
// ------------------------------------------------------------
// Permet de regrouper les commandes d'un MÊME client, même si le numéro a
// été saisi avec des formats différents :
//   - « 620 98 01 17 »   (espaces)
//   - « +224 620980117 » (préfixe international)
//   - « 0620980117 »     (0 initial)
//   - « 620980117 »      (brut)
// Toutes ces variantes sont ramenées à « 620980117 ».
// ============================================================

// Nettoie un numéro : chiffres uniquement, préfixe +224 et 0 initial retirés.
export const normalizePhone = (value) => {
  if (value == null) return "";
  let digits = String(value).replace(/\D/g, "");
  // Préfixe international guinéen (+224) : « 224620980117 » → « 620980117 »
  if (digits.length > 9 && digits.startsWith("224")) {
    digits = digits.slice(3);
  }
  // Zéro initial : « 0620980117 » → « 620980117 »
  if (digits.startsWith("0") && digits.length > 0) {
    digits = digits.slice(1);
  }
  return digits;
};

// Vrai si deux numéros correspondent (normalisés) ; faux si l'un est vide.
export const samePhone = (a, b) => {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
};

// Formate un numéro normalisé pour l'affichage (ex. « 620 98 01 17 »).
export const formatPhone = (value) => {
  const digits = normalizePhone(value);
  if (!digits) return value || "";
  // Groupes de 2 chiffres à partir de la fin → « 62 09 80 11 7 »… On préfère
  // le format local usuel : 3-2-2-2 (620 98 01 17).
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  return digits;
};

// Numéro au format INTERNATIONAL pour WhatsApp (wa.me).
// ⚠️ Ne PAS utiliser normalizePhone ici : il retire le « +224 », or wa.me
// exige l'indicatif complet du pays, sinon WhatsApp peut lire un AUTRE pays
// (ex. « 620980117 » serait lu comme un numéro indonésien, indicatif 62).
//
// Règles :
//   • « +224 620 98 01 17 »  → « 224620980117 » (déjà international)
//   • « 0620980117 »         → « 224620980117 » (0 initial retiré)
//   • « 620980117 »          → « 224620980117 » (numéro national guinéen)
//   • « +33612345678 »       → « 33612345678 »  (autre pays : conservé tel quel)
export const toWhatsAppNumber = (value) => {
  if (value == null) return "";
  const raw = String(value).replace(/\D/g, "");
  if (!raw) return "";
  // Déjà au format international guinéen : « 224620980117 » (12 chiffres)
  if (raw.length > 9 && raw.startsWith("224")) return raw;
  // Zéro initial : « 0620980117 » (10 chiffres) → « 224620980117 »
  // (à traiter AVANT le cas « autre indicatif pays »)
  if (raw.length === 10 && raw.startsWith("0")) {
    return `224${raw.slice(1)}`;
  }
  // Numéro national guinéen (9 chiffres) → préfixe +224
  if (raw.length === 9) {
    return `224${raw}`;
  }
  // Autre indicatif pays déjà présent (« 33612345678 »…) : conservé tel quel
  return raw;
};
