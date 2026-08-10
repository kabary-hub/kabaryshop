// src/admin/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import {
  isAdminLoggedIn,
  isStaffLoggedIn,
} from '../utils/auth';

// Vérifie si la 2FA est activée dans les paramètres
const isTwoFactorEnabled = () => {
  try {
    const raw = localStorage.getItem('kabary_settings');
    if (!raw) return false;
    return !!JSON.parse(raw).security?.twoFactor;
  } catch {
    return false;
  }
};

// Protège l'espace ADMIN (réservé aux administrateurs authentifiés)
const ProtectedRoute = ({ children }) => {
  const authenticated = isAdminLoggedIn();

  // Pas de session → reconnexion obligatoire
  if (!authenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Si la 2FA est activée, exiger la vérification de la session en cours
  if (isTwoFactorEnabled() && sessionStorage.getItem('admin_2fa_verified') !== '1') {
    // Nettoyer la session incomplète
    sessionStorage.removeItem('adminLoggedIn');
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

// Protège l'espace STAFF (livreurs / préparateurs connectés)
export const StaffProtectedRoute = ({ children }) => {
  if (!isStaffLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};