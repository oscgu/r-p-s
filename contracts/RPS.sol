// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Rps {
    /* address public constant OWNER = ; */
    /* uint constant MIN_BET = ; */
    uint8 public constant TAX_PERCENT = 5;
    uint constant REVEAL_TIMEOUT = 48 hours;

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
        bytes32 p1EncryptedRPSChoice;

        bool hasP2;
        address p2;
        Choices p2Choice;

        uint timerStart;
    }

    struct Player {
        Wager[] wagers;
    }

    mapping(address => Player) players;

    function mkWager(bytes32 encChoice) public payable {
        Wager memory wager;
        wager.hasP2 = false;
        wager.tokenAmmount = msg.value;
        wager.p1EncryptedRPSChoice = encChoice;

        players[msg.sender].wagers.push(wager);
    }

    function joinWager(address p1, uint8 wagerIndex, Choices p2Choice) public payable {
        Wager[] storage p1Wagers = players[p1].wagers;
        require(p1Wagers.length >= wagerIndex, "Index out of bounds");

        Wager storage wager = p1Wagers[wagerIndex];
        require(wager.tokenAmmount <= msg.value, "Tokenammount to low");
        require(!wager.hasP2, "Wager already has a second player");

        wager.hasP2 = true;
        wager.p2 = msg.sender;
        wager.p2Choice = p2Choice;
        wager.timerStart = block.timestamp;
    }

    function resolveWagerP1(uint256 wagerIndex, string memory movePw) public {
        Wager[] storage pWagers = players[msg.sender].wagers;
        require(pWagers.length >= wagerIndex, "Index out of bounds");

        Wager storage wager = pWagers[wagerIndex];
        require(wager.hasP2, "Wager doesn't have a second player");

        Choices p1Choice = getHashChoice(wager.p1EncryptedRPSChoice, movePw);
        Winner winner = chooseWinner(p1Choice, wager.p2Choice);
        payOut(msg.sender, wager.p2, winner, wager.tokenAmmount);

        wager.hasP2 = false;
        rmWager(msg.sender, wagerIndex);
    }

    function resolveWagerP2(address p1, uint256 wagerIndex) public {
        Wager[] storage pWagers = players[p1].wagers;
        require(pWagers.length >= wagerIndex, "Index out of bounds");

        Wager storage wager = pWagers[wagerIndex];
        require(wager.hasP2, "Wager doesn't have a second player");
        require(wager.p2 == msg.sender, "You are not the second player");
        require(timerRanOut(wager.timerStart), "Timer didn't run out yet");

        payWinner(msg.sender, wager.tokenAmmount);
        rmWager(p1, wagerIndex);
    }

    function payOut(address p1, address p2, Winner outcome, uint256 ammount) private {
        uint256 winnings = (ammount * 2) - (((ammount * 2) / 100) * TAX_PERCENT);

        if (outcome == Winner.P1) {
            require(address(this).balance > winnings, "Not enough money in contract");
            payable(p1).transfer(winnings);
        } else if (outcome == Winner.P2) {
            require(address(this).balance > winnings, "Not enough money in contract");
            payable(p2).transfer(winnings);
        } else if (outcome == Winner.DRAW) {
            require(address(this).balance > winnings, "Not enough money in contract");
            payable(p1).transfer(winnings / 2);
            payable(p2).transfer(winnings / 2);
        }
    }

    /* internal */
    function rmWager(address p1,  uint256 wagerIndex) private {
        Wager[] storage pWagers = players[p1].wagers;
        require(pWagers.length != 0, "No wagers to be removed");
        require(pWagers.length - 1 <= wagerIndex, "Index out of bounds");

        if (pWagers[wagerIndex].hasP2) {
            payWinner(pWagers[wagerIndex].p2, pWagers[wagerIndex].tokenAmmount);
        }

        pWagers[wagerIndex] = pWagers[pWagers.length - 1];
        pWagers.pop();
    }

    /* for the player */
    function rmWager(uint8 wagerIndex) public {
        Wager[] storage pWagers = players[msg.sender].wagers;
        require(pWagers.length != 0, "No wagers to be removed");
        require(pWagers.length - 1 <= wagerIndex, "Index out of bounds");

        if (pWagers[wagerIndex].hasP2) {
            payWinner(pWagers[wagerIndex].p2, pWagers[wagerIndex].tokenAmmount);
        }

        pWagers[wagerIndex] = pWagers[pWagers.length - 1];
        pWagers.pop();
    }

    function chooseWinner(Choices _p1, Choices _p2) private view returns(Winner winner) {
        if (_p1 == _p2) {
            return Winner.DRAW;
        }

        if (winChoices[uint8(_p1)] == _p2) {
            return Winner.P1;
        }
        
        return Winner.P2;
    }

    function payWinner(address winner, uint256 ammount) private {
        require(address(this).balance > ammount, "Not enough cash 4");
        payable(winner).transfer((ammount * 2) - (((ammount * 2) / 100) * TAX_PERCENT));
    }

    function getHashChoice(bytes32 hashChoice, string memory clearChoice) public pure returns (Choices) {
        bytes32 hashedClearChoice = sha256(abi.encodePacked(clearChoice));
        require(hashChoice == hashedClearChoice, "Password doesnt match encoded one");

        return getChoiceFromStr(clearChoice);
    }

    function getChoiceFromStr(string memory str) private pure returns(Choices) {
        bytes1 first = bytes(str)[0];

        if (first == 0x31) {
            return Choices.ROCK;
        } else if (first == 0x32) {
            return Choices.PAPER;
        } else if (first == 0x33) {
            return Choices.SCISSORS;
        }

        revert("Invalid choice"); /* Handle it better */
    }

    function timerRanOut(uint timerStart) private view returns (bool){
        return block.timestamp > timerStart + REVEAL_TIMEOUT;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function listWagers() public view returns(Wager[] memory) {
        return players[msg.sender].wagers;
    }

    function listWager(uint256 wagerIndex) public view returns(Wager memory) {
        return players[msg.sender].wagers[wagerIndex];
    }

    function getTimeLeft(address p, uint wagerIndex) public view returns(uint) {
        require(!timerRanOut(players[p].wagers[wagerIndex].timerStart), "Timer already finished");
        require(players[p].wagers[wagerIndex].hasP2, "Timer didn't start yet");
        return REVEAL_TIMEOUT - (block.timestamp - players[p].wagers[wagerIndex].timerStart);
    }
}
