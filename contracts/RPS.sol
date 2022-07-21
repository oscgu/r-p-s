// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Rps {
    /* address public constant OWNER = ; */
    uint public constant MIN_BET = 10000000 gwei; // 0.01 eth
    uint8 public constant TAX_PERCENT = 5;
    uint public constant REVEAL_TIMEOUT = 48 hours;

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
        require(msg.value >= MIN_BET, "Bet ammount too low");
        Wager memory wager;
        wager.hasP2 = false;
        wager.tokenAmmount = msg.value;
        wager.p1EncryptedRPSChoice = encChoice;

        players[msg.sender].wagers.push(wager);
    }

    function joinWager(address p1, uint8 wagerIndex, Choices p2Choice) public payable {
        require(p1 != msg.sender, "You can't join your own game");

        Wager[] storage wagers = players[p1].wagers;
        require(wagers.length >= wagerIndex + 1, "Index out of bounds");

        Wager storage wager = wagers[wagerIndex];
        require(!wager.hasP2, "Wager already has a second player");
        require(msg.value >= wager.tokenAmmount, "Tokenammount to low");

        wager.hasP2 = true;
        wager.p2 = msg.sender;
        wager.p2Choice = p2Choice;
        wager.timerStart = block.timestamp;
    }

    function resolveWagerP1(uint256 wagerIndex, string memory movePw) public {
        Wager memory wager = getWager(msg.sender, wagerIndex);
        require(wager.hasP2, "Wager doesn't have a second player");

        Choices p1Choice = getHashChoice(wager.p1EncryptedRPSChoice, movePw);
        Winner winner = chooseWinner(p1Choice, wager.p2Choice);

        rmWager(msg.sender, wagerIndex);
        rewardWinner(msg.sender, wager.p2, winner, wager.tokenAmmount);
    }

    function resolveWagerP2(address p1, uint256 wagerIndex) public {
        Wager memory wager = getWager(p1, wagerIndex);
        require(wager.hasP2, "Wager doesn't have a second player");
        require(didTimerRunOut(wager.timerStart), "Timer didn't run out yet");

        rmWager(p1, wagerIndex);
        payoutWithAppliedTax(msg.sender, wager.tokenAmmount);
    }

    function rewardWinner(address p1, address p2, Winner winner, uint256 ammount) public {
        if (winner == Winner.P1) {
            payoutWithAppliedTax(p1, ammount);
        } else if (winner == Winner.P2) {
            payoutWithAppliedTax(p2, ammount);
        } else if (winner == Winner.DRAW) {
            payoutWithAppliedTax(p1, ammount / 2);
            payoutWithAppliedTax(p2, ammount / 2);
        }
    }

    /* private */
    function rmWager(address p1,  uint256 wagerIndex) public {
        Wager[] storage wagers = players[p1].wagers;
        require(wagers.length != 0, "No wagers to be removed");
        require(wagers.length >= wagerIndex + 1, "Index out of bounds");

        wagers[wagerIndex] = wagers[wagers.length - 1];
        wagers.pop();
    }

    /* public */
    function rmWagerP1(address p1, uint256 wagerIndex) public {
        require(msg.sender == p1, "You can only remove your own wagers");
        Wager[] storage wagers = players[msg.sender].wagers;
        Wager memory wager = getWager(p1, wagerIndex);

        wagers[wagerIndex] = wagers[wagers.length - 1];
        wagers.pop();

        if (wager.hasP2) {
            payoutWithAppliedTax(wager.p2, wager.tokenAmmount);
        }
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

    function payoutWithAppliedTax(address winner, uint256 initalBet) public {
        uint256 ammount = (initalBet * 2) - (((initalBet * 2) / 100) * TAX_PERCENT);
        require(address(this).balance > ammount, "Not enough tokens in contract");

        payable(winner).transfer(ammount);
    }

    function getHashChoice(bytes32 hashChoice, string memory clearChoice) public pure returns (Choices) {
        bytes32 hashedClearChoice = sha256(abi.encodePacked(clearChoice));
        require(hashChoice == hashedClearChoice, "Password doesnt match encoded one");

        return getChoiceFromStr(clearChoice);
    }

    /* Clear password = str */
    function getChoiceFromStr(string memory str) public pure returns(Choices) {
        bytes1 first = bytes(str)[0];

        if (first == 0x30) {
            return Choices.ROCK;
        } else if (first == 0x31) {
            return Choices.PAPER;
        } else if (first == 0x32) {
            return Choices.SCISSORS;
        }

        revert("Invalid choice");
    }

    function rcv() public payable {}

    function didTimerRunOut(uint timerStart) private view returns (bool){
        return block.timestamp > timerStart + REVEAL_TIMEOUT;
    }

    function getWager(address player, uint256 wagerIndex) public view returns(Wager memory) {
        Wager[] storage wagers = players[player].wagers;
        require(wagers.length >= wagerIndex + 1, "Index out of bounds");

        return wagers[wagerIndex];
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function listWagers(address player) public view returns(Wager[] memory) {
        return players[player].wagers;
    }

    function getTimeLeft(address player, uint wagerIndex) public view returns(uint) {
        Wager memory wager = getWager(player, wagerIndex);
        require(!didTimerRunOut(wager.timerStart), "Timer already finished");
        require(wager.hasP2, "Timer didn't start yet");
        return REVEAL_TIMEOUT - (block.timestamp - wager.timerStart);
    }

    function getWagerTokenammount(address player, uint wagerIndex) public view returns(uint) {
        Wager memory wager = getWager(player, wagerIndex);
        return wager.tokenAmmount;
    }
}
