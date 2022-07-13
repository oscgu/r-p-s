// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";

contract Rps {
    enum Choices {
        ROCK,
        PAPER,
        SCISSORS
    }

    enum Winner {
        P1,
        P2,
        DRAW
    }

    mapping(Choices => Choices) winCombination;

    constructor() {
        addWinCombination(Choices.PAPER, Choices.ROCK);
        addWinCombination(Choices.ROCK, Choices.SCISSORS);
        addWinCombination(Choices.SCISSORS, Choices.PAPER);
    }

    function addWinCombination(Choices win, Choices lose) private {
        winCombination[win] = lose;
    }
    
    function play(Choices _p1, Choices _p2) public view returns(Winner winner) {
        if (_p1 == _p2) {
            return Winner.DRAW;
        }

        if (winCombination[_p1] == _p2) {
            return Winner.P1;
        }
        
        return Winner.P2;
    }
}
