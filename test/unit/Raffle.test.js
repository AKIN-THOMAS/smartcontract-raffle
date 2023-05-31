const { network, getNamedAccounts, ethers, deployments } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { expect, assert } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle", () => {
          let deployer, raffle, vrfCoordinatorV2Mock, chainId, interval, raffleEntranceFee
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              chainId = network.config.chainId
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", () => {
              it("initalize raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })
          describe("Enter Raffle", () => {
              it("revert if it's not enough ETH paid", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__notEnoughETHEntered"
                  )
              })
              it("check if players are added to tha array", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  assert.equal(await raffle.getPlayers(0), deployer)
              })
              it("emits event when entered", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("revert if the raffle state is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await raffle.performUpkeep([])
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  )
              })
          })
          describe("checkUpkeep", () => {
              it("check if it can return upKeepNeeded", async () => {
                  const state = await raffle.getRaffleState()
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(upkeepNeeded, true)
                  assert.equal(state.toString(), "0")
              })
              it("return false if raffle isn't OPEN", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await raffle.performUpkeep([])
                  const state = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(state.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(upkeepNeeded, false)
              })
          })
          describe("performUpkeep", () => {
              it("revert if upKeep isn't needed", async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  )
              })
              it("updates raffle state to CALCULATING", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  await raffle.performUpkeep([])
                  const state = await raffle.getRaffleState()
                  assert.equal(state.toString(), "1")
                  assert.equal(upkeepNeeded, true)
              })
              it("only runs if checkUpkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })
              it("check if it requestId", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const txRequestId = await txReceipt.events[1].args.requestId
                  assert(txRequestId.toNumber() > 0)
                  assert.equal(upkeepNeeded, true)
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after preformUpkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
              })
              it("picks a winner, resets the contract, sends the money", async () => {
                  const additionalEntrants = 3
                  const startingAccounts = 1
                  const accounts = await ethers.getSigners()
                  for (let i = startingAccounts; i < startingAccounts + additionalEntrants; i++) {
                      const accountConnected = await raffle.connect(accounts[i])
                      await accountConnected.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      raffle.once("Raffle__WinnerPicked", async () => {
                          console.log("Found the event!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const numPlayers = await raffle.getNumOfPlayers()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              const winnerEndingBalance = await accounts[2].getBalance()

                              assert.equal(raffleState.toString(), "0")
                              assert.equal(numPlayers.toString(), "0")
                              await expect(raffle.getPlayers(0)).to.be.reverted
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrants)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              )
                          } catch (error) {
                              reject()
                          }
                      })
                      resolve()
                      //   const winner = await raffle.getRecentWinner()
                      console.log(`winner: ${recentWinner.address}`)
                      console.log(`Contestants: ${accounts[0].address}`)
                      console.log(`Contestants: ${accounts[1].address}`)
                      console.log(`Contestants: ${accounts[2].address}`)
                      console.log(`Contestants: ${accounts[3].address}`)

                      const tx = await raffle.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await accounts[2].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      )
                  })
              })
          })
      })
