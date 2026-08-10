// src/components/Header.jsx
import React from 'react';
import { useSettings } from '../context/SettingsContext';

const Header = () => {
  const { settings } = useSettings();

  return (
    <header className="bg-white shadow dark:bg-gray-800">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {settings.siteName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Panel d'administration
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {settings.siteEmail}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {settings.sitePhone}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;