// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Rps {
    enum Choices {
        ROCK,
        PAPER,
        SCISSORS
    }
    Choices[3] winChoices = [Choices.SCISSORS, Choices.ROCK, Choices.PAPER];

    enum Winner {
        P1,
        P2,
        DRAW
    }

    struct Wager {
        uint256 tokenAmmount;
        address tokenContract;
        bytes32 p1EncryptedRPSChoice;
    }

    struct Player {
        address pAddress;
        Wager[] wagers;
    }

    mapping(address => Player) players;

    struct Round {
        address p1;
        address p2;
        uint256 betAmmount;
        Choices winChoice;
    }
    Round[] rounds;

    function joinWager(address p2, address p1, uint256 wagerIndex, Choices p2Choice) public payable {
        Wager[] memory pWager = players[p1].wagers;
        require(pWager.length >= wagerIndex);

        Wager memory wager = pWager[wagerIndex];
        require(wager.tokenAmmount <= msg.value);
    }

    function revealChoice(address p1, uint256 wagerIndex, string memory movePw) public view returns (Choices) {
        bytes32 encMove = sha256(abi.encodePacked(movePw));
        require(encMove == players[p1].wagers[wagerIndex].p1EncryptedRPSChoice);

        return Choices(uint8(bytes(movePw)[0]));
    }

    function mkWager(address p1Address, Wager calldata wager) public {
        players[p1Address].wagers.push(wager);
    }

    function rmWager(address pAddress, uint8 wagerIndex) public {
        Wager[] storage pWagers = players[pAddress].wagers;
        require(pWagers.length != 0);
        require(pWagers.length - 1 <= wagerIndex);

        pWagers[wagerIndex] = pWagers[pWagers.length - 1];
    }

    function chooseWinner(Choices _p1, Choices _p2) public view returns(Winner winner) {
        if (_p1 == _p2) {
            return Winner.DRAW;
        }

        if (winChoices[uint8(_p1)] == _p2) {
            return Winner.P1;
        }
        
        return Winner.P2;
    }
}
