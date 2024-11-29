import { toGcpAccount } from "../src/";
import { createWalletClient, http, publicActions } from "viem";
import { sepolia } from "viem/chains";
import { TYPED_DATA } from "../test/values";

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

  // Define the typed data
  const domain = {
    name: "MyApp",
    version: "1",
    chainId: 11155111, // Sepolia chainId
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  } as const;

  const types = {
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" },
    ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person" },
      { name: "contents", type: "string" },
    ],
  } as const;

  const message = {
    from: {
      name: "Alice",
      wallet: address,
    },
    to: {
      name: "Bob",
      wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
    },
    contents: "Hello from GCP Account!",
  } as const;

  console.log("Typed data to sign:", {
    domain,
    types,
    message,
  });

  // Sign the typed data
  console.log("Signing typed data...");
  const signature = await client.signTypedData(TYPED_DATA);

  console.log("Typed data signature:", signature);

  // Verify the signature
  const isValid = await client.verifyTypedData({
    ...TYPED_DATA,
    address,
    signature,
  });

  console.log("Signature is valid:", isValid);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
