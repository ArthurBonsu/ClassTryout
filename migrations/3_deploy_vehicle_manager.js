const VehicleRegistry = artifacts.require("VehicleRegistry");
const RevocationManager = artifacts.require("RevocationManager");

module.exports = async function (deployer) {
  const vehicleRegistry = await VehicleRegistry.deployed();

  await deployer.deploy(RevocationManager, vehicleRegistry.address);
  const revocationManager = await RevocationManager.deployed();

  // Wire the registry to the revocation manager so a revoked wallet can't
  // sidestep its revocation by simply registering a brand-new pseudonym.
  // Safe to call exactly once — VehicleRegistry.setRevocationManager() reverts
  // if it's already been set.
  await vehicleRegistry.setRevocationManager(revocationManager.address);
};