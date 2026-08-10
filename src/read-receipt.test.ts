import assert from "node:assert/strict";
import test from "node:test";
import {
  createHostedReadReceipt,
  verifyHostedReadReceipt,
} from "./tools/utils.js";
import { isPrivateOrReservedIp } from "./tools/assets.js";

test("hosted read receipts are token-bound, target-bound, and expire", () => {
  const issuedAt = 1_000_000;
  const receipt = createHostedReadReceipt("layout::one", "access-token-a", issuedAt);

  assert.equal(
    verifyHostedReadReceipt(
      receipt,
      "layout::one",
      "access-token-a",
      issuedAt + 60_000,
    ),
    true,
  );
  assert.equal(
    verifyHostedReadReceipt(
      receipt,
      "layout::two",
      "access-token-a",
      issuedAt + 60_000,
    ),
    false,
  );
  assert.equal(
    verifyHostedReadReceipt(
      receipt,
      "layout::one",
      "access-token-b",
      issuedAt + 60_000,
    ),
    false,
  );
  assert.equal(
    verifyHostedReadReceipt(
      receipt,
      "layout::one",
      "access-token-a",
      issuedAt + 10 * 60_000 + 1,
    ),
    false,
  );
});

test("hosted read receipts reject malformed and future-issued values", () => {
  assert.equal(verifyHostedReadReceipt("invalid", "target", "token"), false);

  const receipt = createHostedReadReceipt("target", "token", 50_000);
  assert.equal(verifyHostedReadReceipt(receipt, "target", "token", 49_999), false);
});

test("hosted asset fetches block private, mapped, and documentation networks", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "100.64.1.2",
    "169.254.169.254",
    "192.168.1.2",
    "198.51.100.7",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ]) {
    assert.equal(isPrivateOrReservedIp(address), true, address);
  }
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIp("2606:4700:4700::1111"), false);
});
