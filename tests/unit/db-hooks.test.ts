import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscribe, invalidate, invalidateAll } from "@/lib/supabase/invalidate";

describe("invalidation event bus", () => {
  beforeEach(() => {
    invalidateAll();
  });

  it("should notify listeners when key is invalidated", () => {
    const listener = vi.fn();
    subscribe("restaurants", listener);
    invalidate("restaurants");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should not notify listeners for unrelated keys", () => {
    const listener = vi.fn();
    subscribe("restaurants", listener);
    invalidate("menu_items");
    expect(listener).not.toHaveBeenCalled();
  });

  it("should unsubscribe correctly", () => {
    const listener = vi.fn();
    const unsub = subscribe("restaurants", listener);
    unsub();
    invalidate("restaurants");
    expect(listener).not.toHaveBeenCalled();
  });

  it("should notify all listeners on invalidateAll", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    subscribe("restaurants", listener1);
    subscribe("menu_items", listener2);
    invalidateAll();
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });
});
