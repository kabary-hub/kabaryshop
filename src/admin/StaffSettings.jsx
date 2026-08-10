// src/admin/StaffSettings.jsx
// Page « Paramètres » de l'espace staff.
// Le livreur/préparateur peut modifier ses informations personnelles
// (nom, email, téléphone) et son mot de passe (8 à 15 caractères).
import React, { useState, useEffect } from "react";
import { Save, Key, Eye, EyeOff, UserRound } from "lucide-react";
import { getStaffUser } from "../utils/auth";
import {
  isValidPassword,
  PASSWORD_ERROR_MESSAGE,
  isValidPhone,
  PHONE_ERROR_MESSAGE,
} from "../utils/validation";
import { showToast } from "../utils/toast";
import { logActivity } from "../utils/history";

const StaffSettings = () => {
  const [staffUser, setStaffUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = getStaffUser();
    setStaffUser(user);
    if (user) {
      setForm({ name: user.name || "", email: user.email || "", phone: user.phone || "" });
    }
  }, []);

  // Sauvegarde des infos personnelles (dans app_users)
  const saveInfo = (e) => {
    e.preventDefault();
    setSaving(true);

    // Validation du téléphone (9-14 chiffres) si renseigné
    if (form.phone && !isValidPhone(form.phone)) {
      showToast(PHONE_ERROR_MESSAGE, "error");
      setSaving(false);
      return;
    }
    if (!form.name.trim()) {
      showToast("Le nom est requis.", "error");
      setSaving(false);
      return;
    }

    try {
      const users = JSON.parse(localStorage.getItem("app_users") || "[]");
      const updated = users.map((u) =>
        Number(u.id) === Number(staffUser.id)
          ? { ...u, name: form.name, email: form.email || u.email, phone: form.phone || u.phone }
          : u,
      );
      localStorage.setItem("app_users", JSON.stringify(updated));
      window.dispatchEvent(new Event("userChanged"));
      logActivity({
        type: "user",
        action: "modification de ses informations",
        subject: form.name,
        details: "Livreur/Préparateur a mis à jour ses informations personnelles",
        actor: { name: form.name, role: staffUser.role },
      });
      showToast("Vos informations ont été mises à jour.", "success");
    } catch {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Changement de mot de passe
  const savePassword = (e) => {
    e.preventDefault();
    setSaving(true);

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      showToast("Veuillez remplir tous les champs.", "error");
      setSaving(false);
      return;
    }
    if (!isValidPassword(passwordForm.next)) {
      showToast(PASSWORD_ERROR_MESSAGE, "error");
      setSaving(false);
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      showToast("Les mots de passe ne correspondent pas.", "error");
      setSaving(false);
      return;
    }
    if (passwordForm.current !== (staffUser.password || "")) {
      showToast("Le mot de passe actuel est incorrect.", "error");
      setSaving(false);
      return;
    }

    try {
      const users = JSON.parse(localStorage.getItem("app_users") || "[]");
      const updated = users.map((u) =>
        Number(u.id) === Number(staffUser.id) ? { ...u, password: passwordForm.next } : u,
      );
      localStorage.setItem("app_users", JSON.stringify(updated));
      window.dispatchEvent(new Event("userChanged"));
      logActivity({
        type: "auth",
        action: "changement de mot de passe",
        subject: staffUser.name,
        details: "Livreur/Préparateur a changé son mot de passe",
        actor: { name: staffUser.name, role: staffUser.role },
      });
      showToast("Mot de passe modifié avec succès.", "success");
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!staffUser) {
    return (
      <div className="text-center py-16">
        <UserRound size={40} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500">Session staff introuvable.</p>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Paramètres de mon compte</h1>
      <p className="text-sm text-gray-500 mb-6">
        Modifiez vos informations personnelles et votre mot de passe.
      </p>

      {/* Informations personnelles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <UserRound size={18} className="text-primary" />
          Mes informations
        </h2>
        <form onSubmit={saveInfo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom complet</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone (9 à 14 chiffres)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value.replace(/[^0-9+ ]/g, "") })
              }
              className={inputClass}
              placeholder="+224 6xx xxx xxx"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition disabled:opacity-50"
          >
            <Save size={16} />
            Enregistrer
          </button>
        </form>
      </div>

      {/* Mot de passe */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Key size={18} className="text-primary" />
          Changer mon mot de passe
        </h2>
        <form onSubmit={savePassword} className="space-y-4">
          {[
            { key: "current", label: "Mot de passe actuel", placeholder: "••••••••" },
            { key: "next", label: "Nouveau mot de passe (8 à 15 caractères)", placeholder: "••••••••" },
            { key: "confirm", label: "Confirmer le nouveau mot de passe", placeholder: "••••••••" },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium mb-1">{field.label}</label>
              <div className="relative">
                <input
                  type={showPwd[field.key] ? "text" : "password"}
                  value={passwordForm[field.key]}
                  onChange={(e) => setPasswordForm({ ...passwordForm, [field.key]: e.target.value })}
                  className={inputClass + " pr-10"}
                  placeholder={field.placeholder}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd({ ...showPwd, [field.key]: !showPwd[field.key] })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-label={showPwd[field.key] ? "Masquer" : "Afficher"}
                >
                  {showPwd[field.key] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition disabled:opacity-50"
          >
            <Key size={16} />
            Changer le mot de passe
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffSettings;
