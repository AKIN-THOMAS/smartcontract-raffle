const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config

const FUND_AMOUNT = ethers.utils.parseEther("1")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    const raffleEntranceFee = networkConfig[chainId]["raffleEntranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    if (chainId === 31337) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const txResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResponse.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        //Fund the subscription (not complusory to fund in the mocks)
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const args = [
        vrfCoordinatorV2Address,
        raffleEntranceFee,
        gasLane,
        subscriptionId,
        callBackGasLimit,
        interval,
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    console.log(`The contract address: ${raffle.address}`);

    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)

        console.log("Consumer is added")
    }

    //verify the contract only if it's on a testnet or mainnet and not localhost or hardhat
    if (chainId !== 31337 && process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying...")
        await verify(raffle.address, args)
    }
    console.log("_____________________________")
}

module.exports.tags = ["all", "raffle"]
