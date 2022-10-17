// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { utils } = ethers

async function main() {

    const JFKToken = await ethers.getContractFactory("JFKToken");
    const tokenContract = await JFKToken.deploy();
    await tokenContract.deployTransaction.wait(5);
    await tokenContract.deployed();

    const SmartFundingContract = await ethers.getContractFactory("SmartFunding") 
    const fundingContract = await SmartFundingContract.deploy(tokenContract.address, "0x02777053d6764996e594c3E88AF1D58D5363a2e6");

    await fundingContract.deployTransaction.wait(5);
    await fundingContract.deployed();

    // initial contarct
    const tx = await fundingContract.initialize(utils.parseEther("1"), 5);
    await tx.wait()


    console.log("JFKToken deployed to:", tokenContract.address);
    console.log("Greeter deployed to:", fundingContract.address);

    try{
        await hre.run("verify:verify", {
            address: tokenContract.address,
            contract: "contracts/JFKToken.sol:JFKToken"
        })
    }
    catch(err){
        console.log(err);
    }

    try{
        await hre.run("verify:verify", {
            address: fundingContract.address,
            constructorArguments: [
                tokenContract.address
            ]
        });
    }
    catch(err){
        console.log(err);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});