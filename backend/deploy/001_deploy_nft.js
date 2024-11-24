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
  log("OwnPictureNFT is deployed");
}

module.exports.tags = ["sepolia", "all"];