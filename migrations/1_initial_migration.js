const Owner = artifacts.require("Owner");
const Ballot = artifacts.require("Ballot");
const Storage = artifacts.require("Storage");

module.exports = async function (deployer) {
  await deployer.deploy(Owner);
  await deployer.deploy(Ballot, [web3.utils.asciiToHex("ProposalA"), web3.utils.asciiToHex("ProposalB")]);
  await deployer.deploy(Storage);
};