"use client";

interface PinPopupProps {
  pinName: string;
  displayName: string;
  commentCount: number;
  onPinClick: () => void;
}

export default function PinPopup({
  pinName,
  displayName,
  commentCount,
  onPinClick,
}: PinPopupProps) {
  return (
    <div
      className="p-4 max-w-sm cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onPinClick}
    >
      {/* Pin Adı */}
      <div className="mb-3">
        <h3 className="text-xl font-bold text-gray-800 leading-tight">
          {pinName}
        </h3>
      </div>

      {/* Kullanıcı Bilgisi */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          Oluşturan: <span className="font-medium">{displayName}</span>
        </p>
      </div>

      {/* Yorum Sayısı */}
      <div className="flex items-center">
        <svg
          className="w-4 h-4 text-gray-500 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm text-gray-600">{commentCount} yorum</span>
      </div>
    </div>
  );
}
