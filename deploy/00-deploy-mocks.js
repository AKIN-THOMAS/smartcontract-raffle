const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = "250000000000000000" // 0.25 is this the premium in LINK || 0.25 LINK is the premium fee to get a random number
const GAS_PRICE_LINK = 1e9 // link per gas, is this the gas lane? // 0.000000001 LINK per gas

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]
    const chainId = network.config.chainId

    
    if(chainId === 31337){
        console.log('Local network detected. Deploying mocks...');
        //deploy VRFCoordinatorV2 mocks
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        console.log("Mocks deployed!");
        console.log("_____________________________");
    }
}

module.exports.tags = ["all", "mocks"]
