import { toGcpAccount } from "../src/";
import { createWalletClient, http, publicActions } from "viem";
import { sepolia } from "viem/chains";

async function main() {
  const credentials = process.env.CREDENTIALS;

  if (!credentials) {
    throw new Error("Provide credentials in ENV");
  }

  // Create GCP account
  const gcpAccount = await toGcpAccount({ credentials });
  const { address } = gcpAccount;
  console.log("Account: ", address);

  if (!address) return;

  // Create wallet client
  const client = createWalletClient({
    account: gcpAccount,
    chain: sepolia,
    transport: http(),
  }).extend(publicActions);

  // Message to sign
  const message = "hello world";
  console.log("Message to sign: ", message);

  // Sign the message
  console.log("Signing message...");
  const signature = await gcpAccount.signMessage({
    message,
  });

  console.log("Message signature: ", signature);

  // Verify the signature
  const isValid = await client.verifyMessage({
    address,
    message,
    signature,
  });

  console.log("Signature is valid: ", isValid);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
