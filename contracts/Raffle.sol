//SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

// Raffle contract (What I need):
// Enter the lottery
// Pick a random winner (verifiably random)
// Winner should be selected every X minutes -> completely automated
// We need a chainlink oracle (we need the randomness from outside the blockchain)
// We need automated execution to trigger selecting a winner (chainlink keepers)

/**@title A sample Raffle Contract
 * @author Akin-Thomas Bishop
 * @notice This contract is for creating a sample raffle contract
 * @dev This implements the Chainlink VRF Version 2
 */

// We need a chainlink oracle (we need the randomness from outside the blockchain)
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
// We need automated execution to trigger selecting a winner (chainlink keepers)
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
//error
error Raffle__notEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currectBalance, uint256 numPlayers, uint256 raffleState);

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /*Type Declartions */
    enum RaffleState {
        OPEN,
        CALCULATING
    }   

    /*State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATION = 3;
    uint32 private constant NUM_WORDS = 1;

    /*Lottery variables */
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimestamp;
    uint256 private immutable i_interval;

    /*Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event Raffle__WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimestamp = block.timestamp;
        i_interval = interval;
    }

    modifier entranceFeePayment() {
        if (msg.value < i_entranceFee) {
            revert Raffle__notEnoughETHEntered();
        }
        _;
    }

    //Enter the lottery
    function enterRaffle() public payable entranceFeePayment {
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        // Emit an even when we update a dynamic array or mapping
        emit RaffleEnter(msg.sender);
    }

    /**@dev (checkUpkeep) => This is the fuction that the ChainLink Keepers nodes call
     * they look for the `upkeepNeeded` to return true
     * The following should be true for this to return true:
     * 1. The time interval has passed between raffle runs.
     * 2. The lottery is open Have atleast one player.
     * 3. The contract has some ETH.
     * 4. Implicity, your subscription is funded with LINK.
     * 5. The lottery should be in an "open" state.
     */

    // Winner should be selected every X minutes -> completely automated
    function checkUpkeep(
        bytes memory /* performData */
    ) public view override returns (bool upkeepNeeded, bytes memory /*performData*/) {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        // (the current block.timestamp - the last block.timestamp) > an interval
        bool timePassed = ((block.timestamp - s_lastTimestamp) > i_interval);
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(bytes memory /*performData*/) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATION,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    // Pick a random winner (verifiably random)
    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimestamp = block.timestamp;

        //open the raffle state and send the money to the random winner
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit Raffle__WinnerPicked(recentWinner);
    }

    /*Pure | View Functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimestamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATION;
    }
    function getInterval() public view returns(uint256){
        return i_interval;
    }
}
