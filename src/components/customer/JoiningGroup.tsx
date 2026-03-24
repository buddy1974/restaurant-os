'use client';

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

interface Props {
  restaurantName: string;
  tableLabel: string;
  hostSeatCode: string;
  yourSeatCode: string;
  isHost: boolean;
  onContinue: () => void;
}

export default function JoiningGroup({
  restaurantName,
  tableLabel,
  hostSeatCode,
  yourSeatCode,
  isHost,
  onContinue,
}: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{restaurantName}</h1>
          <p className="text-gray-400 mt-1">{tableLabel}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          {isHost ? (
            <>
              <div className="text-center mb-4">
                <span className="text-5xl">{seatEmoji[hostSeatCode] || '🪑'}</span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">
                  You are the Group Host
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Your seat: <strong>{hostSeatCode}</strong>
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-sm text-orange-700 mb-4">
                <p className="font-semibold mb-1">As Group Host you can:</p>
                <ul className="space-y-1 text-orange-600">
                  <li>✅ Pay for everyone</li>
                  <li>✅ Split the bill equally</li>
                  <li>✅ Choose who pays what</li>
                  <li>✅ Transfer host to someone else</li>
                  <li>✅ Pay only your share</li>
                </ul>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Others at the table can order freely
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <span className="text-5xl">{seatEmoji[yourSeatCode] || '🪑'}</span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">
                  Joining the group
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Your seat: <strong>{yourSeatCode}</strong>
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-600 mb-4">
                <p className="font-semibold mb-1">Group hosted by:</p>
                <p className="text-lg font-bold text-gray-800">
                  {seatEmoji[hostSeatCode] || '🪑'} {hostSeatCode}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  The host manages the group bill. You can order freely and pay your own share if you wish.
                </p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg"
        >
          Let's go! →
        </button>
      </div>
    </div>
  );
}
