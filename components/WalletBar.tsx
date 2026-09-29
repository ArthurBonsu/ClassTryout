import { useEffect, useState } from "react";
import { connectWallet } from "../utils/contracts";
import styles from "../styles/VehicleDemo.module.css";

const CHAIN_NAMES: Record<string, string> = {
  "1": "Ethereum Mainnet",
  "11155111": "Sepolia",
  "1337": "Ganache",
  "5777": "Ganache",
};

interface WalletBarProps {
  onConnected?: (address: string, chainId: string) => void;
}

export default function WalletBar({ onConnected }: WalletBarProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string>("");
  const [error, setError] = useState("");

  async function connect() {
    setError("");
    try {
      const { account: acct, chainId: cid } = await connectWallet();
      setAccount(acct);
      setChainId(cid);
      onConnected?.(acct, cid);
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Auto-connect if MetaMask already has a selected account from a previous visit.
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum?.selectedAddress) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chainLabel = chainId ? `${CHAIN_NAMES[chainId] ?? "chain"} (${chainId})` : "";

  return (
    <div className={styles.walletBar}>
      <div>
        <strong>Vehicle &amp; License Registry Demo</strong>
        <div className={styles.subtle}>Registration, licensing &amp; revocation, live on-chain</div>
      </div>
      {account ? (
        <div className={styles.walletInfo}>
          <span className={styles.pill}>{chainLabel}</span>
          <span className={styles.pill}>
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
      ) : (
        <button className={styles.button} onClick={connect}>
          Connect Wallet
        </button>
      )}
      {error && <div className={styles.errorText}>{error}</div>}
    </div>
  );
}
