// src/admin/Users.jsx - Gestion des utilisateurs avec actions dans un menu trois points,
// détails au clic sur une ligne, toasts explicites, validations (mdp 8-15, téléphone 9-14)
// et pagination.
import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Edit, Trash2, Shield, UserCheck, UserX, Search, X, Truck, Package, CheckCircle, ChevronDown, Calendar, MoreVertical, Mail, Phone, ShieldAlert } from 'lucide-react';
import { logActivity } from '../utils/history';
import { showToast } from '../utils/toast';
import { isValidPhone, PHONE_ERROR_MESSAGE, isValidPassword, PASSWORD_ERROR_MESSAGE } from '../utils/validation';
import Pagination from '../components/Pagination/Pagination';
import { useSettings } from '../context/SettingsContext';

// Nombre d'utilisateurs affichés par page
const PAGE_SIZE = 8;

// Avatar : logo du site s'il existe, sinon initiales du nom/prénom
const UserAvatar = ({ user, className = 'w-10 h-10 text-sm' }) => {
  const { settings } = useSettings();
  if (settings.siteLogo) {
    return (
      <img
        src={settings.siteLogo}
        alt="Logo du site"
        className={`${className} rounded-full object-cover border border-gray-200 dark:border-gray-600`}
      />
    );
  }
  // Initiales : deux premières lettres du nom et du prénom
  const initials = (user?.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <div className={`${className} rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold border border-primary/30`}>
      {initials}
    </div>
  );
};

// Devine approximativement la civilité (M./Mme) à partir du prénom
// pour rendre le toast d'ajout plus explicite.
const guessCivility = (name) => {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  const last = first.slice(-1).toLowerCase();
  return last === 'a' || last === 'e' ? 'Mme' : 'M.';
};

