// src/utils/validation.js
// Règles de validation communes à TOUS les formulaires du site :
// - Téléphone : uniquement des chiffres, entre 9 et 14 chiffres (après
//   nettoyage des espaces, tirets, +, parenthèses…).
// - Mot de passe : entre 8 et 15 caractères.

// Nettoie un numéro de téléphone : ne garde que les chiffres
export const cleanPhone = (value) => String(value || "").replace(/\D/g, "");

// Valide un numéro de téléphone : chiffres uniquement, 9 à 14 chiffres
export const isValidPhone = (value) => {
  const digits = cleanPhone(value);
  return digits.length >= 9 && digits.length <= 14;
};

// Message d'erreur téléphone (réutilisable)
export const PHONE_ERROR_MESSAGE =
  "Le numéro de téléphone doit contenir uniquement des chiffres (9 à 14 chiffres).";

// Valide un mot de passe : entre 8 et 15 caractères
export const isValidPassword = (value) => {
  const v = String(value || "");
  return v.length >= 8 && v.length <= 15;
};

// Message d'erreur mot de passe (réutilisable)
export const PASSWORD_ERROR_MESSAGE =
  "Le mot de passe doit contenir entre 8 et 15 caractères.";
