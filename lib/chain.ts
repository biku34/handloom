import { JsonRpcProvider, Wallet, type TransactionResponse } from "ethers";

/*
 * SUTRA on-chain anchoring (Polygon).
 *
 * Model: ONE custodial platform wallet signs and pays for every anchor. No
 * weaver, co-op or consumer ever holds a key, signs, or pays gas — anchoring
 * is fully automated in the backend (SRS P2). Each ledger entry's hash is
 * written into the calldata of a tiny self-transaction; the tx is public and
 * anyone can read the 32-byte hash on Polygonscan.
 *
 * When the chain env vars are absent the whole layer is a no-op and the app
 * keeps running on the local hash-chained ledger (SRS P6 — degrade gracefully).
 */

const NETWORKS: Record<string, { name: string; chainId: number; explorer: string; alchemyBase: string }> = {
  amoy: { name: "Polygon Amoy", chainId: 80002, explorer: "https://amoy.polygonscan.com", alchemyBase: "https://polygon-amoy.g.alchemy.com/v2/" },
  polygon: { name: "Polygon", chainId: 137, explorer: "https://polygonscan.com", alchemyBase: "https://polygon-mainnet.g.alchemy.com/v2/" },
};

function cfg() {
  const network = (process.env.CHAIN_NETWORK || "amoy").toLowerCase();
  const net = NETWORKS[network] || NETWORKS.amoy;
  const alchemyKey = process.env.ALCHEMY_API_KEY || "";
  // Alchemy is the primary provider; a raw POLYGON_RPC_URL is an optional fallback.
  const rpcUrl = alchemyKey ? net.alchemyBase + alchemyKey : process.env.POLYGON_RPC_URL || "";
  return {
    enabled: process.env.CHAIN_ENABLED === "true" && !!process.env.CHAIN_PRIVATE_KEY && !!rpcUrl,
    usingAlchemy: !!alchemyKey,
    rpcUrl,
    privateKey: process.env.CHAIN_PRIVATE_KEY || "",
    net,
    confirmations: Number(process.env.CHAIN_CONFIRMATIONS || 1),
  };
}

export function isChainEnabled(): boolean {
  return cfg().enabled;
}

export function chainNetworkName(): string {
  return cfg().net.name;
}

/** "Alchemy" when an ALCHEMY_API_KEY is configured, else "public RPC". */
export function chainProviderName(): string {
  return cfg().usingAlchemy ? "Alchemy" : "public RPC";
}

export function explorerTxUrl(txHash?: string | null): string | null {
  if (!txHash) return null;
  return `${cfg().net.explorer}/tx/${txHash}`;
}

export function explorerAddressUrl(address?: string | null): string | null {
  if (!address) return null;
  return `${cfg().net.explorer}/address/${address}`;
}

// Lazily created singletons (per server process).
let _provider: JsonRpcProvider | null = null;
let _wallet: Wallet | null = null;
function wallet(): Wallet {
  const c = cfg();
  if (!_provider) _provider = new JsonRpcProvider(c.rpcUrl, c.net.chainId, { staticNetwork: true });
  if (!_wallet) _wallet = new Wallet(c.privateKey, _provider);
  return _wallet;
}

export function platformAddress(): string | null {
  if (!isChainEnabled()) return null;
  try {
    return wallet().address;
  } catch {
    return null;
  }
}

/*
 * Sequential anchor queue: transactions from one account MUST use strictly
 * increasing nonces, so we serialize sends through a single promise chain to
 * avoid nonce collisions under concurrent writes.
 */
let queue: Promise<unknown> = Promise.resolve();

export type AnchorResult = { ok: true; txHash: string; blockNumber: number; network: string } | { ok: false; error: string };

/** Anchor a 32-byte (64-hex) hash on-chain. Returns once the tx is confirmed. */
export async function anchorOnChain(hashHex: string): Promise<AnchorResult> {
  if (!isChainEnabled()) return { ok: false, error: "chain disabled" };
  const clean = hashHex.replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) return { ok: false, error: "hash must be 32 bytes" };

  const run = queue.then(async (): Promise<AnchorResult> => {
    try {
      const w = wallet();
      const c = cfg();
      // A 0-value self-tx with the hash as calldata. Marker "5355545241" = "SUTRA".
      const tx: TransactionResponse = await w.sendTransaction({
        to: w.address,
        value: 0n,
        data: "0x5355545241" + clean,
      });
      const receipt = await tx.wait(c.confirmations);
      if (!receipt || receipt.status !== 1) return { ok: false, error: "tx not confirmed" };
      return { ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber, network: c.net.name };
    } catch (e) {
      return { ok: false, error: (e as Error).message?.slice(0, 200) || "send failed" };
    }
  });
  // keep the chain alive regardless of this call's outcome
  queue = run.catch(() => undefined);
  return run;
}

/** Wallet POL/MATIC balance in ether units, for the ops dashboard. */
export async function walletBalance(): Promise<{ address: string; balance: string } | null> {
  if (!isChainEnabled()) return null;
  try {
    const w = wallet();
    const bal = await w.provider!.getBalance(w.address);
    return { address: w.address, balance: (Number(bal) / 1e18).toFixed(4) };
  } catch {
    return null;
  }
}
