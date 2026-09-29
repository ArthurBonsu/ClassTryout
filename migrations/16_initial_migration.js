const VehicleRegistry = artifacts.require("VehicleRegistry");
const RevocationManager = artifacts.require("RevocationManager");
const LicenseRegistry = artifacts.require("LicenseRegistry");

module.exports = async function (deployer) {
  // Reuses whatever VehicleRegistry / RevocationManager are already
  // deployed on this network (from migration 15) — doesn't redeploy them.
  const vehicleRegistry = await VehicleRegistry.deployed();
  const revocationManager = await RevocationManager.deployed();

  await deployer.deploy(LicenseRegistry, vehicleRegistry.address, revocationManager.address);
};