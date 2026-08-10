// src/admin/StaffLayout.jsx
// Espace réservé aux livreurs et préparateurs.
// Structure :
//   1. La NAVBAR DU SITE en premier (composant public Navbar) ;
//   2. Une navbar interne : Commandes · Produits · Paramètres + Déconnexion ;
//   3. Le contenu de la page active.
//
// Accès : uniquement pour les utilisateurs connectés avec le rôle
// « livreur » ou « preparateur » (session staff, voir utils/auth.js).
import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ShoppingCart, Package, Settings, LogOut, UserRound } from "lucide-react";
import Navbar from "../components/Navbar/Navbar";
import { getStaffUser, logoutComplete } from "../utils/auth";
import { logActivity } from "../utils/history";

const StaffLayout = () => {
  const navigate = useNavigate();
  const [staffUser, setStaffUser] = useState(null);

  // Charger l'utilisateur staff connecté (session)
  useEffect(() => {
    const load = () => {
      const user = getStaffUser();
      setStaffUser(user);
    };
    load();
    window.addEventListener("userChanged", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("userChanged", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const handleLogout = () => {
    logActivity({
      type: "auth",
      action: "déconnexion",
      subject: staffUser?.name || "Staff",
      details: "Déconnexion de l'espace livreur/préparateur",
      actor: staffUser
        ? { name: staffUser.name, role: staffUser.role }
        : { name: "Staff", role: "staff" },
    });
    logoutComplete();
    window.location.href = "/admin/login";
  };

  const menuItems = [
    { path: "/staff/orders", name: "Commandes", icon: ShoppingCart },
    { path: "/staff/products", name: "Produits", icon: Package },
    { path: "/staff/settings", name: "Paramètres", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 1. Navbar du site (visible en haut) */}
      <Navbar
        handleOrderPopup={() => {}}
        setSearchTerm={() => {}}
        searchTerm=""
      />

      {/* 2. Navbar interne staff */}
      <div className="sticky top-0 z-30 bg-gray-900 text-white shadow-lg">
        <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="flex items-center gap-2 mr-auto">
            <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              {staffUser?.avatar || <UserRound size={18} />}
            </span>
            <div>
              <p className="font-semibold leading-tight">{staffUser?.name || "Espace staff"}</p>
              <p className="text-xs text-gray-400">
                {staffUser?.role === "livreur" ? "Livreur" : staffUser?.role === "preparateur" ? "Préparateur" : "Staff"}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`
                }
              >
                <item.icon size={16} />
                {item.name}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white transition ml-2"
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </nav>
        </div>
      </div>

      {/* 3. Contenu */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default StaffLayout;
