import { Contract } from "web3";

/**
 * This file is the answer to "how do we see all this on the blockchain
 * without building a centralized database": we don't store anything
 * anywhere off-chain. Every write (register / issue / revoke / reinstate)
 * emits an event. A block explorer, a wallet, or this file's
 * `getVehicleTimeline` can all reconstruct full history purely by reading
 * those events back from the chain itself — the chain's own event log IS
 * the database. Two pieces make this work:
 *
 * 1. A "receipt" for a fresh transaction is built straight from the
 *    receipt web3.js hands back from `.send()` — it already comes with
 *    `.events` decoded (web3.js does this automatically when the
 *    contract's ABI has the event), so there's no manual log-parsing
 *    needed. No write to anywhere else happens.
 * 2. History for something you didn't just do yourself (or are revisiting
 *    later, in a new browser session) is read back with
 *    `contract.getPastEvents(...)` — an RPC call that asks the node "give
 *    me every log matching this event, optionally filtered by an indexed
 *    argument". That's a trustless read straight from chain state, not a
 *    call to any server Claude or you control.
 */

export interface Receipt {
  action: string;
  subject: string;
  details: Record<string, string>;
  txHash: string;
  blockNumber: number;
  timestamp: string;
}

export function buildReceipt(
  action: string,
  subject: string,
  details: Record<string, string>,
  txHash: string,
  blockNumber: number | bigint,
  timestampSeconds: bigint | number | string
): Receipt {
  return {
    action,
    subject,
    details,
    txHash,
    blockNumber: Number(blockNumber),
    timestamp: new Date(Number(timestampSeconds) * 1000).toLocaleString(),
  };
}

export interface TimelineEntry {
  type: string;
  timestamp: string;
  txHash: string;
  blockNumber: number;
  details: Record<string, string>;
}

/**
 * Pulls the full on-chain history for one vehicle pseudonym by querying
 * every relevant event across all three contracts and merging the results
 * into one chronological timeline. No off-chain storage involved — this
 * runs fresh, live, every time it's called.
 *
 * Note on indexing: VehicleRegistered/VehicleRemoved are indexed by
 * pseudonym, so those two queries are filtered efficiently at the RPC
 * level via web3's `filter` option. VehicleRevoked/VehicleReinstated/
 * LicenseIssued were NOT declared with `indexed` on the pseudonym field
 * (an easy thing to miss when writing events), so those come back as the
 * full event list and get filtered client-side here instead. Fine for a
 * demo's event volume; for a production deployment with thousands of
 * vehicles, redeploy those events with the pseudonym's hash indexed (or
 * run a subgraph) so the node does that filtering instead of the browser.
 */
