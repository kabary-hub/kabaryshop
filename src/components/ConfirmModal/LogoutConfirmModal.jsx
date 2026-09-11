// src/components/ConfirmModal/LogoutConfirmModal.jsx
// Modale de confirmation de déconnexion réutilisable pour l'admin et le staff.
// Affiche le rôle de l'utilisateur connecté, demande une validation explicite,
// puis déclenche le callback de déconnexion Effective quand l'utilisateur
// confirme. Le toast de succès est affiché par le composant appelant après
// la déconnexion effective.
import React from 'react';
import { LogOut } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export const LogoutConfirmModal = ({
  open,
  user,
  onConfirmLogout,
  onCancel,
}) => {
  const roleLabel =
    user?.role === 'admin'
      ? 'Administrateur'
      : user?.role === 'livreur'
        ? 'Livreur'
        : user?.role === 'preparateur'
          ? 'Préparateur'
          : user?.role || 'Utilisateur';

  return (
    <ConfirmModal
      open={open}
      title="Se déconnecter ?"
      confirmLabel="Se déconnecter"
      cancelLabel="Annuler"
      danger
      icon={<LogOut size={20} className="text-red-600" />}
      onConfirm={onConfirmLogout}
      onCancel={onCancel}
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Vous vous apprêtez à vous déconnecter de l'espace{' '}
        <strong>{roleLabel}</strong>.
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Votre session sera fermée sur cet appareil.
      </p>
    </ConfirmModal>
  );
};

export default LogoutConfirmModal;
