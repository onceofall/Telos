require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("dotenv").config();

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
const PRIVATE_KEY_1 = process.env.PRIVATE_KEY_1;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

console.log(POLYGON_RPC_URL, PRIVATE_KEY_1, ETHERSCAN_API_KEY);


module.exports = {
  solidity: "0.8.19",
  namedAccounts: {
    firstAccount: 0
  },
  networks: {
    hardhat: {
      // 本地测试网络配置
    },
    sepolia: {
      url: POLYGON_RPC_URL,
      accounts: [PRIVATE_KEY_1],
      chainId: 11155111
    },
    // 其他网络配置...
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY
    }
  },
}; 
