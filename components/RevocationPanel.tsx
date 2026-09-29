import { useState } from "react";
import { getContracts } from "../utils/contracts";
import { buildReceipt, Receipt } from "../utils/receipts";
import ReceiptCard from "./ReceiptCard";
import styles from "../styles/VehicleDemo.module.css";

type Status<T extends string> = { type: T; message: string };

interface ReportInfo {
  offender: string;
  reporter: string;
  reason: string;
  timestamp: string;
  processed: boolean;
}

export default function RevocationPanel() {
  const [offender, setOffender] = useState("");
  const [reporter, setReporter] = useState("");
  const [reason, setReason] = useState("");
  const [reportStatus, setReportStatus] = useState<Status<"idle" | "pending" | "success" | "error">>({
    type: "idle",
    message: "",
  });
  const [reportReceipt, setReportReceipt] = useState<Receipt | null>(null);

  const [reportIdLookup, setReportIdLookup] = useState("");
  const [reportLookupStatus, setReportLookupStatus] = useState<Status<"idle" | "pending" | "error">>({
    type: "idle",
    message: "",
  });
  const [reportInfo, setReportInfo] = useState<ReportInfo | null>(null);

  const [processReportId, setProcessReportId] = useState("");
  const [processStatus, setProcessStatus] = useState<Status<"idle" | "pending" | "success" | "error">>({
    type: "idle",
    message: "",
  });
  const [processReceipt, setProcessReceipt] = useState<Receipt | null>(null);

  const [reinstatePseudonym, setReinstatePseudonym] = useState("");
  const [reinstateStatus, setReinstateStatus] = useState<Status<"idle" | "pending" | "success" | "error">>({
    type: "idle",
    message: "",
  });

  async function handleSubmitReport() {
    if (!offender.trim() || !reporter.trim() || !reason.trim()) return;
    setReportStatus({ type: "pending", message: "Confirm the transaction in your wallet..." });
    setReportReceipt(null);
    try {
      const { revocation, account } = await getContracts();

      const receipt = await revocation.methods
        .submitRevocationReport(offender.trim(), reporter.trim(), reason.trim())
        .send({ from: account, gas: "500000" });

      const eventValues = (receipt.events as any)?.ReportSubmitted?.returnValues;
      if (eventValues) {
        setReportReceipt(
          buildReceipt(
            "Revocation Report Submitted",
            `Report #${eventValues.reportId.toString()}`,
            { offender: eventValues.offender, reporter: eventValues.reporter },
            receipt.transactionHash,
            receipt.blockNumber,
            eventValues.timestamp
          )
        );
      }

      setReportStatus({
        type: "success",
        message: eventValues ? `Report submitted — ID ${eventValues.reportId.toString()}` : "Report submitted.",
      });
      setOffender("");
      setReporter("");
      setReason("");
    } catch (err: any) {
      setReportStatus({ type: "error", message: err.message });
    }
  }

  async function handleLookupReport() {
    if (!reportIdLookup.trim()) return;
    setReportLookupStatus({ type: "pending", message: "Reading from chain..." });
    setReportInfo(null);
    try {
      const { revocation } = await getContracts();
      const report: any = await revocation.methods.getReport(reportIdLookup.trim()).call();
      setReportInfo({
        offender: report.offender,
        reporter: report.reporter,
        reason: report.reason,
        timestamp: new Date(Number(report.timestamp) * 1000).toLocaleString(),
        processed: report.processed,
      });
      setReportLookupStatus({ type: "idle", message: "" });
    } catch (err: any) {
      setReportLookupStatus({ type: "error", message: err.message });
    }
  }

  async function handleProcess() {
    if (!processReportId.trim()) return;
    setProcessStatus({ type: "pending", message: "Confirm the transaction in your wallet... (admin only)" });
    setProcessReceipt(null);
    try {
      const { revocation, account } = await getContracts();
      const receipt = await revocation.methods.processRevocation(processReportId.trim()).send({
        from: account,
        gas: "500000",
      });

      const eventValues = (receipt.events as any)?.VehicleRevoked?.returnValues;
      if (eventValues) {
        setProcessReceipt(
          buildReceipt(
            "Vehicle Revoked",
            eventValues.pseudonym,
            { reason: eventValues.reason, reportId: processReportId.trim() },
            receipt.transactionHash,
            receipt.blockNumber,
            eventValues.timestamp
          )
        );
      }

      setProcessStatus({ type: "success", message: `Report ${processReportId} processed — vehicle revoked.` });
      setProcessReportId("");
    } catch (err: any) {
      setProcessStatus({ type: "error", message: err.message });
    }
  }

  async function handleReinstate() {
    if (!reinstatePseudonym.trim()) return;
    setReinstateStatus({ type: "pending", message: "Confirm the transaction in your wallet... (admin only)" });
    try {
      const { revocation, account } = await getContracts();
      await revocation.methods.reinstateVehicle(reinstatePseudonym.trim()).send({ from: account, gas: "300000" });
      setReinstateStatus({ type: "success", message: `"${reinstatePseudonym.trim()}" reinstated.` });
      setReinstatePseudonym("");
    } catch (err: any) {
      setReinstateStatus({ type: "error", message: err.message });
    }
  }

  return (
    <div className={styles.card}>
      <h2>Revocation</h2>

      <div className={styles.section}>
        <label className={styles.label}>Report a vehicle</label>
        <div className={styles.stackedInputs}>
          <input
            className={styles.input}
            placeholder="Offender pseudonym"
            value={offender}
            onChange={(e) => setOffender(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Reporter pseudonym"
            value={reporter}
            onChange={(e) => setReporter(e.target.value)}
          />
          <input className={styles.input} placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className={styles.button} onClick={handleSubmitReport} disabled={reportStatus.type === "pending"}>
            Submit Report
          </button>
        </div>
        {reportStatus.message && (
          <div
            className={
              reportStatus.type === "error"
                ? styles.errorText
                : reportStatus.type === "success"
                ? styles.successText
                : styles.subtle
            }
          >
            {reportStatus.message}
          </div>
        )}
        {reportReceipt && <ReceiptCard receipt={reportReceipt} />}
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Look up a report</label>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="Report ID"
            value={reportIdLookup}
            onChange={(e) => setReportIdLookup(e.target.value)}
          />
          <button className={styles.buttonSecondary} onClick={handleLookupReport}>
            Get Report
          </button>
        </div>
        {reportLookupStatus.message && (
          <div className={reportLookupStatus.type === "error" ? styles.errorText : styles.subtle}>
            {reportLookupStatus.message}
          </div>
        )}
        {reportInfo && (
          <div className={styles.resultBox}>
            <div>
              <span className={styles.resultLabel}>Offender:</span> {reportInfo.offender}
            </div>
            <div>
              <span className={styles.resultLabel}>Reporter:</span> {reportInfo.reporter}
            </div>
            <div>
              <span className={styles.resultLabel}>Reason:</span> {reportInfo.reason}
            </div>
            <div>
              <span className={styles.resultLabel}>Submitted:</span> {reportInfo.timestamp}
            </div>
            <div>
              <span className={styles.resultLabel}>Processed:</span>{" "}
              {reportInfo.processed ? (
                <span className={styles.badgeRevoked}>Yes</span>
              ) : (
                <span className={styles.badgeActive}>Not yet</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.adminSection}>
        <div className={styles.adminLabel}>Admin actions</div>
        <div className={styles.subtle}>
          Only the wallet that deployed RevocationManager can complete these — anyone else will see the contract revert.
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Process a report (revokes the offender)</label>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              placeholder="Report ID"
              value={processReportId}
              onChange={(e) => setProcessReportId(e.target.value)}
            />
            <button className={styles.buttonAdmin} onClick={handleProcess} disabled={processStatus.type === "pending"}>
              Process
            </button>
          </div>
          {processStatus.message && (
            <div
              className={
                processStatus.type === "error"
                  ? styles.errorText
                  : processStatus.type === "success"
                  ? styles.successText
                  : styles.subtle
              }
            >
              {processStatus.message}
            </div>
          )}
          {processReceipt && <ReceiptCard receipt={processReceipt} />}
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Reinstate a vehicle</label>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              placeholder="Vehicle pseudonym"
              value={reinstatePseudonym}
              onChange={(e) => setReinstatePseudonym(e.target.value)}
            />
            <button className={styles.buttonAdmin} onClick={handleReinstate} disabled={reinstateStatus.type === "pending"}>
              Reinstate
            </button>
          </div>
          {reinstateStatus.message && (
            <div
              className={
                reinstateStatus.type === "error"
                  ? styles.errorText
                  : reinstateStatus.type === "success"
                  ? styles.successText
                  : styles.subtle
              }
            >
              {reinstateStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
