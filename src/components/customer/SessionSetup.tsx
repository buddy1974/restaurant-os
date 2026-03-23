'use client';

interface Props {
  tableLabel: string;
  restaurantName: string;
  onSelect: (sessionType: 'individual' | 'group') => void;
  loading?: boolean;
}

export default function SessionSetup({
  tableLabel,
  restaurantName,
  onSelect,
  loading,
}: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Restaurant name */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{restaurantName}</h1>
          <p className="text-gray-400 mt-1">{tableLabel}</p>
        </div>

        {/* Welcome card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-1">
            Welcome 👋
          </h2>
          <p className="text-sm text-gray-400 text-center mb-6">
            How are you dining today?
          </p>

          <div className="space-y-3">
            {/* Individual */}
            <button
              onClick={() => onSelect('individual')}
              disabled={loading}
              className="w-full border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 rounded-xl p-4 flex items-center gap-4 text-left transition-all disabled:opacity-50"
            >
              <span className="text-4xl">👤</span>
              <div>
                <p className="font-bold text-gray-900">Just me</p>
                <p className="text-sm text-gray-400">
                  Individual bill — I pay for myself
                </p>
              </div>
            </button>

            {/* Group */}
            <button
              onClick={() => onSelect('group')}
              disabled={loading}
              className="w-full border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 rounded-xl p-4 flex items-center gap-4 text-left transition-all disabled:opacity-50"
            >
              <span className="text-4xl">👨‍👩‍👧</span>
              <div>
                <p className="font-bold text-gray-900">We are a group</p>
                <p className="text-sm text-gray-400">
                  Shared table — flexible payment at the end
                </p>
              </div>
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-300 text-center">
          Scan the QR code again to restart
        </p>
      </div>
    </div>
  );
}
