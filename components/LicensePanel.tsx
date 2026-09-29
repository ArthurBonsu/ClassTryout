import { useState } from "react";
import { getContracts } from "../utils/contracts";
import { buildReceipt, Receipt } from "../utils/receipts";
import ReceiptCard from "./ReceiptCard";
import styles from "../styles/VehicleDemo.module.css";

type Status<T extends string> = { type: T; message: string };

interface LicenseInfo {
  vehiclePseudonym: string;
  owner: string;
  licenseType: string;
  issueTime: string;
  expiryTime: string;
  isActive: boolean;
  issued: boolean;
  isValid: boolean;
}

export default function LicensePanel() {
  const [licenseId, setLicenseId] = useState("");
  const [vehiclePseudonym, setVehiclePseudonym] = useState("");
  const [licenseType, setLicenseType] = useState("Standard");
  const [validityDays, setValidityDays] = useState("365");
  const [issueStatus, setIssueStatus] = useState<Status<"idle" | "pending" | "success" | "error">>({
    type: "idle",
    message: "",
  });
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const [lookupId, setLookupId] = useState("");
  const [lookupStatus, setLookupStatus] = useState<Status<"idle" | "pending" | "error">>({
    type: "idle",
    message: "",
  });
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);

  async function handleIssue() {
    if (!licenseId.trim() || !vehiclePseudonym.trim() || !licenseType.trim()) return;
    setIssueStatus({ type: "pending", message: "Confirm the transaction in your wallet..." });
    setReceipt(null);
    try {
      const { license, account } = await getContracts();
      const id = licenseId.trim();

      const txReceipt = await license.methods
        .issueLicense(id, vehiclePseudonym.trim(), licenseType.trim(), Number(validityDays) || 365)
        .send({ from: account, gas: "300000" });

      const eventValues = (txReceipt.events as any)?.LicenseIssued?.returnValues;
      if (eventValues) {
        setReceipt(
          buildReceipt(
            "License Issued",
            id,
            {
              vehicle: eventValues.vehiclePseudonym,
              owner: eventValues.owner,
              type: eventValues.licenseType,
              expires: new Date(Number(eventValues.expiryTime) * 1000).toLocaleString(),
            },
            txReceipt.transactionHash,
            txReceipt.blockNumber,
            eventValues.issueTime
          )
        );
      }

      setIssueStatus({ type: "success", message: `License "${id}" issued.` });
      setLicenseId("");
      setVehiclePseudonym("");
    } catch (err: any) {
      setIssueStatus({ type: "error", message: err.message });
    }
  }

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupStatus({ type: "pending", message: "Reading from chain..." });
    setLicenseInfo(null);
    try {
      const { license } = await getContracts();
      const id = lookupId.trim();
      const lic: any = await license.methods.getLicense(id).call();

      if (!lic.issued) {
        setLookupStatus({ type: "idle", message: "" });
        setLicenseInfo({
          vehiclePseudonym: "",
          owner: "",
          licenseType: "",
          issueTime: "",
          expiryTime: "",
          isActive: false,
          issued: false,
          isValid: false,
        });
        return;
      }

      const isValid: boolean = await license.methods.isLicenseValid(id).call();

      setLicenseInfo({
        vehiclePseudonym: lic.vehiclePseudonym,
        owner: lic.owner,
        licenseType: lic.licenseType,
        issueTime: new Date(Number(lic.issueTime) * 1000).toLocaleString(),
        expiryTime: new Date(Number(lic.expiryTime) * 1000).toLocaleString(),
        isActive: lic.isActive,
        issued: lic.issued,
        isValid,
      });
      setLookupStatus({ type: "idle", message: "" });
    } catch (err: any) {
      setLookupStatus({ type: "error", message: err.message });
    }
  }

  return (
    <div className={styles.card}>
      <h2>License</h2>

      <div className={styles.section}>
        <label className={styles.label}>Issue a license</label>
        <div className={styles.stackedInputs}>
          <input
            className={styles.input}
            placeholder="License ID, e.g. lic-001"
            value={licenseId}
            onChange={(e) => setLicenseId(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Vehicle pseudonym (must already be registered)"
            value={vehiclePseudonym}
            onChange={(e) => setVehiclePseudonym(e.target.value)}
          />
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              placeholder="License type, e.g. Standard"
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
            />
            <input
              className={styles.input}
              style={{ maxWidth: 110 }}
              type="number"
              placeholder="Days valid"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
            />
          </div>
          <button className={styles.button} onClick={handleIssue} disabled={issueStatus.type === "pending"}>
            Issue License
          </button>
        </div>
        {issueStatus.message && (
          <div
            className={
              issueStatus.type === "error"
                ? styles.errorText
                : issueStatus.type === "success"
                ? styles.successText
                : styles.subtle
            }
          >
            {issueStatus.message}
          </div>
        )}
        {receipt && <ReceiptCard receipt={receipt} />}
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Look up a license</label>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="License ID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <button className={styles.buttonSecondary} onClick={handleLookup}>
            Look Up
          </button>
        </div>
        {lookupStatus.message && (
          <div className={lookupStatus.type === "error" ? styles.errorText : styles.subtle}>{lookupStatus.message}</div>
        )}
        {licenseInfo && (
          <div className={styles.resultBox}>
            {!licenseInfo.issued ? (
              <div className={styles.errorText}>No license with that ID.</div>
            ) : (
              <>
                <div>
                  <span className={styles.resultLabel}>Vehicle:</span> {licenseInfo.vehiclePseudonym}
                </div>
                <div>
                  <span className={styles.resultLabel}>Type:</span> {licenseInfo.licenseType}
                </div>
                <div>
                  <span className={styles.resultLabel}>Issued:</span> {licenseInfo.issueTime}
                </div>
                <div>
                  <span className={styles.resultLabel}>Expires:</span> {licenseInfo.expiryTime}
                </div>
                <div>
                  <span className={styles.resultLabel}>Status:</span>{" "}
                  {licenseInfo.isValid ? (
                    <span className={styles.badgeActive}>Valid</span>
                  ) : (
                    <span className={styles.badgeRevoked}>
                      {!licenseInfo.isActive ? "Revoked" : "Expired or vehicle revoked"}
                    </span>
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