const Users = () => {
  const { settings } = useSettings();
  // ==================== ÉTATS ====================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [errors, setErrors] = useState({});
  const [currentAdminUser, setCurrentAdminUser] = useState(() => {
    const savedCurrentUser = localStorage.getItem('current_admin_user');
    if (savedCurrentUser) return JSON.parse(savedCurrentUser);
    const defaultUser = { id: 1, name: 'Admin Principal', role: 'admin', avatar: '👨‍💼' };
    localStorage.setItem('current_admin_user', JSON.stringify(defaultUser));
    return defaultUser;
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem('app_users');
    if (savedUsers) return JSON.parse(savedUsers);
    const defaultUsers = [
      { id: 1, name: 'Admin Principal', email: 'admin@kabarishop.com', role: 'admin', status: 'active', orders: 12, totalSpent: 450000, phone: '+224 620980117', avatar: '👨‍💼', createdAt: '2024-01-15T10:30:00' },
      { id: 2, name: 'Boubacar Diallo', email: 'boubacar@kabarishop.com', role: 'livreur', status: 'active', orders: 5, totalSpent: 125000, phone: '+224 620980117', avatar: '🚚', createdAt: '2024-02-20T14:20:00' },
      { id: 3, name: 'Mariama Camara', email: 'mariama@kabarishop.com', role: 'livreur', status: 'active', orders: 8, totalSpent: 289000, phone: '+224 620980117', avatar: '🚚', createdAt: '2024-03-10T09:15:00' },
    ];    localStorage.setItem('app_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  });

  // Menu d'actions trois points (id de l'utilisateur ouvert)
  const [showActionMenu, setShowActionMenu] = useState(null);
  // Détails de l'utilisateur (modale)
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // Pagination
  const [page, setPage] = useState(1);

  // Formulaire d'ajout/modification
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Utilisateur',
    status: 'active',
    password: '',
    confirmPassword: '',
    phone: '',
    avatar: '👤',
    // Permission : voir les commandes en attente (espace staff)
    ordersFullAccess: false
  });


  const saveUsersToLocalStorage = (updatedUsers) => {
    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));
    window.dispatchEvent(new Event('userChanged'));
  };

  // Fermer le dropdown et le menu d'actions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.user-dropdown')) {
        setIsDropdownOpen(false);
      }
      if (showActionMenu !== null && !event.target.closest('.user-actions-menu')) {
        setShowActionMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDropdownOpen, showActionMenu]);

  // Remonter à la première page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedRole]);

  // ==================== FILTRES ====================
  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ==================== FONCTIONS D'AFFICHAGE ====================
  const getRoleBadge = (role) => {
    const roles = {
      admin: 'bg-purple-100 text-purple-800',
      livreur: 'bg-blue-100 text-blue-800',
      preparateur: 'bg-green-100 text-green-800',
      Utilisateur: 'bg-gray-100 text-gray-800'
    };
    return roles[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur',
      livreur: 'Livreur',
      preparateur: 'Préparateur',
      Utilisateur: 'Utilisateur'
    };
    return labels[role] || role;
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Shield size={14} />;
      case 'livreur': return <Truck size={14} />;
      case 'preparateur': return <Package size={14} />;
      default: return <UsersIcon size={14} />;
    }
  };

  const getStatusBadge = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  // ==================== VALIDATION ====================
  const validateForm = (isEdit = false) => {
    const newErrors = {};
    if (!newUser.name?.trim()) newErrors.name = 'Le nom est requis';
    if (!newUser.email?.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(newUser.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    // Téléphone : uniquement des chiffres, 9 à 14 chiffres
    if (newUser.phone && !isValidPhone(newUser.phone)) {
      newErrors.phone = PHONE_ERROR_MESSAGE;
    }
    // Mot de passe : entre 8 et 15 caractères
    if (!isEdit) {
      if (!newUser.password) {
        newErrors.password = 'Le mot de passe est requis';
      } else if (!isValidPassword(newUser.password)) {
        newErrors.password = PASSWORD_ERROR_MESSAGE;
      }
      if (newUser.password !== newUser.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    } else {
      if (newUser.password && newUser.password !== newUser.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
      if (newUser.password && !isValidPassword(newUser.password)) {
        newErrors.password = PASSWORD_ERROR_MESSAGE;
      }
    }
    return newErrors;
  };

  // ==================== CRUD ====================
  const handleAddUser = () => {
    const newErrors = validateForm(false);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 7;
    const now = new Date().toISOString();
    
    const userToAdd = {
      id: newId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role === 'admin' ? 'admin' : newUser.role === 'livreur' ? 'livreur' : 'preparateur',
      status: newUser.status,
      createdAt: now,
      phone: newUser.phone || '',
      avatar: '👤',
      // 🔑 Mot de passe : indispensable pour que le livreur/préparateur puisse
      // se connecter à son espace staff (/staff)
      password: newUser.password,
      ordersFullAccess: !!newUser.ordersFullAccess
    };

    const updatedUsers = [...users, userToAdd];
    saveUsersToLocalStorage(updatedUsers);
    // Journal : création d'utilisateur
    logActivity({
      type: 'user',
      action: 'création',
      subject: userToAdd.name,
      details: `Rôle : ${getRoleLabel(userToAdd.role)} · Email : ${userToAdd.email}`,
    });
    // Toast explicite : civilité + nom + rôle
    const civility = guessCivility(userToAdd.name);
    showToast(`${civility} ${userToAdd.name} a été ajouté en tant que ${getRoleLabel(userToAdd.role)}`, 'success');
    setIsModalOpen(false);
    resetForm();
  };

  const handleEditUser = () => {
    const newErrors = validateForm(true);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const originalUser = users.find(user => user.id === editingUserId);
    const newRole = newUser.role === 'admin' ? 'admin' : newUser.role === 'livreur' ? 'livreur' : 'preparateur';
    const updatedUsers = users.map(user => {
      if (user.id === editingUserId) {
        return {
          ...user,
          name: newUser.name,
          email: newUser.email,
          role: newRole,
          status: newUser.status,
          phone: newUser.phone || user.phone,
          avatar: user.avatar,
          // 🔑 Met à jour le mot de passe uniquement si un nouveau est saisi
          ...(newUser.password ? { password: newUser.password } : {}),
          ordersFullAccess: !!newUser.ordersFullAccess,
        };
      }
      return user;
    });
    
    saveUsersToLocalStorage(updatedUsers);
    // Journal : modification d'utilisateur (changement de rôle explicite)
    const details = [];
    if (originalUser && originalUser.role !== newRole) {
      details.push(`Rôle changé : ${getRoleLabel(originalUser.role)} → ${getRoleLabel(newRole)}`);
    }
    if (originalUser && originalUser.status !== newUser.status) {
      details.push(`Statut : ${originalUser.status === 'active' ? 'Actif' : 'Bloqué'} → ${newUser.status === 'active' ? 'Actif' : 'Bloqué'}`);
    }
    logActivity({
      type: 'user',
      action: 'modification',
      subject: newUser.name,
      details: details.length ? details.join(' · ') : 'Informations mises à jour',
    });
    showToast(`Les informations de ${newUser.name} ont été mises à jour`, 'success');
    setIsModalOpen(false);
    resetForm();
    setIsEditMode(false);
    setEditingUserId(null);
  };

  const resetForm = () => {
    setNewUser({
      name: '',
      email: '',
      role: 'Utilisateur',
      status: 'active',
      password: '',
      confirmPassword: '',
      phone: '',
      avatar: '👤',
      ordersFullAccess: false
    });
    setErrors({});
  };

  const openEditModal = (user) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: '',
      confirmPassword: '',
      phone: user.phone || '',
      avatar: user.avatar,
      ordersFullAccess: !!user.ordersFullAccess
    });
    setIsModalOpen(true);
    setShowActionMenu(null);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleDeleteUser = (id) => {
    const target = users.find(user => user.id === id);
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      const updatedUsers = users.filter(user => user.id !== id);
      saveUsersToLocalStorage(updatedUsers);
      if (target) {
        logActivity({
          type: 'user',
          action: 'suppression',
          subject: target.name,
          details: `Rôle : ${getRoleLabel(target.role)} · Email : ${target.email}`,
        });
        // Toast de suppression (au lieu d'un console.log)
        showToast(`${target.name} a été supprimé de la liste des utilisateurs`, 'success');
      }
    }
    setShowActionMenu(null);
  };  const handleToggleStatus = (id) => {
    const target = users.find(user => user.id === id);
    const updatedUsers = users.map(user =>
      user.id === id
        ? { ...user, status: user.status === 'active' ? 'blocked' : 'active' }
        : user
    );
    saveUsersToLocalStorage(updatedUsers);
    if (target) {
      const newStatus = target.status === 'active' ? 'blocked' : 'active';
      logActivity({
        type: 'user',
        action: newStatus === 'blocked' ? 'blocage' : 'déblocage',
        subject: target.name,
        details: `${target.name} est maintenant ${newStatus === 'blocked' ? 'bloqué' : 'actif'}`,
      });
      // Toast explicite pour le blocage / déblocage
      if (newStatus === 'blocked') {
        showToast(`${target.name} a été bloqué : il ne peut plus se connecter`, 'warning');
      } else {
        showToast(`${target.name} a été débloqué : il peut se connecter à nouveau`, 'success');
      }
    }
    setShowActionMenu(null);
  };

  // Indique si l'utilisateur a un mot de passe défini (pour le badge)
  const hasPassword = (user) => {
    // Les utilisateurs par défaut ont un mot de passe pré-défini
    if (user.password) return true;
    return false;
  };

  const selectCurrentUser = (user) => {
    const userToSave = {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    };
    setCurrentAdminUser(userToSave);
    localStorage.setItem('current_admin_user', JSON.stringify(userToSave));
    window.dispatchEvent(new Event('userChanged'));
    // Journal : changement d'utilisateur actif
    logActivity({
      type: 'auth',
      action: 'changement d\'utilisateur actif',
      subject: user.name,
      details: `Session active : ${user.name} (${getRoleLabel(user.role)})`,
    });
    setIsDropdownOpen(false);
  };

  // Affiche la modale de détails de l'utilisateur
  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
    setIsEditMode(false);
    setEditingUserId(null);
  };

  // ==================== STATISTIQUES ====================
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    livreurs: users.filter(u => u.role === 'livreur').length,
  };

  // ==================== RENDU (TA DISPOSITION ORIGINALE) ====================
  return (
    <div className="p-6">
      {/* En-tête avec logo et dropdown utilisateur */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <img src="/testimon4.jpeg" alt="" className='w-15 h-15 rounded-full'/>
             DG Kabary Shop
          </h1>
          <p className="text-gray-500 mt-1">Gestion de tous les utilisateurs de la plateforme</p>
        </div>
        
        {/* SECTION UTILISATEUR CONNECTÉ AVEC DROPDOWN */}
        {currentAdminUser && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 w-full sm:w-auto">
            <div className="flex items-center justify-end">
              <div className="relative user-dropdown">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <div className="flex items-center gap-3">
                    {/* Logo du site, sinon initiales */}
                    <UserAvatar user={currentAdminUser} className="w-11 h-11 text-base" />
                    <div>
                      <p className="text-sm text-gray-500">Connecté en tant que :</p>
                      <p className="font-semibold text-lg">{currentAdminUser.name}</p>
                      <p className="text-sm text-gray-500">{getRoleLabel(currentAdminUser.role)}</p>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <p className="text-xs text-gray-400 px-3 py-2 border-b dark:border-gray-700 mb-1">
                        Se connecter en tant que
                      </p>
                      {users.map(user => (
                        <button
                          key={user.id}
                          onClick={() => selectCurrentUser(user)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            currentAdminUser?.id === user.id ? 'bg-primary/10' : ''
                          }`}
                        >
                          {/* Logo du site, sinon initiales du nom */}
                          <UserAvatar user={user} className="w-9 h-9 text-xs" />
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{user.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'livreur' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {getRoleLabel(user.role)}
                              </span>
                            </div>
                          </div>
                          {currentAdminUser?.id === user.id && (
                            <CheckCircle size={16} className="text-green-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* En-tête Utilisateurs avec bouton ajouter */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="text-blue-600" />
            Utilisateurs
          </h1>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-primary transition"
        >
          + Ajouter un utilisateur
        </button>
      </div>

      {/* FILTRES */}
      <div className="rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800"
              />
            </div>
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border rounded-lg dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateurs</option>
            <option value="livreur">Livreurs</option>
            <option value="preparateur">Préparateurs</option>
          </select>
        </div>
      </div>

      {/* TABLEAU DES UTILISATEURS */}
      <div className="dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date enregistrement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {currentPageUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => viewUserDetails(user)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Logo du site, sinon initiales */}
                      <UserAvatar user={user} />
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{user.phone || 'Non renseigné'}</div>
                    {/* Indicateur : mot de passe défini ou non (connexion staff) */}
                    <div className="mt-1">
                      {hasPassword(user) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          🔑 Mot de passe défini
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                          ⚠️ Mot de passe à définir
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getRoleBadge(user.role)}`}>
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(user.status)}`}>
                      {user.status === 'active' ? 'Actif' : 'Bloqué'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      {formatDate(user.createdAt)}
                    </div>
                   </td>
                  <td className="px-6 py-4 relative user-actions-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                      title="Actions"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {showActionMenu === user.id && (
                      <div className="absolute right-6 top-12 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 w-52">
                        <div className="py-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Edit size={16} />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            {user.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                            {user.status === 'active' ? 'Bloquer' : 'Débloquer'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                 </tr>
              ))}
              {currentPageUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">Total utilisateurs</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">Utilisateurs actifs</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">Administrateurs</p>
          <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">Livreurs</p>
          <p className="text-2xl font-bold text-blue-600">{stats.livreurs}</p>
        </div>
      </div>

      {/* MODAL D'AJOUT/MODIFICATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 pt-20 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[75vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold">
                {isEditMode ? 'Modifier l\'utilisateur' : 'Ajouter un Utilisateur'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="px-6 space-y-3 py-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom complet *</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} placeholder="Ex: Nom complet" />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} placeholder="exempleemail@.com" />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input type="tel" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} placeholder="9 à 14 chiffres" />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isEditMode ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}</label>
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 ${errors.password ? 'border-red-500' : 'border-gray-300'}`} placeholder={isEditMode ? "Laisser vide pour garder l'ancien" : "Entre 8 et 15 caractères"} />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  🔑 Requis pour que le livreur / préparateur puisse se connecter à son espace staff.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirmer le mot de passe {!isEditMode && '*'}</label>
                <input type="password" value={newUser.confirmPassword} onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`} placeholder="Confirmez votre mot de passe" />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rôle *</label>
                <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700">
                  <option value="Utilisateur">Utilisateur</option>
                  <option value="preparateur">Préparateur</option>
                  <option value="livreur">Livreur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Statut *</label>
                <select value={newUser.status} onChange={(e) => setNewUser({...newUser, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700">
                  <option value="active">Actif</option>
                  <option value="blocked">Bloqué</option>
                </select>
              </div>
              {/* Permission : accès complet aux commandes (voir les commandes en attente) */}
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!newUser.ordersFullAccess}
                  onChange={(e) => setNewUser({...newUser, ordersFullAccess: e.target.checked})}
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                />
                <span className="text-sm">
                  <span className="font-medium">Accès complet aux commandes</span>
                  <span className="block text-xs text-gray-500">
                    Permet de voir les commandes en attente dans l'espace staff
                    (livreur / préparateur). Décochez pour les masquer.
                  </span>
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700">
              <button onClick={closeModal} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition">Annuler</button>
              <button onClick={isEditMode ? handleEditUser : handleAddUser} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">{isEditMode ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS UTILISATEUR */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Détails de l'utilisateur</h2>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X size={24} />
                </button>
              </div>

              {/* En-tête avatar + nom */}
              <div className="flex items-center gap-4 mb-4">
                <UserAvatar user={selectedUser} className="w-16 h-16 text-lg" />
                <div>
                  <p className="text-lg font-bold">{selectedUser.name}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getRoleBadge(selectedUser.role)}`}>
                    {getRoleIcon(selectedUser.role)}
                    {getRoleLabel(selectedUser.role)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-gray-500">Email :</span>
                  <span className="font-medium">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-gray-500">Téléphone :</span>
                  <span className="font-medium">{selectedUser.phone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-500">Enregistré le :</span>
                  <span className="font-medium">{formatDate(selectedUser.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-gray-400" />
                  <span className="text-gray-500">Statut :</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(selectedUser.status)}`}>
                    {selectedUser.status === 'active' ? 'Actif' : 'Bloqué'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-gray-400" />
                  <span className="text-gray-500">Commandes :</span>
                  <span className="font-medium">{selectedUser.orders || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-500">Total dépensé :</span>
                  <span className="font-medium text-primary">{(selectedUser.totalSpent || 0).toLocaleString()} GNF</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 border-t dark:border-gray-700 pt-4">
                <button
                  onClick={() => openEditModal(selectedUser)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-2"
                >
                  <Edit size={16} />
                  Modifier
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;