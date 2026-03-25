'use client';

import { useState } from 'react';

interface Props {
  tableLabel: string;
  restaurantName: string;
  onSelectIndividual: () => void;
  onSelectHost: () => void;
  loading?: boolean;
}

export default function SessionSetup({
  tableLabel,
  restaurantName,
  onSelectIndividual,
  onSelectHost,
  loading,
}: Props) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{restaurantName}</h1>
          <p className="text-gray-400 mt-1">{tableLabel}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Welcome 👋</h2>
          <p className="text-sm text-gray-400 text-center mb-6">How are you paying today?</p>

          <div className="space-y-3">
            {/* Just me */}
            <button
              onClick={() => onSelectIndividual()}
              disabled={loading}
              className="w-full border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 rounded-xl p-4 flex items-center gap-4 text-left transition-all disabled:opacity-50"
            >
              <span className="text-4xl">👤</span>
              <div>
                <p className="font-bold text-gray-900">I pay for myself</p>
                <p className="text-sm text-gray-400">My own bill — I order and I pay</p>
              </div>
            </button>

            {/* Has a group code */}
            {!showCodeInput ? (
              <button
                onClick={() => setShowCodeInput(true)}
                disabled={loading}
                className="w-full border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 flex items-center gap-4 text-left transition-all disabled:opacity-50"
              >
                <span className="text-4xl">🎟️</span>
                <div>
                  <p className="font-bold text-gray-900">I have a group code</p>
                  <p className="text-sm text-gray-400">Someone else is paying — enter their code</p>
                </div>
              </button>
            ) : (
              <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4">
                <p className="font-bold text-gray-900 mb-3">Enter group code</p>
                <input
                  type="text"
                  value={groupCodeInput}
                  onChange={(e) => setGroupCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. T1-LEMON"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase mb-2 bg-white"
                  autoFocus
                />
                {codeError && (
                  <p className="text-xs text-red-500 mb-2">{codeError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCodeInput(false);
                      setGroupCodeInput('');
                      setCodeError('');
                    }}
                    className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!groupCodeInput.trim()) {
                        setCodeError('Please enter a group code');
                        return;
                      }
                      const slug = window.location.pathname.split('/')[1];
                      window.location.href = `/${slug}/join/${groupCodeInput.trim()}`;
                    }}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold"
                  >
                    Join Group →
                  </button>
                </div>
              </div>
            )}

            {/* I am host */}
            <button
              onClick={onSelectHost}
              disabled={loading}
              className="w-full border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 rounded-xl p-4 flex items-center gap-4 text-left transition-all disabled:opacity-50"
            >
              <span className="text-4xl">👑</span>
              <div>
                <p className="font-bold text-gray-900">I pay for the group</p>
                <p className="text-sm text-gray-400">Start a group — others join with your code</p>
              </div>
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-300 text-center">Scan the QR code again to restart</p>
      </div>
    </div>
  );
}
