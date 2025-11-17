import dotenv from "dotenv";
import { Account, RpcProvider } from "starknet";


const STARKNET_RPC_URL = "https://starknet-testnet.public.blastapi.io/rpc/v0_9";
const STARKNET_PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY as string;
const STARKNET_ACCOUNT_ADDRESS = process.env.STARKNET_ACCOUNT_ADDRESS as string;

function getProvider(): RpcProvider {
  if (!STARKNET_RPC_URL) {
    throw new Error("STARKNET_RPC_URL not configured");
  }
  return new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
}

function getStarknetAccount(): Account | null {
  if (!STARKNET_PRIVATE_KEY || !STARKNET_ACCOUNT_ADDRESS) return null;
  return new Account(
    {
      provider: getProvider(),
      address: STARKNET_ACCOUNT_ADDRESS,
      signer: STARKNET_PRIVATE_KEY,
    },
  );
}

export { getStarknetAccount };