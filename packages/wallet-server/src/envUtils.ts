import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const envfile = require("envfile");

// Get the project root (two levels up from wallet-server/src)
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");

/**
 * Read wallet seed and address from .env file
 */
export function readWalletFromEnv(): { seed: string | null; address: string | null } {
  try {
    if (!fs.existsSync(envPath)) {
      return { seed: null, address: null };
    }

    const envContent = fs.readFileSync(envPath, "utf-8");
    const parsed = envfile.parse(envContent);

    return {
      seed: parsed.WALLET_SEED || null,
      address: parsed.WALLET_ADDRESS || null,
    };
  } catch (error) {
    console.error("Error reading .env file:", error);
    return { seed: null, address: null };
  }
}

/**
 * Write wallet seed and address to .env file
 */
export function writeWalletToEnv(seed: string, address: string | null): void {
  try {
    let envContent = `# Midnight Testnet Configuration
# This seed phrase will be used for automated deployment
WALLET_SEED=${seed}`;

    if (address) {
      envContent += `\nWALLET_ADDRESS=${address}`;
    }

    fs.writeFileSync(envPath, envContent);
  } catch (error) {
    console.error("Error writing to .env file:", error);
    throw new Error("Failed to update .env file");
  }
}

