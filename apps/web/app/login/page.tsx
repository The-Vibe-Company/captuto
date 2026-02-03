'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Store mock auth data for extension testing
    // In production, this would be handled by Supabase Auth
    const mockToken = 'mock-token-' + Date.now();
    localStorage.setItem('authToken', mockToken);
    localStorage.setItem('userEmail', email);

    setIsLoggedIn(true);
  };

  const syncToExtension = async () => {
    const authToken = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');

    // Send auth data to extension via postMessage
    // The content script listens for this message
    window.postMessage(
      { type: 'VIBE_TUTO_AUTH', authToken, userEmail },
      window.location.origin
    );

    // Listen for confirmation
    const handleSyncResponse = (event: MessageEvent) => {
      if (event.data?.type === 'VIBE_TUTO_AUTH_SYNCED') {
        alert(`Synchronisé avec l'extension !\n\nVous pouvez maintenant utiliser le popup pour démarrer un enregistrement.`);
        window.removeEventListener('message', handleSyncResponse);
      }
    };
    window.addEventListener('message', handleSyncResponse);

    // Timeout if extension doesn't respond
    setTimeout(() => {
      window.removeEventListener('message', handleSyncResponse);
    }, 3000);
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Connecté !</h2>
            <p className="mt-2 text-gray-600">
              Email: {localStorage.getItem('userEmail')}
            </p>
          </div>
          <button
            onClick={syncToExtension}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Synchroniser avec l'extension
          </button>
          <p className="text-sm text-gray-500 text-center">
            Note: Cette page est temporaire pour tester l'extension.
            L'authentification Supabase sera implémentée dans THE-26.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Vibe Tuto</h1>
          <h2 className="mt-2 text-xl text-gray-600">Connexion (Test)</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="vous@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Se connecter
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center">
          Page de test - L'authentification réelle (Supabase) sera dans THE-26
        </p>
      </div>
    </div>
  );
}
