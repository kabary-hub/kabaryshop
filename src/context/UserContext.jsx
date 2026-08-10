import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger les utilisateurs depuis localStorage
  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadUsers = () => {
    const savedUsers = localStorage.getItem('app_users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      // Utilisateurs par défaut
      const defaultUsers = [
        { id: 1, name: 'Admin Principal', email: 'admin@kabarishop.com', role: 'admin', avatar: '👨‍💼', phone: '+224 600 000 001', status: 'active', createdAt: new Date().toISOString() },
        { id: 2, name: 'Boubacar Diallo', email: 'boubacar@kabarishop.com', role: 'livreur', avatar: '🚚', phone: '+224 600 000 002', status: 'active', createdAt: new Date().toISOString() },
        { id: 3, name: 'Mariama Camara', email: 'mariama@kabarishop.com', role: 'livreur', avatar: '🚚', phone: '+224 600 000 003', status: 'active', createdAt: new Date().toISOString() },
        { id: 4, name: 'Ibrahima Sylla', email: 'ibrahima@kabarishop.com', role: 'preparateur', avatar: '📦', phone: '+224 600 000 004', status: 'active', createdAt: new Date().toISOString() },
        { id: 5, name: 'Aissatou Bah', email: 'aissatou@kabarishop.com', role: 'preparateur', avatar: '📦', phone: '+224 600 000 005', status: 'active', createdAt: new Date().toISOString() },
        { id: 6, name: 'Mamadou Diallo', email: 'mamadou@kabarishop.com', role: 'admin', avatar: '👨‍💼', phone: '+224 600 000 006', status: 'active', createdAt: new Date().toISOString() },
      ];
      setUsers(defaultUsers);
      localStorage.setItem('app_users', JSON.stringify(defaultUsers));
    }
    setLoading(false);
  };

  const loadCurrentUser = () => {
    const savedCurrentUser = localStorage.getItem('current_user');
    if (savedCurrentUser) {
      setCurrentUser(JSON.parse(savedCurrentUser));
    } else {
      const defaultUser = { id: 1, name: 'Admin Principal', role: 'admin', avatar: '👨‍💼' };
      setCurrentUser(defaultUser);
      localStorage.setItem('current_user', JSON.stringify(defaultUser));
    }
  };

  // Sauvegarder l'utilisateur connecté
  const saveCurrentUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('current_user', JSON.stringify(user));
  };

  // Ajouter un utilisateur
  const addUser = (userData) => {
    const newUser = {
      id: users.length + 1,
      ...userData,
      avatar: getAvatarByRole(userData.role),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));
    return newUser;
  };

  // Modifier un utilisateur
  const updateUser = (userId, userData) => {
    const updatedUsers = users.map(user =>
      user.id === userId ? { ...user, ...userData, avatar: getAvatarByRole(userData.role || user.role) } : user
    );
    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));
    
    // Si l'utilisateur modifié est l'utilisateur courant, mettre à jour
    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = { ...currentUser, ...userData };
      setCurrentUser(updatedCurrent);
      localStorage.setItem('current_user', JSON.stringify(updatedCurrent));
    }
  };

  // Supprimer un utilisateur
  const deleteUser = (userId) => {
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));
  };

  // Changer le rôle d'un utilisateur
  const changeUserRole = (userId, newRole) => {
    updateUser(userId, { role: newRole });
  };

  // Obtenir l'avatar selon le rôle
  const getAvatarByRole = (role) => {
    const avatars = {
      admin: '👨‍💼',
      livreur: '🚚',
      preparateur: '📦'
    };
    return avatars[role] || '👤';
  };

  // Obtenir le libellé du rôle
  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur',
      livreur: 'Livreur',
      preparateur: 'Préparateur'
    };
    return labels[role] || role;
  };

  return (
    <UserContext.Provider value={{
      users,
      currentUser,
      loading,
      addUser,
      updateUser,
      deleteUser,
      changeUserRole,
      saveCurrentUser,
      getRoleLabel,
      getAvatarByRole
    }}>
      {children}
    </UserContext.Provider>
  );
};