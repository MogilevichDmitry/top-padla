"use client";

interface AttendGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  name: string;
  onNameChange: (name: string) => void;
  isLoading?: boolean;
  error?: string;
  title?: string;
  buttonText?: string;
  buttonColor?: "green" | "red" | "gray";
}

export default function AttendGameModal({
  isOpen,
  onClose,
  onSubmit,
  name,
  onNameChange,
  isLoading = false,
  error,
  title = "Join Game",
  buttonText = "I'm In ✋",
  buttonColor = "green",
}: AttendGameModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Enter your name"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className={`px-6 py-2 ${
                  buttonColor === "gray"
                    ? "bg-gradient-to-br from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700"
                    : buttonColor === "red"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                } text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
              >
                {isLoading ? "Submitting..." : buttonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

