import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">

        <div className="mb-8">
          <p className="text-6xl mb-4">🍽️</p>
          <h1 className="text-4xl font-black text-white mb-2">Restaurant OS</h1>
          <p className="text-gray-400 text-lg">
            Modern ordering system for restaurants
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 mb-6 text-left space-y-3">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
            How it works
          </p>
          <div className="flex items-start gap-3">
            <span className="text-xl">📱</span>
            <p className="text-sm text-gray-300">Customer scans QR code on their table</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🛒</span>
            <p className="text-sm text-gray-300">Orders directly from their phone</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">💳</span>
            <p className="text-sm text-gray-300">Pays by card or cash — group or individual</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">📲</span>
            <p className="text-sm text-gray-300">Staff notified instantly via Telegram</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">
            Live Demo
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/demo/menu/1"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 px-4 text-sm font-semibold transition-colors text-center"
            >
              📱 Customer Menu
            </Link>
            <Link
              href="/demo/staff"
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-xl py-3 px-4 text-sm font-semibold transition-colors text-center"
            >
              👨‍💼 Staff View
            </Link>
            <Link
              href="/demo/admin"
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-xl py-3 px-4 text-sm font-semibold transition-colors text-center"
            >
              ⚙️ Admin Panel
            </Link>
            <Link
              href="/demo/menu/2"
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-xl py-3 px-4 text-sm font-semibold transition-colors text-center"
            >
              🪑 Table 2
            </Link>
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Scan a table QR code to experience the real customer flow
        </p>

        <div className="mt-8 pt-6 border-t border-gray-800">
          <a
            href="https://maxpromo.digital"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Powered by maxpromo.digital
          </a>
        </div>

      </div>
    </div>
  );
}
