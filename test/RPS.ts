import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import exp from "constants";
import { BigNumber } from "ethers";
import { formatBytes32String, sha256 } from "ethers/lib/utils";
import { ethers } from "hardhat";

enum Choices {
  ROCK,
  PAPER,
  SCISSORS
}

enum Result {
  P1,
  P2,
  DRAW
}

describe("Rock, Paper, Scissors", function () {
  async function deployRps() {

    const Rps = await ethers.getContractFactory("Rps");
    const rps = await Rps.deploy();

    return { rps };
  }

  async function createGame() {
    const { rps } = await loadFixture(deployRps);
    const [p1] = await ethers.getSigners();

    const clearChoice = Choices.PAPER + "-" + "test";
    const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

    const tokenAmmount = ethers.utils.parseEther("0.1"); /* 0.1 Eth */

    await rps.connect(p1).mkWager(hashedChoice, { value: tokenAmmount });

    return { rps, p1, clearChoice, tokenAmmount };
  }

  describe("mkWager", function () {
    it("Should create a game", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const clearChoice = Choices.PAPER + "-" + "test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      const weiAmmount = BigNumber.from("100000000000000000"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: weiAmmount });
      const wager = await rps.connect(p1).listWager(0);

      expect(wager.p1EncryptedRPSChoice).to.equal(hashedChoice);
      expect(wager.tokenAmmount).to.equal(weiAmmount);
      expect(wager.hasP2).to.equal(false);
    })

    it("Should throw on bet below minimum", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const clearChoice = Choices.PAPER + "-" + "test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      const weiAmmount = BigNumber.from("900000000000000"); /* 0.09 Eth */

      await expect(rps.connect(p1).mkWager(hashedChoice, { value: weiAmmount })).to.be.revertedWith("Bet ammount too low");
    })
  })

  describe("joinWager", function () {
    it("Should let p2 join the game", async function () {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const wagerIndex = 0;

      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });
      const wager = await rps.connect(p1).listWager(wagerIndex);

      expect(wager.hasP2).to.equal(true);
      expect(wager.p2).to.equal(p2.address);
      expect(wager.p2Choice).to.equal(p2Choice);
    })

    it("Should throw on too few tokens sent by p2", async function () {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const wagerIndex = 0;

      await expect(rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: BigNumber.from("100000000") })).to.revertedWith("Tokenammount to low");
    })

    it("Should throw on index out of bounds p2", async function () {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const wagerIndex = 1;

      await expect(rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount })).to.revertedWith("Index out of bounds");
    })

    it("Should throw on player joining his own game", async function () {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const p1Choice = Choices.PAPER;
      const wagerIndex = 0;

      await expect(rps.connect(p1).joinWager(p1.address, wagerIndex, p1Choice, { value: tokenAmmount })).to.revertedWith("You can't join your own game");
    })

    it("Should throw if wager already has a second player", async function () {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const [_, p2, p3] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const p3Choice = Choices.ROCK;
      const wagerIndex = 0;

      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });
      await expect(rps.connect(p3).joinWager(p1.address, wagerIndex, p3Choice, { value: tokenAmmount })).to.revertedWith("Wager already has a second player");
    })
  })

  describe("resolveWagerP1", function() {
    it("Should throw on index out of bounds", async function() {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const wagerIndex = 0;

      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });
      
      const oufOfBoundsIndex = 1;
      
      await expect(rps.connect(p1).resolveWagerP1(oufOfBoundsIndex, clearChoice)).to.revertedWith("Index out of bounds");
    })

    it("Should throw if wager doesnt have a second player", async function() {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);

      await expect(rps.connect(p1).resolveWagerP1(0, clearChoice)).to.revertedWith("Wager doesn't have a second player");
    })

    it("Should successfully play a round", async function() {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const wagerIndex = 0;
      const p2Choice = Choices.PAPER;

      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });
      await rps.connect(p1).resolveWagerP1(wagerIndex, clearChoice);
    })
  })
});
