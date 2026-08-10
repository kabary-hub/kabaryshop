// src/utils/currencyUtils.js
export const currencySymbols = {
  GNF: { symbol: 'FG', name: 'Franc Guinéen', rate: 1 },
  USD: { symbol: '$', name: 'Dollar US', rate: 0.000095 },
  EUR: { symbol: '€', name: 'Euro', rate: 0.000087 },
  XAF: { symbol: 'FCFA', name: 'Franc CFA', rate: 0.057 }
};

// Taux de conversion basés sur 1 GNF (valeurs approximatives)
// En production, utilisez une API de taux de change
export const convertPrice = (priceInGNF, targetCurrency) => {
  if (!priceInGNF) return 0;
  
  const rates = {
    GNF: 1,
    USD: 0.000095,
    EUR: 0.000087,
    XAF: 0.057
  };
  
  const converted = priceInGNF * rates[targetCurrency];
  
  // Arrondir selon la devise
  if (targetCurrency === 'XAF' || targetCurrency === 'GNF') {
    return Math.round(converted);
  }
  return converted.toFixed(2);
};

export const formatPrice = (price, currency) => {
  const symbol = currencySymbols[currency]?.symbol || currency;
  const formattedPrice = price.toLocaleString();
  
  // Placement du symbole selon la devise
  if (currency === 'EUR' || currency === 'USD') {
    return `${symbol}${formattedPrice}`;
  }
  return `${formattedPrice} ${symbol}`;
};