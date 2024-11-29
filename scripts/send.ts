import { toGcpAccount } from "../src/";
import {
  createWalletClient,
  formatEther,
  http,
  parseEther,
  publicActions,
} from "viem";
import { sepolia } from "viem/chains";

async function main() {
  const credentials = process.env.CREDENTIALS;

  if (!credentials) {
    throw new Error("Provide credentials in ENV");
  }

  const gcpAccount = await toGcpAccount({ credentials });
  const { address } = gcpAccount;
  console.log("Account: ", address);
  console.log("Pubic Key: ", gcpAccount.publicKey);

  if (!address) return;

  const client = createWalletClient({
    account: gcpAccount,
    chain: sepolia,
    transport: http(),
  }).extend(publicActions);

  const balance = await client.getBalance({ address });
  console.log(`Balance: ${formatEther(balance)} ETH`);

  console.log("Sending 0.001 ETH from GCP Account...");
  const hash = await client.sendTransaction({
    to: gcpAccount.address,
    value: parseEther("0.001"),
  });

  console.log(`View transaction https://sepolia.etherscan.io/tx/${hash}`);

  const receipt = await client.waitForTransactionReceipt({ hash });

  console.log(`Receipt: `, receipt);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
