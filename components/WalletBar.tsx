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

  // Keep this in sync with MetaMask itself, instead of only reading the
  // chain/account once at connect time. Without this, switching networks or
  // accounts inside MetaMask after connecting leaves the pill showing
  // whatever was true at the moment you clicked "Connect Wallet" — exactly
  // the "still shows Mainnet after I switched to Sepolia" symptom.
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleChainChanged = () => {
      // Contract addresses and any state already fetched elsewhere on the
      // page are tied to the chain we connected on. Reloading is the
      // simplest way to make sure everything re-reads the new chain
      // cleanly, and it's the pattern MetaMask itself recommends.
      window.location.reload();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Wallet locked or disconnected from this site.
        setAccount(null);
        setChainId("");
      } else {
        setAccount(accounts[0]);
      }
    };

    window.ethereum.on?.("chainChanged", handleChainChanged);
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
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
