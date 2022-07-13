import { ethers } from "hardhat";

async function main() {
  const Rps = await ethers.getContractFactory("RPS");
  const rps = await Rps.deploy();

  await rps.deployed();

  console.log("Lock with 1 ETH deployed to:", rps.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
