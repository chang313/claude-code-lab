import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ProfileHeader from "@/components/ProfileHeader";
import type { UserProfileWithCounts } from "@/types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: "user-1" } }, error: null }),
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: vi.fn((cb: (v: unknown) => unknown) =>
        cb({ data: null, error: null }),
      ),
    })),
  }),
}));

vi.mock("@/lib/supabase/invalidate", () => ({
  subscribe: () => () => {},
  invalidate: () => {},
  invalidateAll: () => {},
  invalidateByPrefix: () => {},
  getCache: () => undefined,
  setCache: () => {},
  subscribeToCache: () => () => {},
}));

vi.mock("@/db/follow-hooks", () => ({
  useIsFollowing: () => ({ isFollowing: false, isLoading: false }),
  useFollowUser: () => ({ followUser: vi.fn() }),
  useUnfollowUser: () => ({ unfollowUser: vi.fn() }),
}));

const baseProfile: UserProfileWithCounts = {
  id: "user-1",
  displayName: "테스트 유저",
  avatarUrl: null,
  followerCount: 5,
  followingCount: 3,
};

describe("ProfileHeader logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders logout button when isOwnProfile is true", () => {
    render(<ProfileHeader profile={baseProfile} isOwnProfile={true} />);
    expect(screen.getByRole("button", { name: /로그아웃/i })).toBeInTheDocument();
  });

  it("does NOT render logout button when isOwnProfile is false", () => {
    render(<ProfileHeader profile={baseProfile} isOwnProfile={false} />);
    expect(screen.queryByRole("button", { name: /로그아웃/i })).not.toBeInTheDocument();
  });

  it("calls signOut and redirects to /login on confirm", async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(<ProfileHeader profile={baseProfile} isOwnProfile={true} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /로그아웃/i }));
    });

    expect(window.confirm).toHaveBeenCalledWith("로그아웃 하시겠습니까?");
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("does NOT call signOut when user cancels confirm", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    render(<ProfileHeader profile={baseProfile} isOwnProfile={true} />);

    fireEvent.click(screen.getByRole("button", { name: /로그아웃/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows error message when signOut fails", async () => {
    mockSignOut.mockResolvedValueOnce({
      error: { message: "Network error" },
    });
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(<ProfileHeader profile={baseProfile} isOwnProfile={true} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /로그아웃/i }));
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText(/로그아웃에 실패했습니다/i)).toBeInTheDocument();
  });

  it("disables button during signOut to prevent double-taps", async () => {
    let resolveSignOut: (value: { error: null }) => void;
    mockSignOut.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(<ProfileHeader profile={baseProfile} isOwnProfile={true} />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /로그아웃/i }));
    });

    expect(screen.getByRole("button", { name: /로그아웃/i })).toBeDisabled();

    await act(async () => {
      resolveSignOut!({ error: null });
    });
  });
});
