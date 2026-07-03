import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

Deno.test("payment verification path does not insert any support chat message", () => {
  // Isolate the verify_purchase handler region
  const start = source.indexOf("verify_payment");
  assert(start > -1, "verify_payment handler must exist");
  const region = source.slice(start, start + 4000);

  // The activation auto-chat helper must be a no-op stub
  assert(
    /sendActivationChat\s*=\s*async\s*\([^)]*\)\s*=>\s*\{\s*\/\*\s*auto chat disabled/.test(source),
    "sendActivationChat must be a disabled no-op stub",
  );

  // No chat_messages insert may occur inside the verify_purchase region
  const chatInsertInVerify = /\.from\(\s*["'`]chat_messages["'`]\s*\)\s*\.insert/.test(region);
  assertEquals(chatInsertInVerify, false, "verify_purchase must not insert into chat_messages");

  // The old activation message string must be gone
  assert(
    !source.includes("Activation needed. Your payment has been confirmed"),
    "Old auto activation message string must be removed",
  );
});
