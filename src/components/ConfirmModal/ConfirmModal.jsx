// src/components/ConfirmModal/ConfirmModal.jsx
// Modale de confirmation réutilisable qui remplace window.confirm() partout
// sur le site (suppression, rejet de commande, etc.).
//
// Usage :
//   const [confirm, setConfirm] = useState(null);
//   <ConfirmModal
//     open={Boolean(confirm)}
//     title="Supprimer le produit ?"
//     message="Cette action est irréversible."
//     confirmLabel="Supprimer"
//     cancelLabel="Annuler"
//     danger
//     onConfirm={() => { doDelete(confirm); setConfirm(null); }}
//     onCancel={() => setConfirm(null)}
//   />
import React, { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmModal = ({
  open = false,
  title = "Confirmation",
  message = "",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  onConfirm,
  onCancel,
}) => {
  // Référence stable vers onCancel (les parents passent souvent une flèche
  // inline) pour ne pas ré-abonner l'écouteur Échap à chaque rendu.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Fermer avec la touche Échap
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancelRef.current?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        // Fermer si on clique sur le fond (pas sur la modale)
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeIn overflow-hidden">
        <div className="flex items-start justify-between p-5 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                danger
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-blue-100 dark:bg-blue-900/30"
              }`}
            >
              <AlertTriangle
                size={22}
                className={danger ? "text-red-600" : "text-blue-600"}
              />
            </div>
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            aria-label="Fermer"
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {message && (
          <p className="px-5 py-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-3 p-5 pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-secondary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
