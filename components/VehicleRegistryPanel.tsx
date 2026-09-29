import { useState } from "react";
import { getContracts } from "../utils/contracts";
import { buildReceipt, Receipt } from "../utils/receipts";
import ReceiptCard from "./ReceiptCard";
import styles from "../styles/VehicleDemo.module.css";

type Status<T extends string> = { type: T; message: string };

interface VehicleInfo {
  owner: string;
  registrationTime: string;
  isRegistered: boolean;
  isRevoked: boolean;
  revokedReason?: string;
}

export default function VehicleRegistryPanel() {
  const [registerPseudonym, setRegisterPseudonym] = useState("");
  const [registerStatus, setRegisterStatus] = useState<Status<"idle" | "pending" | "success" | "error">>({
    type: "idle",
    message: "",
  });
  const [registerReceipt, setRegisterReceipt] = useState<Receipt | null>(null);

  const [lookupPseudonym, setLookupPseudonym] = useState("");
  const [lookupStatus, setLookupStatus] = useState<Status<"idle" | "pending" | "error">>({
    type: "idle",
    message: "",
  });
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);

  async function handleRegister() {
    if (!registerPseudonym.trim()) return;
    setRegisterStatus({ type: "pending", message: "Confirm the transaction in your wallet..." });
    setRegisterReceipt(null);
    try {
      const { registry, account } = await getContracts();
      const pseudonym = registerPseudonym.trim();

      const receipt = await registry.methods.registerVehicle(pseudonym).send({ from: account, gas: "300000" });

      const eventValues = (receipt.events as any)?.VehicleRegistered?.returnValues;
      if (eventValues) {
        setRegisterReceipt(
          buildReceipt(
            "Vehicle Registered",
            pseudonym,
            { owner: eventValues.owner },
            receipt.transactionHash,
            receipt.blockNumber,
            eventValues.timestamp
          )
        );
      }

      setRegisterStatus({ type: "success", message: `"${pseudonym}" registered on-chain.` });
      setRegisterPseudonym("");
    } catch (err: any) {
      setRegisterStatus({ type: "error", message: err.message });
    }
  }

  async function handleLookup() {
    if (!lookupPseudonym.trim()) return;
    setLookupStatus({ type: "pending", message: "Reading from chain..." });
    setVehicleInfo(null);
    try {
      const { registry, revocation } = await getContracts();
      const pseudonym = lookupPseudonym.trim();
      const vehicle: any = await registry.methods.getVehicle(pseudonym).call();

      if (!vehicle.isRegistered) {
        setLookupStatus({ type: "idle", message: "" });
        setVehicleInfo({ owner: vehicle.owner, registrationTime: "0", isRegistered: false, isRevoked: false });
        return;
      }

      const isRevoked: boolean = await revocation.methods.isRevoked(pseudonym).call();
      let revokedReason: string | undefined;
      if (isRevoked) {
        const details: any = await revocation.methods.getRevocationDetails(pseudonym).call();
        revokedReason = details.reason;
      }

      setVehicleInfo({
        owner: vehicle.owner,
        registrationTime: new Date(Number(vehicle.registrationTime) * 1000).toLocaleString(),
        isRegistered: vehicle.isRegistered,
        isRevoked,
        revokedReason,
      });
      setLookupStatus({ type: "idle", message: "" });
    } catch (err: any) {
      setLookupStatus({ type: "error", message: err.message });
    }
  }

  return (
    <div className={styles.card}>
      <h2>Vehicle Registry</h2>

      <div className={styles.section}>
        <label className={styles.label}>Register a vehicle</label>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="Vehicle pseudonym, e.g. car-001"
            value={registerPseudonym}
            onChange={(e) => setRegisterPseudonym(e.target.value)}
          />
          <button className={styles.button} onClick={handleRegister} disabled={registerStatus.type === "pending"}>
            Register
          </button>
        </div>
        {registerStatus.message && (
          <div
            className={
              registerStatus.type === "error"
                ? styles.errorText
                : registerStatus.type === "success"
                ? styles.successText
                : styles.subtle
            }
          >
            {registerStatus.message}
          </div>
        )}
        {registerReceipt && <ReceiptCard receipt={registerReceipt} />}
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Look up a vehicle</label>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="Vehicle pseudonym to check"
            value={lookupPseudonym}
            onChange={(e) => setLookupPseudonym(e.target.value)}
          />
          <button className={styles.buttonSecondary} onClick={handleLookup}>
            Look Up
          </button>
        </div>
        {lookupStatus.message && (
          <div className={lookupStatus.type === "error" ? styles.errorText : styles.subtle}>{lookupStatus.message}</div>
        )}

        {vehicleInfo && (
          <div className={styles.resultBox}>
            {!vehicleInfo.isRegistered ? (
              <div className={styles.errorText}>Not registered.</div>
            ) : (
              <>
                <div>
                  <span className={styles.resultLabel}>Owner:</span> <code>{vehicleInfo.owner}</code>
                </div>
                <div>
                  <span className={styles.resultLabel}>Registered:</span> {vehicleInfo.registrationTime}
                </div>
                <div>
                  <span className={styles.resultLabel}>Status:</span>{" "}
                  {vehicleInfo.isRevoked ? (
                    <span className={styles.badgeRevoked}>
                      Revoked{vehicleInfo.revokedReason ? ` — ${vehicleInfo.revokedReason}` : ""}
                    </span>
                  ) : (
                    <span className={styles.badgeActive}>Active</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
