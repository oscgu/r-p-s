import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
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

describe("Rps", function () {
  async function deployRps() {

    const Rps = await ethers.getContractFactory("Rps");
    const rps = await Rps.deploy();

    return { rps };
  }

  it("Should show 'p1' won, when 'rock' and 'scissors'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.ROCK, Choices.SCISSORS)).to.equal(Result.P1);
  })

  it("Should show 'p1' won, when 'paper' and 'rock'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.PAPER, Choices.ROCK)).to.equal(Result.P1);
  })

  it("Should show 'p1' won, when 'scissors' and 'paper'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.SCISSORS, Choices.PAPER)).to.equal(Result.P1);
  })

  it("Should show 'p2' won, when 'scissors' and 'rock'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.SCISSORS, Choices.ROCK)).to.equal(Result.P2);
  })

  it("Should show 'p2' won, when 'rock' and 'paper'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.ROCK, Choices.PAPER)).to.equal(Result.P2);
  })

  it("Should show 'p2' won, when 'paper' and 'scissors'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.PAPER, Choices.SCISSORS)).to.equal(Result.P2);
  })

  it("Should show 'draw', when 'rock' and 'rock'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.ROCK, Choices.ROCK)).to.equal(Result.DRAW);
  })


  it("Should show 'draw', when 'paper' and 'paper'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.PAPER, Choices.PAPER)).to.equal(Result.DRAW);
  })

  it("Should show 'draw', when 'scissors' and 'scissors'", async function () {
    const { rps } = await loadFixture(deployRps);

    expect(await rps.play(Choices.SCISSORS, Choices.SCISSORS)).to.equal(Result.DRAW);
  })

});
