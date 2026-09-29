import { useState } from "react";
import { getContracts } from "../utils/contracts";
import { getVehicleTimeline, TimelineEntry } from "../utils/receipts";
import styles from "../styles/VehicleDemo.module.css";

// Proof that no centralized database is needed: this component's only
// data source is `getVehicleTimeline`, which reads events straight back
// off the chain via `queryFilter`. Nothing here is cached, stored, or
// served from anywhere Claude or you control — reload the page, come back
// next week, open it from a different computer entirely, and this pulls
// the exact same history straight from the node.
export default function VehicleHistory() {
  const [pseudonym, setPseudonym] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "pending" | "error"; message: string }>({
    type: "idle",
    message: "",
  });
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);

  async function handleLoad() {
    if (!pseudonym.trim()) return;
    setStatus({ type: "pending", message: "Scanning chain history..." });
    setTimeline(null);
    try {
      const { registry, revocation, license } = await getContracts();
      const result = await getVehicleTimeline({ registry, revocation, license }, pseudonym.trim());
      setTimeline(result);
      setStatus({ type: "idle", message: "" });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    }
  }

  return (
    <div className={styles.card}>
      <h2>On-Chain History</h2>
      <div className={styles.subtle}>
        No database — every entry below is read live from this vehicle&apos;s event logs across all three contracts.
      </div>

      <div className={styles.section} style={{ marginTop: 16 }}>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="Vehicle pseudonym"
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
          />
          <button className={styles.buttonSecondary} onClick={handleLoad}>
            Load Timeline
          </button>
        </div>
        {status.message && (
          <div className={status.type === "error" ? styles.errorText : styles.subtle}>{status.message}</div>
        )}

        {timeline && (
          <div className={styles.timeline}>
            {timeline.length === 0 ? (
              <div className={styles.subtle}>No events found for that pseudonym.</div>
            ) : (
              timeline.map((entry, i) => (
                <div key={i} className={styles.timelineEntry}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineType}>{entry.type}</div>
                    <div className={styles.subtle}>
                      {entry.timestamp} · block #{entry.blockNumber}
                    </div>
                    {Object.entries(entry.details).map(([key, value]) => (
                      <div key={key} className={styles.timelineDetail}>
                        <span className={styles.receiptLabel}>{key}</span> {value}
                      </div>
                    ))}
                    <code className={styles.timelineTx}>{entry.txHash}</code>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
