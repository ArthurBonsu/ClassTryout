import Head from "next/head";
import WalletBar from "../components/WalletBar";
import VehicleRegistryPanel from "../components/VehicleRegistryPanel";
import LicensePanel from "../components/LicensePanel";
import RevocationPanel from "../components/RevocationPanel";
import VehicleHistory from "../components/VehicleHistory";
import styles from "../styles/VehicleDemo.module.css";

export default function VehicleDemoPage() {
  return (
    <>
      <Head>
        <title>Vehicle &amp; License Registry Demo</title>
      </Head>
      <main className={styles.page}>
        <WalletBar />
        <div className={styles.grid}>
          <VehicleRegistryPanel />
          <LicensePanel />
          <RevocationPanel />
          <VehicleHistory />
        </div>
      </main>
    </>
  );
}
