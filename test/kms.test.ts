import {
  parseEther,
  parseGwei,
  recoverTransactionAddress,
  recoverTypedDataAddress,
  verifyMessage,
  zeroAddress,
} from "viem";
import { toGcpAccount } from "../src";
import { TYPED_DATA } from "../test/values";
import { expect, describe, it } from "bun:test";

const MOCK_KEY = process.env.CREDENTIALS!;
const INVALID_KEY =
  "projects/points-409708/locations/global/keyRings/TEST/cryptoKeys/invalid/cryptoKeyVersions/1";

describe("toGcpAccount", () => {
  it("returns valid account for hsm key", async () => {
    const gcpAccount = await toGcpAccount({
      credentials: MOCK_KEY,
    });
    expect(gcpAccount).toEqual({
      address: "0x201Eb1a4fA266588A1fA5E6265D0476e35d95d72",
      publicKey:
        "0x04836ed3118d93b3856df8eada27b6e39f0f500de9a75fbf1525c3d07817ec83c099bb2d75e5ab808637e1f442adfac20be4b2b67b818f49d11491c1b94e294f9c",
      signMessage: expect.any(Function),
      signTransaction: expect.any(Function),
      signTypedData: expect.any(Function),
      source: "gcp",
      type: "local",
    });
  });

  it("throws error on invalid hsm key", async () => {
    await expect(
      toGcpAccount({
        credentials: INVALID_KEY,
      }),
    ).rejects.toThrow();
  });

  it("signs message", async () => {
    const gcpAccount = await toGcpAccount({
      credentials: MOCK_KEY,
    });

    const message = "hello world";
    const signature = await gcpAccount.signMessage({ message });

    expect(
      verifyMessage({
        address: "0x201Eb1a4fA266588A1fA5E6265D0476e35d95d72",
        message,
        signature,
      }),
    ).resolves.toBeTruthy();
  });

  it("signs hex message", async () => {
    const gcpAccount = await toGcpAccount({
      credentials: MOCK_KEY,
    });

    const message = "0x68656c6c6f20776f726c64"; // "hello world" in hex
    const signature = await gcpAccount.signMessage({ message });

    expect(
      verifyMessage({
        address: "0x201Eb1a4fA266588A1fA5E6265D0476e35d95d72",
        message,
        signature,
      }),
    ).resolves.toBeTruthy();
  });

  it("signs tx", async () => {
    const gcpAccount = await toGcpAccount({
      credentials: MOCK_KEY,
    });
    const signedTx = await gcpAccount.signTransaction({
      chainId: 1,
      maxFeePerGas: parseGwei("20"),
      gas: 21000n,
      to: zeroAddress,
      value: parseEther("1"),
    });

    await expect(
      recoverTransactionAddress({
        serializedTransaction: signedTx,
      }),
    ).resolves.toBe("0x201Eb1a4fA266588A1fA5E6265D0476e35d95d72");
  });

  it("signs typed data", async () => {
    const gcpAccount = await toGcpAccount({
      credentials: MOCK_KEY,
    });
    const signature = await gcpAccount.signTypedData(TYPED_DATA);

    await expect(
      recoverTypedDataAddress({
        ...TYPED_DATA,
        signature,
      }),
    ).resolves.toBe("0x201Eb1a4fA266588A1fA5E6265D0476e35d95d72");
  });
});
