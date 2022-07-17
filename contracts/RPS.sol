// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Rps {
    // address public constant OWNER = ;
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
        string p1EncryptedRPSChoice;
        bool hasP2;
        address p2;
        Choices p2Choice;
        uint timerStart;
    }

    struct Player {
        address payable pAddress;
        Wager[] wagers;
    }

    function listWagers() public view returns(Wager[] memory) {
        return players[msg.sender].wagers;
    }

    function listWager(uint256 wagerIndex) public view returns(Wager memory) {
        return players[msg.sender].wagers[wagerIndex];
    }

    function mkWager(string memory encChoice) public payable {
        Wager memory wager;
        wager.hasP2 = false;
        wager.tokenAmmount = msg.value;
        wager.p1EncryptedRPSChoice = encChoice;

        players[msg.sender].wagers.push(wager);
    }

    mapping(address => Player) players;

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

    function timerRanOut(uint timerStart) public view returns (bool){
        return block.timestamp > timerStart + REVEAL_TIMEOUT;
    }

    function resolveWagerP1(uint256 wagerIndex, string memory movePw) public {
        Wager[] storage pWagers = players[msg.sender].wagers;
        require(pWagers.length >= wagerIndex, "Index out of bounds");

        Wager storage wager = pWagers[wagerIndex];
        require(wager.hasP2, "Wager doesn't have a second player");

        Choices p1Choice = getChoiceFromMovePw(wager.p1EncryptedRPSChoice, movePw);
        Winner winner = chooseWinner(p1Choice, wager.p2Choice);
        payOut(msg.sender, wager.p2, winner, wager.tokenAmmount);
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

    event WonAgainst(address indexed winner, address indexed loser);
    function payOut(address p1, address p2, Winner outcome, uint256 ammount) private {
        if (outcome == Winner.P1) {
            emit WonAgainst(p1, p2);
            require(address(this).balance > ammount, "Not enough cash 1");
            payable(p1).transfer(((ammount * 100) * 2) / (100 + TAX_PERCENT));
        } else if (outcome == Winner.P2) {
            emit WonAgainst(p2, p1);
            require(address(this).balance > ammount, "Not enough cash 2");
            payable(p2).transfer(((ammount * 100) * 2) / (100 + TAX_PERCENT));
        } else if (outcome == Winner.DRAW) {
            payable(p1).transfer(((ammount * 100)) / (100 + TAX_PERCENT));
            payable(p2).transfer(((ammount * 100)) / (100 + TAX_PERCENT));
        }
    }


    function payWinner(address winner, uint256 ammount) private {
        require(address(this).balance > ammount, "Not enough cash 3");
        payable(winner).transfer((ammount * 100) / (100 + TAX_PERCENT));
    }


    function getChoiceFromMovePw(string memory encChoice, string memory choicePw) public pure returns (Choices) {
        bytes32 a = sha256(abi.encodePacked(encChoice));
        bytes32 b = sha256(abi.encodePacked(choicePw));
        require(a == b, "Password doesnt match encoded one");

        return getIntChoice(choicePw);
    }

    function getIntChoice(string memory str) private pure returns(Choices) {
        bytes1 first = bytes(str)[0];

        if (first == 0x30) {
            return Choices.ROCK;
        } else if (first == 0x31) {
            return Choices.PAPER;
        }

        return Choices.SCISSORS;
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
}
