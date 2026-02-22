import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  subscribe,
  invalidate,
  invalidateAll,
  getCache,
  setCache,
  subscribeToCache,
} from "@/lib/supabase/invalidate";

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

describe("optimistic cache operations", () => {
  beforeEach(() => {
    invalidateAll();
  });

  it("T003a: setCache stores value retrievable by getCache", () => {
    setCache("restaurants:visited", [{ id: "1", name: "Pizza" }]);
    expect(getCache("restaurants:visited")).toEqual([{ id: "1", name: "Pizza" }]);
  });

  it("T003b: getCache returns undefined for missing key", () => {
    expect(getCache("nonexistent")).toBeUndefined();
  });

  it("T003c: subscribeToCache listener fires on setCache", () => {
    const setter = vi.fn();
    subscribeToCache("restaurants:visited", setter);
    setCache("restaurants:visited", [{ id: "1" }]);
    expect(setter).toHaveBeenCalledTimes(1);
    expect(setter).toHaveBeenCalledWith([{ id: "1" }]);
  });

  it("T003d: setCache does NOT trigger invalidation listeners", () => {
    const refetchListener = vi.fn();
    subscribe("restaurants:visited", refetchListener);
    setCache("restaurants:visited", [{ id: "1" }]);
    expect(refetchListener).not.toHaveBeenCalled();
  });

  it("T003e: unsubscribeToCache stops notifications", () => {
    const setter = vi.fn();
    const unsub = subscribeToCache("restaurants:visited", setter);
    unsub();
    setCache("restaurants:visited", [{ id: "1" }]);
    expect(setter).not.toHaveBeenCalled();
  });

  it("T003f: invalidate does NOT clear cache store", () => {
    setCache("restaurants:visited", [{ id: "1" }]);
    invalidate("restaurants:visited");
    expect(getCache("restaurants:visited")).toEqual([{ id: "1" }]);
  });
});
