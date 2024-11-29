import { publicKeyToAddress, toAccount } from "viem/accounts";
import { getPublicKey, sign } from "./kms";
import {
  hashMessage,
  hashTypedData,
  isHex,
  keccak256,
  serializeSignature,
  serializeTransaction,
  type LocalAccount,
} from "viem";
import { KeyManagementServiceClient } from "@google-cloud/kms";

export type GcpAccount = LocalAccount<"gcp">;

export const toGcpAccount = async ({
  credentials,
}: {
  credentials: string | GcpKeyCredentials;
}): Promise<GcpAccount> => {
  const kms = new KeyManagementServiceClient();
  const publicKey = await getPublicKey(kms, credentials);

  const account = toAccount({
    address: publicKeyToAddress(publicKey),
    async signMessage({ message }) {
      const signature = await sign(
        kms,
        isHex(message)
          ? hashMessage({
              raw: message,
            })
          : hashMessage(message),
        publicKey,
        credentials,
      );

      return serializeSignature(signature);
    },

    async signTransaction(
      transaction,
      { serializer = serializeTransaction } = {},
    ) {
      // Copied from someone who copied from viem (don't remember anymore)
      // Copied from https://github.com/wevm/viem/blob/e6c47807f32d14ded53c40831177ee80c5a47a10/src/accounts/utils/signTransaction.ts
      // TODO: would be nice for this to be done before in viem
      // so custom Account implementations don't have to worry about it
      const signableTransaction = (() => {
        // For EIP-4844 Transactions, we want to sign the transaction payload body (tx_payload_body) without the sidecars (ie. without the network wrapper).
        // See: https://github.com/ethereum/EIPs/blob/e00f4daa66bd56e2dbd5f1d36d09fd613811a48b/EIPS/eip-4844.md#networking
        if (transaction.type === "eip4844")
          return {
            ...transaction,
            sidecars: false,
          };
        return transaction;
      })();

      const hash = keccak256(serializer(signableTransaction));
      const signature = await sign(kms, hash, publicKey, credentials);

      return serializer(transaction, signature);
    },

    async signTypedData(typedData) {
      const signature = await sign(
        kms,
        hashTypedData(typedData),
        publicKey,
        credentials,
      );
      return serializeSignature(signature);
    },
  });

  return {
    ...account,
    publicKey,
    source: "gcp",
  };
};
