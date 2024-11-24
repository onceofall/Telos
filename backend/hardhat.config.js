require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-deploy-ethers");


module.exports = {
  solidity: "0.8.19",
  namedAccounts: {
    firstAccount: 0
  },
  networks: {
    hardhat: {
      // 本地测试网络配置
    },
    // 其他网络配置...
  },
  mocha: {
    timeout: 40000
  }
}; 