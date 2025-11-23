"use client";

interface MatchTypeSelectorProps {
  value: "to6" | "to4" | "to3";
  onChange: (value: "to6" | "to4" | "to3") => void;
  label?: string;
}

export default function MatchTypeSelector({
  value,
  onChange,
  label = "Match Type",
}: MatchTypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div
        role="tablist"
        aria-label="Match type"
        className="inline-flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 border border-gray-200"
      >
        <button
          type="button"
          role="tab"
          aria-selected={value === "to3"}
          onClick={() => onChange("to3")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium transition-all duration-150 ${
            value === "to3"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="text-base">🚀</span>
          <span className="text-sm">TO3</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === "to4"}
          onClick={() => onChange("to4")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium transition-all duration-150 ${
            value === "to4"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="text-base">🏸</span>
          <span className="text-sm">TO4</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === "to6"}
          onClick={() => onChange("to6")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium transition-all duration-150 ${
            value === "to6"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="text-base">🎾</span>
          <span className="text-sm">TO6</span>
        </button>
      </div>
    </div>
  );
}

