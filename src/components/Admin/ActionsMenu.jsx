// src/components/Admin/ActionsMenu.jsx
// Menu d'actions contextuel à trois points (⋮) pour l'admin.
// Affiché à proximité immédiate du bouton cliqué, avec icônes Lucide.
// Les handlers sont appelés directement sans délai ni condition superflue.
import React, { useEffect, useRef, useState } from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';

const ActionsMenu = ({
  triggers = ['Voir', 'Modifier', 'Supprimer'],
  onAction,
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  // Fermer si on clique en dehors du déclencheur ou du menu.
  useEffect(() => {
    if (!visible) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible]);

  const handleAction = (label) => {
    setVisible(false);
    if (typeof onAction === 'function') {
      onAction(label);
    }
  };

  const iconFor = (label) => {
    if (label === 'Voir') return <Eye size={15} className="text-blue-600" />;
    if (label === 'Modifier') return <Edit2 size={15} className="text-blue-600" />;
    if (label === 'Supprimer') return <Trash2 size={15} className="text-red-600" />;
    return null;
  };

  return (
    <>
      <span ref={ref} className="inline-flex">
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          title="Actions"
          aria-label="Ouvrir le menu d'actions"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </span>
      {visible && (
        <div
          className="absolute right-0 top-full z-20 mt-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1"
          style={{ minWidth: '180px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
          role="menu"
          aria-label="Actions"
        >
          {triggers.map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => handleAction(label)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition"
            >
              {iconFor(label)}
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default ActionsMenu;
