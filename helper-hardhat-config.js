const { ethers } = require("hardhat")

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        raffleEntranceFee: ethers.utils.parseEther("0.01"), //0.01ETH
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "1910",
        callBackGasLimit: "500000",
        interval: "30",
    },
    31337: {
        name: "hardhat",
        raffleEntranceFee: ethers.utils.parseEther("0.01"), //0.01ETH
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callBackGasLimit: "500000",
        interval: "30",
    },
    1: {
        name: "mainnet",
        keepersUpdateInterval: "30",
    },
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6
const FRONTEND_ADDRESSES_FILE = "../nextjs-smartcontract-lottery/constants/contractAddresses.json"
const FRONTEND_ABI_FILE = "../nextjs-smartcontract-lottery/constants/abi.json"

module.exports = {
    networkConfig,
    developmentChains,
    FRONTEND_ADDRESSES_FILE,
    FRONTEND_ABI_FILE,
    VERIFICATION_BLOCK_CONFIRMATIONS,
}
