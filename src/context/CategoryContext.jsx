// src/context/CategoryContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_CATEGORIES } from '../utils/categories';

const CategoryContext = createContext();

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
};

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState(() => {
    const savedCategories = localStorage.getItem('categories');
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch {
        // stockage corrompu : on retombe sur les vraies catégories
      }
    }
    // Les 7 vraies catégories du catalogue (compteurs calculés dynamiquement)
    return DEFAULT_CATEGORIES.map((c) => ({ ...c, productCount: 0 }));
  });

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  // Relire les catégories si elles changent depuis un autre onglet ou un
  // autre appareil (synchronisation Supabase). Comparaison par valeur pour
  // éviter toute boucle.
  useEffect(() => {
    const handleExternalChange = () => {
      try {
        const raw = localStorage.getItem('categories');
        if (!raw) return;
        if (JSON.stringify(categories) === raw) return; // rien de nouveau
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && JSON.stringify(parsed) !== JSON.stringify(categories)) {
          setCategories(parsed);
        }
      } catch {
        // stockage corrompu : on ignore
      }
    };
    window.addEventListener('categoriesUpdated', handleExternalChange);
    window.addEventListener('storage', handleExternalChange);
    return () => {
      window.removeEventListener('categoriesUpdated', handleExternalChange);
      window.removeEventListener('storage', handleExternalChange);
    };
  }, [categories]);

  const addCategory = (category) => {
    setCategories([...categories, { ...category, id: Date.now() }]);
  };

  const updateCategory = (id, updatedCategory) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, ...updatedCategory } : cat
    ));
  };

  const deleteCategory = (id) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const toggleCategoryStatus = (id) => {
    setCategories(categories.map(cat =>
      cat.id === id 
        ? { ...cat, status: cat.status === 'active' ? 'inactive' : 'active' }
        : cat
    ));
  };

  const getActiveCategories = () => {
    return categories.filter(cat => cat.status === 'active');
  };

  return (
    <CategoryContext.Provider value={{
      categories,
      addCategory,
      updateCategory,
      deleteCategory,
      toggleCategoryStatus,
      getActiveCategories
    }}>
      {children}
    </CategoryContext.Provider>
  );
};