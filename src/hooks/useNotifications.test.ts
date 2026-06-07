import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---- Mock supabase client ----
const subscribeMock = vi.fn();
const removeChannelMock = vi.fn();
const onAuthStateChangeMock = vi.fn();

let getUserResolver: (v: any) => void;
let getUserRejecter: (e: any) => void;
let loadResolver: (v: any) => void;
let loadRejecter: (e: any) => void;

const makeChannel = () => {
  const channel: any = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => {
      subscribeMock();
      return channel;
    }),
  };
  return channel;
};

const fromSelectChain = () => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      order: vi.fn(
        () =>
          new Promise((resolve, reject) => {
            loadResolver = resolve;
            loadRejecter = reject;
          })
      ),
    })),
  })),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(
        () =>
          new Promise((resolve, reject) => {
            getUserResolver = resolve;
            getUserRejecter = reject;
          })
      ),
      onAuthStateChange: (cb: any) => {
        onAuthStateChangeMock(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: vi.fn(() => fromSelectChain()),
    channel: vi.fn(() => makeChannel()),
    removeChannel: removeChannelMock,
  },
}));

import { useNotifications } from "./useNotifications";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("useNotifications", () => {
  let unhandled: any[] = [];
  const onUnhandled = (e: PromiseRejectionEvent) => {
    unhandled.push(e.reason);
    e.preventDefault();
  };

  beforeEach(() => {
    unhandled = [];
    window.addEventListener("unhandledrejection", onUnhandled as any);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    window.removeEventListener("unhandledrejection", onUnhandled as any);
    vi.restoreAllMocks();
  });

  it("does not call setState after unmount when getUser resolves late", async () => {
    const { result, unmount } = renderHook(() => useNotifications());

    // Unmount BEFORE getUser resolves
    unmount();

    await act(async () => {
      getUserResolver({ data: { user: { id: "user-1" } } });
      await flush();
    });

    // Initial empty state should not be replaced post-unmount.
    expect(result.current.notifications).toEqual([]);
  });

  it("does not call setState after unmount when load query resolves late", async () => {
    const { result, unmount } = renderHook(() => useNotifications());

    await act(async () => {
      getUserResolver({ data: { user: { id: "user-1" } } });
      await flush();
    });

    // Now the load query is pending. Unmount first.
    unmount();

    await act(async () => {
      loadResolver({
        data: [
          {
            id: "n1",
            type: "claim",
            message: "Hi",
            amount: 100,
            read: false,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });
      await flush();
    });

    // notifications stays empty because the safe setter blocks post-unmount writes.
    expect(result.current.notifications).toEqual([]);
  });

  it("handles getUser rejection without an unhandled promise rejection", async () => {
    const { unmount } = renderHook(() => useNotifications());

    await act(async () => {
      getUserRejecter(new Error("auth boom"));
      await flush();
      await flush();
    });

    expect(unhandled).toHaveLength(0);
    unmount();
  });

  it("handles load query rejection without an unhandled promise rejection", async () => {
    const { unmount } = renderHook(() => useNotifications());

    await act(async () => {
      getUserResolver({ data: { user: { id: "user-1" } } });
      await flush();
    });

    await act(async () => {
      loadRejecter(new Error("load boom"));
      await flush();
      await flush();
    });

    expect(unhandled).toHaveLength(0);
    unmount();
  });

  it("populates notifications when load succeeds while mounted", async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      getUserResolver({ data: { user: { id: "user-1" } } });
      await flush();
    });

    await act(async () => {
      loadResolver({
        data: [
          {
            id: "n1",
            type: "claim",
            message: "Reward",
            amount: 150000,
            read: false,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });
      await flush();
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
    expect(unhandled).toHaveLength(0);
  });
});
