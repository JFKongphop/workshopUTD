const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { smock } = require("@defi-wonderland/smock"); // test mock
const { utils } = ethers
const { provider } = waffle; // get ether from each address


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
        fundingContract = await smartFundingContract.deploy(tokenContract.address, "0x02777053d6764996e594c3E88AF1D58D5363a2e6");
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
    let owner, investor1, investor2, investor3;

    // set auto deploy when test
    beforeEach(async ()=>{
        // test account
        [owner, investor1, investor2, investor3] = await ethers.getSigners();

        // deploy token
        const JFKToken = await ethers.getContractFactory("JFKToken");
        tokenContract = await JFKToken.deploy();
        await tokenContract.deployed();

        // deploy contract with token address   
        const smartFundingContract = await smock.mock("SmartFunding")
        // use test mock instaed
        // const smartFundingContract = await smock.mock("SmartFunding");
        fundingContract = await smartFundingContract.deploy(tokenContract.address, "0x02777053d6764996e594c3E88AF1D58D5363a2e6");
        await fundingContract.deployed();

        // trasnfer
        await tokenContract.connect(owner).transfer(fundingContract.address, utils.parseUnits("1000000", decimals)); // transfer to contract
        await fundingContract.initialize(utils.parseEther("1"), 7); // 1 ether in 7 days

    })


    // invest test
    it("Should invest success", async () =>{
        // test invest in pool
        const tx = await fundingContract.connect(investor1).invest({value : utils.parseEther("0.1")});
        await tx.wait();
        const tx2 = await fundingContract.connect(investor2).invest({value : utils.parseEther("0.2")});
        await tx2.wait();

        // if use revert must set await at before revert expect
        const tx3 = fundingContract.connect(investor3).invest({value : utils.parseEther("0")});
        await expect(tx3).to.be.revertedWith("Reject amount of invest");
        
        // test amount in pool and per address
        expect(await fundingContract.pool()).to.equal(utils.parseEther("0.3"));
        expect(await fundingContract.investOf(investor1.address)).to.equal(utils.parseEther("0.1"));
        expect(await fundingContract.investOf(investor2.address)).to.equal(utils.parseEther("0.2"));

        // test emit
        expect(tx).to.emit(fundingContract, "Invest").withArgs(investor1.address, utils.parseEther("0.1"));
        expect(tx2).to.emit(fundingContract, "Invest").withArgs(investor2.address, utils.parseEther("0.2"));

        // test reward after invest in pool
        expect(await fundingContract.rewardOf(investor1.address)).to.equal(utils.parseUnits("100000", decimals));
        expect(await fundingContract.rewardOf(investor2.address)).to.equal(utils.parseUnits("200000", decimals));
    })

    // claim reward
    it("Should claim reward success", async () =>{
        

        // test invest in pool
        const tx = await fundingContract.connect(investor1).invest({value : utils.parseEther("0.9")});
        await tx.wait();
        const tx2 = await fundingContract.connect(investor2).invest({value : utils.parseEther("0.1")});
        await tx2.wait();

        // use test mpck for change variable in contract but not touch contract
        // await fundingContract.setVariable('fundingStage', 2); // success

        // claim reward
        await fundingContract.setVariable('fundingStage', 2);
        const tx3 = await fundingContract.connect(investor2).claim();
        await tx3.wait();


        // check status claimed
        expect(await fundingContract.claimedOf(investor2.address)).to.equal(true);
        expect(await fundingContract.rewardOf(investor2.address)).to.equal(0);
        expect(tx3).to.emit(fundingContract, "ClaimReward").withArgs(investor2.address, utils.parseUnits("100000", decimals));
        expect(tx3).to.emit(tokenContract, "Transfer").withArgs(fundingContract.address, investor2.address, utils.parseUnits("100000", decimals));

        // check trasnfer after claimed
        expect(await tokenContract.balanceOf(investor2.address)).to.equal(utils.parseUnits("100000", decimals));
        expect(await tokenContract.balanceOf(fundingContract.address)).to.equal(utils.parseUnits("900000", decimals));
    })

    // reject reward
    it("Should reject claim with no invest", async () =>{

        await fundingContract.setVariable('fundingStage', 2);
        // claim reward
        const tx = fundingContract.connect(investor1).claim();
        await expect(tx).to.be.revertedWith("No reward");
    })

    // reject when claimed
    it("Should reject claim with alerady claimed reward", async () =>{
        const tx = await fundingContract.connect(investor1).invest({value : utils.parseEther("0.9")});
        await tx.wait()

        // claim reward
        await fundingContract.setVariable('fundingStage', 2);
        const tx2 = await fundingContract.connect(investor1).claim();
        await tx2.wait();

        // claim reward revert when second time
        const tx3 = fundingContract.connect(investor1).claim();
        await expect(tx3).to.be.revertedWith("Already claimed");
    })

    it("Should refund success", async () =>{
        // invest 
        const tx = await fundingContract.connect(investor1).invest({value : utils.parseEther("0.9")});
        await tx.wait()
        // check before refund
        expect(await provider.getBalance(fundingContract.address)).to.equal(utils.parseEther("0.9"));

        // refund
        await fundingContract.setVariable('fundingStage', 3);
        const tx2 = await fundingContract.connect(investor1).refund();
        await tx2.wait();

        // check pool
        expect(await fundingContract.pool()).to.equal(utils.parseEther("0"));
        // get ether from each address
        expect(await provider.getBalance(fundingContract.address)).to.equal(utils.parseEther("0"));

        // emit
    })

    it("Should reject invest when no invest or refunded", async () =>{
        // invest 
        const tx = await fundingContract.connect(investor1).invest({value : utils.parseEther("0.9")});
        await tx.wait()

        // refund
        await fundingContract.setVariable('fundingStage', 3);
        const tx2 = await fundingContract.connect(investor1).refund();
        await tx2.wait();

        // refund secone time will reject
        const tx3 = fundingContract.connect(investor1).refund();
        await expect(tx3).to.be.revertedWith("No invest");
    })
});
