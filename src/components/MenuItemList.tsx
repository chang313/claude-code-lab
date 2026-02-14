"use client";

import { useState } from "react";

interface MenuItemListProps {
  items: Array<{ id: number; name: string }>;
  onAdd: (name: string) => void;
  onRemove: (id: number) => void;
}

export default function MenuItemList({
  items,
  onAdd,
  onRemove,
}: MenuItemListProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a menu item..."
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Menu item name"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">
          No menu items yet
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-sm">{item.name}</span>
              <button
                onClick={() => onRemove(item.id)}
                className="text-xs text-red-500 hover:text-red-700"
                aria-label={`Remove ${item.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
