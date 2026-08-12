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
