// const { getNamedAccounts, ethers, network } = require("hardhat")
// const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
// const { assert } = require("chai")

// developmentChains.includes(network.name)
//     ? describe.skip
//     : describe("Raffle staging test", () => {
//           let deployer, raffle, raffleEntranceFee
//           beforeEach(async () => {
//               deployer = (await getNamedAccounts()).deployer
//               raffle = await ethers.getContract("Raffle", deployer)
//               raffleEntranceFee = await raffle.getEntranceFee()
//           })
//           describe("fulfillRandomWords", () => {
//               it("woks on a live ChainLink Keepers and ChainLink VRF, we get a random winner", async () => {
//                   console.log("Setting up test...")
//                   const startingTimeStamp = await raffle.getLatestTimeStamp()
//                   const accounts = await ethers.getSigners()

//                   // we need to set up our listener before entering the raffle
//                   console.log("Setting up Listener...");
//                   await new Promise(async (resolve, reject) => {
//                       raffle.once("Raffle__WinnerPicked", async () => {
//                           console.log("Raffle__WinnerPicked event fired")
//                           try {
//                               const recentWinner = await raffle.getRecentWinner()
//                               const raffleState = await raffle.getRaffleState()
//                               const winnerEndingBalance = await accounts[0].getBalance()
//                               const endingTimeStamp = await raffle.getLatestTimeStamp()

//                               await expect(raffle.getPlayers(0)).to.be.reverted
//                               assert.equal(recentWinner.toString(), accounts[0].address)
//                               assert.equal(raffleState.toString(), "0")
//                               assert.equal(
//                                   winnerEndingBalance.toString(),
//                                   winnerStartingBalance.add(raffleEntranceFee).toString()
//                               )
//                               assert.equal(endingTimeStamp > startingTimeStamp)
//                               resolve()
//                           } catch (error) {
//                               console.log(error)
//                               reject()
//                           }
//                       })

//                       //enter the raffle here
//                       console.log("Entering the raffle")
//                       const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
//                       await tx.wait(1)
//                       console.log("Please wait...")
//                       const winnerStartingBalance = await accounts[0].getBalance()
//                   })
//               })
//           })
//       })

// /**To run the staging on a testnet
//  * Get the subId from the chainLink VRF
//  * Deploy the contract using the subId
//  * Register the contract with the chainLink VRF and subId
//  * Register the contract with chainLink Keepers
//  * Then run the staging test
//  */
const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  console.log("Setting up test...")
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      raffle.once("Raffle__WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              await expect(raffle.getPlayers(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()
                      // and this code WONT complete until our listener has finished listening!
                      done()
                  })
              })
          })
      })
