import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  realtimeHandler: null as null | ((payload: any) => void),
  dbResult: { data: null as any, error: null as any },
}));

vi.mock("@/integrations/supabase/client", () => {
  const makeChannel = () => {
    const channel: any = {
      on: vi.fn((_e: string, _f: any, cb: any) => {
        h.realtimeHandler = cb;
        return channel;
      }),
      subscribe: vi.fn(() => channel),
    };
    return channel;
  };
  return {
    supabase: {
      auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "t" } } })) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => h.dbResult) })),
        })),
      })),
      channel: vi.fn(() => makeChannel()),
      removeChannel: vi.fn(),
    },
  };
});

import {
  usePaymentAccount,
  PAYMENT_CACHE_KEY,
  readCachedPayment,
} from "./usePaymentAccount";

const SAVED = {
  account_number: "8923918202",
  bank_name: "MONIEPOINT MFB",
  account_name: "CHIMA SAMSON NWURA",
  amount: "7200",
};

describe("usePaymentAccount", () => {
  beforeEach(() => {
    localStorage.clear();
    h.realtimeHandler = null;
    h.dbResult = { data: null, error: new Error("db unavailable") };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the saved payment account when the network is unavailable", async () => {
    localStorage.setItem(PAYMENT_CACHE_KEY, JSON.stringify(SAVED));
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));

    const { result } = renderHook(() => usePaymentAccount(true));

    await waitFor(() => expect(result.current.paymentDetails).toEqual(SAVED));
    expect(result.current.paymentError).toBeNull();
  });

  it("shows the saved account immediately while a slow request is pending", async () => {
    localStorage.setItem(PAYMENT_CACHE_KEY, JSON.stringify(SAVED));
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const { result } = renderHook(() => usePaymentAccount(true));

    await waitFor(() => expect(result.current.paymentDetails).toEqual(SAVED));
    expect(result.current.paymentError).toBeNull();
  });

  it("errors only when there is no cached account and the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));

    const { result } = renderHook(() => usePaymentAccount(true));

    await waitFor(() => expect(result.current.paymentError).toMatch(/Unable to load payment details/));
    expect(result.current.paymentDetails).toBeNull();
  });

  it("applies admin changes instantly from the realtime channel and caches them", async () => {
    localStorage.setItem(PAYMENT_CACHE_KEY, JSON.stringify(SAVED));
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const { result } = renderHook(() => usePaymentAccount(true));
    await waitFor(() => expect(result.current.paymentDetails).toEqual(SAVED));
    expect(h.realtimeHandler).toBeTruthy();

    const updated = {
      account_number: "1234567890",
      bank_name: "OPAY",
      account_name: "SMART PAY LTD",
      amount: "7500",
    };

    await act(async () => {
      h.realtimeHandler!({ new: updated });
    });

    await waitFor(() => expect(result.current.paymentDetails).toEqual(updated));
    expect(readCachedPayment()).toEqual(updated);
  });

  it("ignores blocked accounts pushed over realtime", async () => {
    localStorage.setItem(PAYMENT_CACHE_KEY, JSON.stringify(SAVED));
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const { result } = renderHook(() => usePaymentAccount(true));
    await waitFor(() => expect(result.current.paymentDetails).toEqual(SAVED));

    await act(async () => {
      h.realtimeHandler!({
        new: {
          account_number: "8985834623",
          bank_name: "PALMPAY BANK",
          account_name: "VICTOR NNAMDI",
          amount: "7200",
        },
      });
    });

    expect(result.current.paymentDetails).toEqual(SAVED);
    expect(readCachedPayment()).toEqual(SAVED);
  });
});
