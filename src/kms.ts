import { KeyManagementServiceClient } from "@google-cloud/kms";
import { hexToBytes, toHex, type Hex } from "viem";
import * as asn1 from "asn1js";
import { secp256k1 } from "@noble/curves/secp256k1";

/****************************
 *         CONSTANTS        *
 ****************************/

// Including 0x prefix
const UNCOMPRESSED_PUBLIC_KEY_HEX_LENGTH = 132; // 2 * 66

/****************************
 *           CORE           *
 ****************************/

export const getPublicKey = async (
  kms: KeyManagementServiceClient,
  credentials: GcpKeyCredentials | string,
) => {
  let keyName = getKey(kms, credentials);

  const [publicKey] = await kms.getPublicKey({ name: keyName });
  if (!publicKey || !publicKey.pem)
    throw new Error(
      `Can not find key: ${typeof credentials === "object" ? credentials.keyId : credentials}`,
    );

  return publicKeyFromDer(pemToDer(publicKey.pem));
};

export async function sign(
  kms: KeyManagementServiceClient,
  digest: Hex,
  publicKey: Hex,
  credentials: GcpKeyCredentials | string,
) {
  // Get key version
  const versionName = getKey(kms, credentials);

  const hash = hexToBytes(digest);

  // Get signature from KMS
  const [{ signature }] = await kms.asymmetricSign({
    name: versionName,
    digest: { sha256: hash },
  });

  if (signature === null || signature === undefined) {
    throw new Error("Signature is null or undefined");
  }

  // Convert DER signature to normalized form
  const normalizedSig = secp256k1.Signature.fromDER(signature).normalizeS();

  // Check if public key is compressed
  const compressed = publicKey.length < UNCOMPRESSED_PUBLIC_KEY_HEX_LENGTH;

  // Try recovery bits 0-3
  for (let i = 0; i < 4; i++) {
    const recoveredSig = normalizedSig.addRecoveryBit(i);
    const recoveredPublicKey = `0x${recoveredSig.recoverPublicKey(hash).toHex(compressed)}`;

    if (publicKey === recoveredPublicKey) {
      return {
        r: toHex(recoveredSig.r),
        s: toHex(recoveredSig.s),
        v: BigInt(recoveredSig.recovery) + 27n,
        yParity: recoveredSig.recovery,
      };
    }
  }

  throw new Error("Unable to generate recovery key from signature.");
}

/****************************
 *         UTILITIES        *
 ****************************/

function getKey(
  kms: KeyManagementServiceClient,
  credentials: string | GcpKeyCredentials,
): string {
  let keyName;
  if (typeof credentials === "object") {
    keyName = kms.cryptoKeyVersionPath(
      credentials.projectId,
      credentials.locationId,
      credentials.keyRingId,
      credentials.keyId,
      credentials.keyVersion,
    );
  } else {
    keyName = credentials;
  }

  return keyName;
}

/**
 * Converts key from PEM to DER encoding.
 *
 * DER (Distinguished Encoding Rules) is a binary encoding for X.509 certificates and private keys.
 * Unlike PEM, DER-encoded files do not contain plain text statements such as -----BEGIN CERTIFICATE-----
 *
 * https://www.ssl.com/guide/pem-der-crt-and-cer-x-509-encodings-and-conversions/#:~:text=DER%20(Distinguished%20Encoding%20Rules)%20is,commonly%20seen%20in%20Java%20contexts.
 *
 * Taken as is from valora-inc/viem-account-hsm-gcp
 */
function pemToDer(pem: string): Uint8Array {
  const base64 = pem.split("\n").slice(1, -2).join("").trim();
  return new Uint8Array(Buffer.from(base64, "base64"));
}

function publicKeyFromDer(bytes: Uint8Array): Hex {
  // DER is a subset of BER (Basic Encoding Rules)
  const { result } = asn1.fromBER(bytes);
  const values = (result as asn1.Sequence).valueBlock.value;
  if (values.length < 2) {
    throw new Error("Cannot get public key from ASN.1: invalid sequence");
  }
  const value = values[1] as asn1.BitString;
  return toHex(value.valueBlock.valueHexView);
}
