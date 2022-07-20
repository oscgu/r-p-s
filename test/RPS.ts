import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";

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

const TAX = 5;

describe("Rock, Paper, Scissors", function () {
  async function deployRps() {

    const Rps = await ethers.getContractFactory("Rps");
    const rps = await Rps.deploy();

    return { rps };
  };

  async function createGame() {
    const Rps = await ethers.getContractFactory("Rps");
    const rps = await Rps.deploy();

    const [p1] = await ethers.getSigners();

    const clearChoice = Choices.PAPER + "-" + "test";
    const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

    const tokenAmmount = ethers.utils.parseEther("0.1"); /* 0.1 Eth */

    await rps.connect(p1).mkWager(hashedChoice, { value: tokenAmmount });

    return { rps, p1, clearChoice, tokenAmmount };
  };

  describe("mkWager", function () {
    it("Should create a game", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const clearChoice = "2-test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      const weiAmmount = BigNumber.from("100000000000000000"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: weiAmmount });
      const wager = await rps.connect(p1).listWager(p1.address, 0);

      expect(wager.p1EncryptedRPSChoice).to.equal(hashedChoice);
      expect(wager.tokenAmmount).to.equal(weiAmmount);
      expect(wager.hasP2).to.equal(false);
    });

    it("Should revert on bet below minimum", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const clearChoice = Choices.PAPER + "-" + "test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      const weiAmmount = BigNumber.from("900000000000000"); /* 0.09 Eth */

      await expect(rps.connect(p1).mkWager(hashedChoice, { value: weiAmmount })).to.be.revertedWith("Bet ammount too low");
    });
  });

  describe("joinWager", function () {
    it("Should let p2 join the game", async function () {
      const { rps, p1, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const wagerIndex = 0;

      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });
      const wager = await rps.connect(p1).listWager(p1.address, wagerIndex);

      expect(wager.hasP2).to.equal(true);
      expect(wager.p2).to.equal(p2.address);
      expect(wager.p2Choice).to.equal(p2Choice);
    });

    it("Should revert on too few tokens sent by p2", async function () {
      const { rps, p1 } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const wagerIndex = 0;

      await expect(rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: BigNumber.from("100000000") })).to.revertedWith("Tokenammount to low");
    });

    it("Should revert on index out of bounds p2", async function () {
      const { rps, p1, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const wagerIndex = 1;

      await expect(rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount })).to.revertedWith("Index out of bounds");
    });

    it("Should revert on player joining his own game", async function () {
      const { rps, p1, tokenAmmount } = await loadFixture(createGame);
      const p1Choice = Choices.PAPER;
      const wagerIndex = 0;

      await expect(rps.connect(p1).joinWager(p1.address, wagerIndex, p1Choice, { value: tokenAmmount })).to.revertedWith("You can't join your own game");
    });

    it("Should revert if wager already has a second player", async function () {
      const { rps, p1, tokenAmmount } = await loadFixture(createGame);
      const [_, p2, p3] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const p3Choice = Choices.ROCK;
      const wagerIndex = 0;

      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });
      await expect(rps.connect(p3).joinWager(p1.address, wagerIndex, p3Choice, { value: tokenAmmount })).to.revertedWith("Wager already has a second player");
    });
  });

  describe("resolveWagerP1", function () {
    it("Should revert on index out of bounds", async function () {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const p2Choice = Choices.PAPER;
      const wagerIndex = 0;

      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });

      const oufOfBoundsIndex = 1;

      await expect(rps.connect(p1).resolveWagerP1(oufOfBoundsIndex, clearChoice)).to.revertedWith("Index out of bounds");
    });

    it("Should revert if wager doesnt have a second player", async function () {
      const { rps, p1, clearChoice } = await loadFixture(createGame);

      await expect(rps.connect(p1).resolveWagerP1(0, clearChoice)).to.revertedWith("Wager doesn't have a second player");
    });

    it("Should let p1 resolve the wager", async function () {
      const { rps, p1, clearChoice, tokenAmmount } = await loadFixture(createGame);
      const [_, p2] = await ethers.getSigners();
      const wagerIndex = 0;
      const p2Choice = Choices.PAPER;
      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });

      await expect(await rps.connect(p1).resolveWagerP1(wagerIndex, clearChoice)).to.not.reverted;
    });

    it("Shouldn't let p1 resolve the wager if doesn't have one", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();
      const wagerIndex = 0;
      const wagerClearChoice = "test";

      await expect(rps.connect(p1).resolveWagerP1(wagerIndex, wagerClearChoice)).to.revertedWith("Index out of bounds");
    })
  });

  describe("resolveWagerP2", function () {
    it("Shouldn't let p2 resolve the wager if timer is still running", async function () {
      const Rps = await ethers.getContractFactory("Rps");
      const rps = await Rps.deploy();

      const [p1] = await ethers.getSigners();

      const clearChoice = Choices.PAPER + "-" + "test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      const tokenAmmount = ethers.utils.parseEther("0.1"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: tokenAmmount });

      const [_, p2] = await ethers.getSigners();
      const wagerIndex = 0;
      const p2Choice = Choices.PAPER;

      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });

      await expect(rps.connect(p2).resolveWagerP2(p1.address, wagerIndex)).to.revertedWith("Timer didn't run out yet");
    });

    it("Shouldn't let p2 resolve the wager if wager doesn't have a second player", async function () {
      const Rps = await ethers.getContractFactory("Rps");
      const rps = await Rps.deploy();

      const [p1] = await ethers.getSigners();

      const clearChoice = Choices.PAPER + "-" + "test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      const tokenAmmount = ethers.utils.parseEther("0.1"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: tokenAmmount });

      const [_, p2] = await ethers.getSigners();
      const wagerIndex = 0;

      await expect(rps.connect(p2).resolveWagerP2(p1.address, wagerIndex)).to.revertedWith("Wager doesn't have a second player");
    });

    it("Should clean up after resolve", async function () {
      const Rps = await ethers.getContractFactory("Rps");
      const rps = await Rps.deploy();

      const [p1] = await ethers.getSigners();

      const clearChoice = Choices.PAPER + "-" + "test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      const tokenAmmount = ethers.utils.parseEther("0.1"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: tokenAmmount });
      const [_, p2] = await ethers.getSigners();
      const wagerIndex = 0;
      const p2Choice = Choices.PAPER;
      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });
      await rps.connect(p1).resolveWagerP1(wagerIndex, clearChoice);

      await expect(rps.connect(p1).listWager(p1.address, wagerIndex)).to.be.revertedWith("Index out of bounds");
    });

    it("Should let p2 resolve the wager if the timer ran out", async function () {
      const Rps = await ethers.getContractFactory("Rps");
      const rps = await Rps.deploy();

      const [p1] = await ethers.getSigners();

      const clearChoice = Choices.PAPER + "-" + "test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      const tokenAmmount = ethers.utils.parseEther("0.1"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: tokenAmmount });
      const [_, p2] = await ethers.getSigners();
      const wagerIndex = 0;

      const p2Choice = Choices.PAPER;
      await rps.connect(p2).joinWager(p1.address, wagerIndex, p2Choice, { value: tokenAmmount });

      await network.provider.send("evm_increaseTime", [172800]); //48 hours
      await network.provider.send("evm_mine");

      const p2Bal = await p2.getBalance();
      await rps.connect(p2).resolveWagerP2(p1.address ,wagerIndex);

      await expect((await p2.getBalance()).sub(p2Bal)).to.be.approximately(parseEther("0.19"), parseEther("0.01"));
      await expect(rps.connect(p1).listWager(p1.address, wagerIndex)).to.be.revertedWith("Index out of bounds");
    });
  });

  describe("getHashChoice", function () {
    it("Should return Scissors", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();
      const choice = Choices.SCISSORS;

      const clearChoice = `${choice}-test`;
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      await expect(await rps.connect(p1).getHashChoice(hashedChoice, clearChoice)).to.equal(choice);
    });

    it("Should return Paper", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();
      const choice = Choices.PAPER;

      const clearChoice = `${choice}-test`;
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      await expect(await rps.connect(p1).getHashChoice(hashedChoice, clearChoice)).to.equal(choice);
    });

    it("Should return Rock", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();
      const choice = Choices.ROCK;

      const clearChoice = `${choice}-test`;
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);

      await expect(await rps.connect(p1).getHashChoice(hashedChoice, clearChoice)).to.equal(choice);
    });
  });

  describe("chooseWinner", function () {
    it("Should return p1 when paper and rock", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const p1Choice = Choices.PAPER;
      const p2Choice = Choices.ROCK;

      await expect(await rps.connect(p1).chooseWinner(p1Choice, p2Choice)).to.equal(Result.P1);
    });

    it("Should return p1 when rock and scissors", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const p1Choice = Choices.ROCK;
      const p2Choice = Choices.SCISSORS;

      await expect(await rps.connect(p1).chooseWinner(p1Choice, p2Choice)).to.equal(Result.P1);
    });

    it("Should return p1 when scissors and paper", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const p1Choice = Choices.SCISSORS;
      const p2Choice = Choices.PAPER;

      await expect(await rps.connect(p1).chooseWinner(p1Choice, p2Choice)).to.equal(Result.P1);
    });

    it("Should return draw when p1==p2", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const p1Choice = Choices.PAPER;
      const p2Choice = Choices.PAPER;

      await expect(await rps.connect(p1).chooseWinner(p1Choice, p2Choice)).to.equal(Result.DRAW);
    });
  });

  describe("payoutWithAppliedTax", function () {
    it("Should revert if contract doesn't have enough tokens", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();
      const tokenAmmount = utils.parseEther("1");

      await expect(rps.payoutWithAppliedTax(p1.address, tokenAmmount)).to.revertedWith("Not enough tokens in contract");
    })

    it("Should applay tax", async function () {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const initialBet = ethers.utils.parseEther("0.5");

      const payout = (initialBet.mul(2)).sub(((initialBet.mul(2)).div(100)).mul(TAX));
      const expectedBal = (initialBet.mul(2)).sub(payout);

      await rps.connect(p1).rcv({ value: initialBet.mul(2) });
      await rps.payoutWithAppliedTax(p1.address, initialBet);

      await expect(await rps.getBalance()).to.equal(expectedBal);
    })
  })

  describe("rmWager", function() {
    it("Should remove a wager and update its position", async function() {
      const { rps } = await loadFixture(deployRps);
      const [p1] = await ethers.getSigners();

      const clearChoice = "2-test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);
      const w1 = 0;

      const weiAmmount = parseEther("0.1"); /* 0.1 Eth */
      const weiAmmount2 = parseEther("0.2"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: weiAmmount });
      await rps.connect(p1).mkWager(hashedChoice, { value: weiAmmount2 });

      await rps.connect(p1).rmWagerP1(p1.address, w1);
      
      expect(await (await rps.connect(p1).listWager(p1.address, w1)).tokenAmmount).to.equal(weiAmmount2);
    });

    it("Should forfeit if wager has p2", async function() {
      const { rps } = await loadFixture(deployRps);
      const [p1, p2] = await ethers.getSigners();

      const clearChoice = "2-test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);
      const w1 = 0;

      const weiAmmount = parseEther("0.1"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: weiAmmount });
      await rps.connect(p2).joinWager(p1.address, w1, Choices.PAPER, { value: weiAmmount});
      const p2Bal = await p2.getBalance();

      await rps.connect(p1).rmWagerP1(p1.address, w1);
      
      await expect((await p2.getBalance()).sub(p2Bal)).to.be.approximately(parseEther("0.19"), parseEther("0.01"));
    })

    it("Should revert if caller isn't the wager owner", async function() {
      const { rps } = await loadFixture(deployRps);
      const [p1, p2] = await ethers.getSigners();

      const clearChoice = "2-test";
      const hashedChoice = ethers.utils.soliditySha256(["string"], [clearChoice]);
      const w1 = 0;

      const weiAmmount = parseEther("0.1"); /* 0.1 Eth */

      await rps.connect(p1).mkWager(hashedChoice, { value: weiAmmount });
      await rps.connect(p2).joinWager(p1.address, w1, Choices.PAPER, { value: weiAmmount});

      await expect(rps.connect(p2).rmWagerP1(p1.address, w1)).to.be.revertedWith("You can only remove your own wagers");
    })
  })
});
