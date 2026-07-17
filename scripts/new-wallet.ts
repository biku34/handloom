/**
 * Generate a fresh custodial wallet for on-chain anchoring.
 * Run:  npm run wallet:new
 * Then fund the printed address with free test POL from the Amoy faucet and put
 * the private key in .env.local as CHAIN_PRIVATE_KEY.
 *
 * SECURITY: this key signs every anchor and pays gas. On a testnet it holds only
 * free test tokens. Never commit it; never reuse a mainnet key that holds funds.
 */
import { Wallet } from "ethers";

const w = Wallet.createRandom();
console.log("\n── New SUTRA anchoring wallet ──\n");
console.log("Address    :", w.address);
console.log("Private key:", w.privateKey);
console.log("\nNext steps:");
console.log("  1. Copy the private key into .env.local as CHAIN_PRIVATE_KEY");
console.log("  2. Fund the ADDRESS with free test POL (any ONE of these):");
console.log("       https://faucet.polygon.technology/           (select Polygon Amoy)");
console.log("       https://www.alchemy.com/faucets/polygon-amoy (sign in with your Alchemy account)");
console.log("     Avoid faucets.chain.link — it requires holding 1 LINK on Ethereum mainnet.");
console.log("  3. In .env.local set ALCHEMY_API_KEY (your Alchemy app key) and CHAIN_ENABLED=true");
console.log("  4. Restart the dev server. New actions will anchor automatically.\n");
