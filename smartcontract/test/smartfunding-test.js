const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = ethers

const decimals = 18;

// deploy and test initialize of contract
describe("Deploy smart funding contract", function () {

    let tokenContract;
    let fundingContract;
    let owner

    // set auto deploy when test
    beforeEach(async ()=>{
        // test account
        [owner] = await ethers.getSigners();

        // deploy token
        const JFKToken = await ethers.getContractFactory("JFKToken");
        tokenContract = await JFKToken.deploy();
        await tokenContract.deployed();

        // deploy contract with token address   
        const smartFundingContract = await ethers.getContractFactory("SmartFunding") 
        fundingContract = await smartFundingContract.deploy(tokenContract.address);
        await fundingContract.deployed();

    })


    // deploy
    it("Should deploy smart funding", async function () {

        // check test address and total supply token
        expect(await fundingContract.tokenAddress()).to.equal(tokenContract.address);
        expect(await tokenContract.totalSupply()).to.equal(utils.parseUnits("1000000", decimals));

    });


    // transfer token and test goals with ether and days
    it("Should transfer onwer token to smart funding contract", async function () {

        // check test address and total supply token
        expect(await fundingContract.tokenAddress()).to.equal(tokenContract.address);
        expect(await tokenContract.totalSupply()).to.equal(utils.parseUnits("1000000", decimals));

        // check token from owner
        expect(await tokenContract.balanceOf(owner.address)).to.equal(utils.parseUnits("1000000", decimals));

        // transfer token from owner to contract
        await tokenContract.connect(owner).transfer(fundingContract.address, utils.parseUnits("1000000", decimals)); // transfer to contract
        expect(await tokenContract.balanceOf(owner.address)).to.equal(utils.parseUnits("0", decimals)); // check owner balance when transfer
        expect(await tokenContract.balanceOf(fundingContract.address)).to.equal(utils.parseUnits("1000000", decimals)); // check contract balance when transfer

        // Initailize goal
        await fundingContract.initialize(utils.parseEther("1"), 7); // 1 ether in 7 days
        expect(await fundingContract.goal()).to.equal(utils.parseEther("1"))

    });
});

// test contract 
describe("SmartFunding operation", function () {

    let tokenContract;
    let fundingContract;
    let owner, investor1, investor2;

    // set auto deploy when test
    beforeEach(async ()=>{
        // test account
        [owner, investor1, investor2] = await ethers.getSigners();

        // deploy token
        const JFKToken = await ethers.getContractFactory("JFKToken");
        tokenContract = await JFKToken.deploy();
        await tokenContract.deployed();

        // deploy contract with token address   
        const smartFundingContract = await ethers.getContractFactory("SmartFunding") 
        fundingContract = await smartFundingContract.deploy(tokenContract.address);
        await fundingContract.deployed();

        // trasnfer
        await tokenContract.connect(owner).transfer(fundingContract.address, utils.parseUnits("1000000", decimals)); // transfer to contract
        await fundingContract.initialize(utils.parseEther("1"), 7); // 1 ether in 7 days

    })

    // invest test
    it("Should invest success", async () =>{
        const tx = await fundingContract.connect(investor1).invest({value : utils.parseEther("0.1")});
        await tx.wait();

        const tx2 = await fundingContract.connect(investor2).invest({value : utils.parseEther("0.1")});
        await tx2.wait();


        expect(await fundingContract.pool()).to.equal(utils.parseEther("0.2"));
        expect(await fundingContract.investOf(investor1.address)).to.equal(utils.parseEther("0.1"));
        expect(await fundingContract.investOf(investor2.address)).to.equal(utils.parseEther("0.1"));

    })
});
