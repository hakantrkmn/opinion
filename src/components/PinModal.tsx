"use client";

import { useState } from "react";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePin: (data: { pinName: string; comment: string }) => void;
}

export default function PinModal({
  isOpen,
  onClose,
  onCreatePin,
}: PinModalProps) {
  const [pinName, setPinName] = useState("");
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinName.trim() && comment.trim()) {
      onCreatePin({
        pinName: pinName.trim(),
        comment: comment.trim(),
      });
      setPinName("");
      setComment("");
    }
  };

  const handleClose = () => {
    setPinName("");
    setComment("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl">
          <h2 className="text-2xl font-bold text-center">
            What is your oPINion?
          </h2>
          <p className="text-blue-100 text-center mt-2 text-sm">
            Bu konum hakkında düşüncelerinizi paylaşın
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Pin Adı Alanı */}
          <div className="mb-4">
            <label
              htmlFor="pinName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Pin Adı
            </label>
            <input
              id="pinName"
              type="text"
              value={pinName}
              onChange={(e) => setPinName(e.target.value)}
              placeholder="Pin'inize bir isim verin..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* Yorum Alanı */}
          <div className="mb-6">
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Yorumunuz
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bu konum hakkında ne düşünüyorsunuz?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* Butonlar */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Pin Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
