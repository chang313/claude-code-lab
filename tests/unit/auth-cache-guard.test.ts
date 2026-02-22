import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// --- Mocks ---

let authChangeCallback: ((event: string, session: unknown) => void) | null =
  null;
const mockUnsubscribe = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: vi.fn(
        (cb: (event: string, session: unknown) => void) => {
          authChangeCallback = cb;
          return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
        },
      ),
    },
  }),
}));

const mockInvalidateAll = vi.fn();
vi.mock("@/lib/supabase/invalidate", () => ({
  invalidateAll: (...args: unknown[]) => mockInvalidateAll(...args),
}));

// Import AFTER mocks
import AuthCacheGuard from "@/components/AuthCacheGuard";

beforeEach(() => {
  vi.clearAllMocks();
  authChangeCallback = null;
  cleanup();
});

describe("AuthCacheGuard", () => {
  it("calls invalidateAll on SIGNED_OUT event", () => {
    render(React.createElement(AuthCacheGuard));
    expect(authChangeCallback).not.toBeNull();

    authChangeCallback!("SIGNED_OUT", null);

    expect(mockInvalidateAll).toHaveBeenCalledTimes(1);
  });

  it("calls invalidateAll on SIGNED_IN event", () => {
    render(React.createElement(AuthCacheGuard));

    authChangeCallback!("SIGNED_IN", {
      user: { id: "user-2" },
    });

    expect(mockInvalidateAll).toHaveBeenCalledTimes(1);
  });

  it("calls invalidateAll on USER_UPDATED event", () => {
    render(React.createElement(AuthCacheGuard));

    authChangeCallback!("USER_UPDATED", {
      user: { id: "user-1" },
    });

    expect(mockInvalidateAll).toHaveBeenCalledTimes(1);
  });

  it("calls invalidateAll on TOKEN_REFRESHED event", () => {
    render(React.createElement(AuthCacheGuard));

    authChangeCallback!("TOKEN_REFRESHED", {
      user: { id: "user-1" },
    });

    // TOKEN_REFRESHED should NOT invalidate (same user, just token refresh)
    expect(mockInvalidateAll).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = render(React.createElement(AuthCacheGuard));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("renders nothing (returns null)", () => {
    const { container } = render(React.createElement(AuthCacheGuard));
    expect(container.innerHTML).toBe("");
  });
});
