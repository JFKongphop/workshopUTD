// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// contract
contract SmartFunding{
    // get address contract
    uint256 public fundingStage; // if 0 inactive | 1 active | 2 success | 3 fail
    address public tokenAddress;
    uint public goal;
    uint public pool;
    uint public endTimeInDay;

    mapping(address => uint256) public investOf; // investor => amount invest
    mapping(address => uint256) public rewardOf; // investor => amount reward
    mapping(address => bool) public claimedOf; // address => status after claim

    event Invest(address indexed from, uint256 amount);
    event ClaimReward(address indexed from, uint256 amount);
    event Refund(address indexed from, uint256 amount);
 
    // set contract address
    constructor(address _tokenAddress){
        tokenAddress = _tokenAddress;
        fundingStage = 0;
    }

    // set goal
    function initialize(uint _goal, uint _endTimeInDay) external{
        goal = _goal;
        endTimeInDay = block.timestamp + (_endTimeInDay * 1 days); // time to end 
        fundingStage = 1;
    }

    // for another function call this function
    function invest() external payable {
        require(fundingStage == 1, "Stage is not active");
        require(msg.value > 0, "Reject amount of invest");
        require(investOf[msg.sender] == 0, "Already invest");

        // calculate reward from user when invest to this pool
        // (totalSupply / goal) * input == reward of token
        uint256 totalSupply = IERC20(tokenAddress).totalSupply();
        uint256 rewardAmount = (totalSupply / goal) * msg.value;
    
        // set reward
        investOf[msg.sender] = msg.value; // investor => amount
        pool += msg.value;
        rewardOf[msg.sender] = rewardAmount; // investor => reward

        emit Invest(msg.sender, msg.value);
    }

    // clain reward
    function claim() external {
        require(fundingStage == 2, "Stage is not success");
        require(claimedOf[msg.sender] == false, "Already claimed");
        require(rewardOf[msg.sender] > 0, "No reward");
        
        // trasnfer to investor
        uint256 reward = rewardOf[msg.sender];
        claimedOf[msg.sender] = true; // claim status
        rewardOf[msg.sender] = 0; // clear reward after claim
        IERC20(tokenAddress).transfer(msg.sender, reward);

        emit ClaimReward(msg.sender, reward);
    }

    // refund if it full
    function refund() external {
        require(fundingStage == 3, "Stage is fail");
        require(investOf[msg.sender] > 0, "No invest");

        // refund value
        uint256 investAmount = investOf[msg.sender];

        // clear reward
        investOf[msg.sender] = 0;
        investOf[msg.sender] = 0;
        pool -= investAmount;

        payable(msg.sender).transfer(investAmount);

        emit Refund(msg.sender, investAmount);
    }
}