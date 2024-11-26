require("dotenv").config();
const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;

module.exports = async ({deployments, getNamedAccounts}) => {
  const {deploy, log} = deployments;
  const {firstAccount} = await getNamedAccounts();

  log("Deploying OwnPictureNFT contract...");
  await deploy("OwnPictureNFT", {
    contract: "OwnPictureNFT",
    from: firstAccount,
    args: [PLATFORM_WALLET_ADDRESS],
    log: true,
  });

  if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY) {
    await hre.run("verify:verify", {
        address: OwnPictureNFT.address,
        constructorArguments: [PLATFORM_WALLET_ADDRESS],
      });        
} else {
    console.log("Network is not sepolia, verification skipped...")
}
  log("OwnPictureNFT is deployed");
}

module.exports.tags = ["sepolia", "all"];