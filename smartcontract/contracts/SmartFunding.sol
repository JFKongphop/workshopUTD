// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import 

contract SmartFunding{
    // get address contract
    address public tokenAddress;
    uint public goal;
    uint public pool;
    uint public endTimeInDay;

    mapping(address => uint256) public investOf; // investor => amount invest
    mapping(address => uint256) public rewardOf; // investor => amount reward

    event Invest(address indexed from, uint256 amount);
 
    // set contract address
    constructor(address _tokenAddress){
        tokenAddress = _tokenAddress;
    }

    // set goal
    function initialize(uint _goal, uint _endTimeInDay) external{
        goal = _goal;
        endTimeInDay = block.timestamp + (_endTimeInDay * 1 days); // time to end 
    }

    // for another function call this function
    function invest() external payable {
        require(investOf[msg.sender] == 0, "Already invest");
        investOf[msg.sender] = msg.value; // investor => amount
        pool += msg.value;

        // calculate reward
        // (totalSupply / goal) * input == reward of token
        uint reward = 


        emit Invest(msg.sender, msg.value);
    }
}