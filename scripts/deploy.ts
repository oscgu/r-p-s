import { ethers } from "hardhat";

async function main() {
  const Rps = await ethers.getContractFactory("RPS");
  const rps = await Rps.deploy();

  await rps.deployed();

  console.log("Rps deployed to:", rps.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
