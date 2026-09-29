import Web3 from "web3";
import VehicleRegistryArtifact from "../build/contracts/VehicleRegistry.json";
import RevocationManagerArtifact from "../build/contracts/RevocationManager.json";
import LicenseRegistryArtifact from "../build/contracts/LicenseRegistry.json";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Known deployment addresses, keyed by chain id — used as a fallback when
// the compiled artifact's own `networks` field doesn't have an entry for
// the chain MetaMask is currently connected to. Update/add entries here as
// you deploy to new networks.
const KNOWN_ADDRESSES: Record<string, { registry: string; revocation: string; license?: string }> = {
  // Sepolia
  "11155111": {
    registry: "0xF819ca156ac0ACE5fe1d7D93A51887AeDb5a983B",
    revocation: "0xb364D96ba9Cd44B77eDE987Ad96794501985FdC6",
    // license: "0x...", // fill in once LicenseRegistry is deployed on Sepolia
  },
};

export async function connectWallet(): Promise<{ web3: Web3; account: string; chainId: string }> {
  if (!window.ethereum) throw new Error("MetaMask not found. Please install it.");
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const web3 = new Web3(window.ethereum);
  const accounts = await web3.eth.getAccounts();
  const chainId = (await web3.eth.getChainId()).toString();

  return { web3, account: accounts[0], chainId };
}

export async function getContracts() {
  const { web3, account, chainId } = await connectWallet();

  const registryAddress =
    (VehicleRegistryArtifact as any).networks?.[chainId]?.address ?? KNOWN_ADDRESSES[chainId]?.registry;
  const revocationAddress =
    (RevocationManagerArtifact as any).networks?.[chainId]?.address ?? KNOWN_ADDRESSES[chainId]?.revocation;
  const licenseAddress =
    (LicenseRegistryArtifact as any).networks?.[chainId]?.address ?? KNOWN_ADDRESSES[chainId]?.license;

  if (!registryAddress || !revocationAddress) {
    throw new Error(
      `No deployed VehicleRegistry/RevocationManager found for chain ${chainId}. Run "truffle migrate" on this network first.`
    );
  }
  if (!licenseAddress) {
    throw new Error(
      `No deployed LicenseRegistry found for chain ${chainId}. Run "truffle migrate --f 16 --to 16" on this network first.`
    );
  }

  const registry = new web3.eth.Contract((VehicleRegistryArtifact as any).abi, registryAddress);
  const revocation = new web3.eth.Contract((RevocationManagerArtifact as any).abi, revocationAddress);
  const license = new web3.eth.Contract((LicenseRegistryArtifact as any).abi, licenseAddress);

  // So every .send() call below can omit `from` if it wants to — components
  // still pass { from: account } explicitly for clarity, matching the
  // pattern in vehicle2.js.
  registry.defaultAccount = account;
  revocation.defaultAccount = account;
  license.defaultAccount = account;

  return { web3, registry, revocation, license, account, chainId };
}