export async function getVehicleTimeline(
  contracts: { registry: Contract<any>; revocation: Contract<any>; license: Contract<any> },
  vehiclePseudonym: string
): Promise<TimelineEntry[]> {
  const { registry, revocation, license } = contracts;
  const entries: TimelineEntry[] = [];
  const fromBlock = 0;
  const toBlock = "latest";

  // --- Registration (indexed — efficient) ---
  const registeredEvents = await registry.getPastEvents("VehicleRegistered", {
    filter: { pseudonym: vehiclePseudonym },
    fromBlock,
    toBlock,
  });
  for (const e of registeredEvents as any[]) {
    entries.push({
      type: "Vehicle Registered",
      timestamp: new Date(Number(e.returnValues.timestamp) * 1000).toLocaleString(),
      txHash: e.transactionHash,
      blockNumber: Number(e.blockNumber),
      details: { owner: e.returnValues.owner },
    });
  }

  // --- Removal (indexed — efficient) ---
  const removedEvents = await registry.getPastEvents("VehicleRemoved", {
    filter: { pseudonym: vehiclePseudonym },
    fromBlock,
    toBlock,
  });
  for (const e of removedEvents as any[]) {
    entries.push({
      type: "Vehicle Removed",
      timestamp: new Date(Number(e.returnValues.timestamp) * 1000).toLocaleString(),
      txHash: e.transactionHash,
      blockNumber: Number(e.blockNumber),
      details: {},
    });
  }

  // --- Revocation reports naming this vehicle as offender (not indexed by pseudonym — filtered here) ---
  const allReports = await revocation.getPastEvents("ReportSubmitted", { fromBlock, toBlock });
  for (const e of allReports as any[]) {
    if (e.returnValues.offender === vehiclePseudonym) {
      entries.push({
        type: "Revocation Report Submitted",
        timestamp: new Date(Number(e.returnValues.timestamp) * 1000).toLocaleString(),
        txHash: e.transactionHash,
        blockNumber: Number(e.blockNumber),
        details: { reporter: e.returnValues.reporter, reportId: e.returnValues.reportId.toString() },
      });
    }
  }

  // --- Revocations / reinstatements (not indexed by pseudonym — filtered here) ---
  const allRevocations = await revocation.getPastEvents("VehicleRevoked", { fromBlock, toBlock });
  for (const e of allRevocations as any[]) {
    if (e.returnValues.pseudonym === vehiclePseudonym) {
      entries.push({
        type: "Vehicle Revoked",
        timestamp: new Date(Number(e.returnValues.timestamp) * 1000).toLocaleString(),
        txHash: e.transactionHash,
        blockNumber: Number(e.blockNumber),
        details: { reason: e.returnValues.reason },
      });
    }
  }

  const allReinstatements = await revocation.getPastEvents("VehicleReinstated", { fromBlock, toBlock });
  for (const e of allReinstatements as any[]) {
    if (e.returnValues.pseudonym === vehiclePseudonym) {
      entries.push({
        type: "Vehicle Reinstated",
        timestamp: new Date(Number(e.returnValues.timestamp) * 1000).toLocaleString(),
        txHash: e.transactionHash,
        blockNumber: Number(e.blockNumber),
        details: {},
      });
    }
  }

  // --- Licenses issued for this vehicle (not indexed by pseudonym — filtered here) ---
  const allLicenses = await license.getPastEvents("LicenseIssued", { fromBlock, toBlock });
  const licenseIdsForVehicle: string[] = [];
  for (const e of allLicenses as any[]) {
    if (e.returnValues.vehiclePseudonym === vehiclePseudonym) {
      licenseIdsForVehicle.push(e.returnValues.licenseId);
      entries.push({
        type: "License Issued",
        timestamp: new Date(Number(e.returnValues.issueTime) * 1000).toLocaleString(),
        txHash: e.transactionHash,
        blockNumber: Number(e.blockNumber),
        details: {
          licenseId: e.returnValues.licenseId,
          licenseType: e.returnValues.licenseType,
          owner: e.returnValues.owner,
        },
      });
    }
  }

  // --- License revocations/reinstatements — licenseId IS indexed, so these are efficient per-license lookups ---
  for (const licenseId of licenseIdsForVehicle) {
    const revokedEvents = await license.getPastEvents("LicenseRevoked", {
      filter: { licenseId },
      fromBlock,
      toBlock,
    });
    for (const e of revokedEvents as any[]) {
      entries.push({
        type: "License Revoked",
        timestamp: new Date(Number(e.returnValues.timestamp) * 1000).toLocaleString(),
        txHash: e.transactionHash,
        blockNumber: Number(e.blockNumber),
        details: { licenseId },
      });
    }

    const reinstatedEvents = await license.getPastEvents("LicenseReinstated", {
      filter: { licenseId },
      fromBlock,
      toBlock,
    });
    for (const e of reinstatedEvents as any[]) {
      entries.push({
        type: "License Reinstated",
        timestamp: new Date(Number(e.returnValues.timestamp) * 1000).toLocaleString(),
        txHash: e.transactionHash,
        blockNumber: Number(e.blockNumber),
        details: { licenseId },
      });
    }
  }

  entries.sort((a, b) => a.blockNumber - b.blockNumber);
  return entries;
}
