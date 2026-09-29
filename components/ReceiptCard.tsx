import { Receipt } from "../utils/receipts";
import styles from "../styles/VehicleDemo.module.css";

// Renders a Receipt built straight from a transaction's own hash, block
// number, and emitted event — nothing here comes from a database. This is
// the on-chain "receipt" the user sees right after registering a vehicle,
// issuing a license, or processing a revocation.
export default function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <div className={styles.receipt}>
      <div className={styles.receiptHeader}>
        <span className={styles.receiptAction}>{receipt.action}</span>
        <span className={styles.receiptSubject}>{receipt.subject}</span>
      </div>
      <div className={styles.receiptBody}>
        {Object.entries(receipt.details).map(([key, value]) => (
          <div key={key} className={styles.receiptRow}>
            <span className={styles.receiptLabel}>{key}</span>
            <span>{value}</span>
          </div>
        ))}
        <div className={styles.receiptRow}>
          <span className={styles.receiptLabel}>block</span>
          <span>#{receipt.blockNumber}</span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptLabel}>time</span>
          <span>{receipt.timestamp}</span>
        </div>
        <div className={styles.receiptRow}>
          <span className={styles.receiptLabel}>tx</span>
          <code className={styles.receiptTx}>{receipt.txHash}</code>
        </div>
      </div>
    </div>
  );
}
