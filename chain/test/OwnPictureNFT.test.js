const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("OwnPictureNFT", function () {
  let nft;
  let owner;
  let platformWallet;
  let creator;
  let buyer;
  let renter;
  let addrs;

  // 测试数据
  const TOKEN_URI = "ipfs://QmTest";
  const PRICE = ethers.parseEther("1.0");
  const RENT_PRICE = ethers.parseEther("0.1");
  const ROYALTY_POINTS = 500; // 取值与ERC2981一致

  // 部署合约的固定函数
  async function deployNFTFixture() {
    // 获取测试账户
    [owner, platformWallet, creator, buyer, renter, ...addrs] = await ethers.getSigners();

    // 获取合约工厂
    const OwnPictureNFT = await ethers.getContractFactory("OwnPictureNFT");

    // 部署合约
    const nftContract = await OwnPictureNFT.deploy(platformWallet.address);
    await nftContract.waitForDeployment();

    return { nftContract, owner, platformWallet, creator, buyer, renter, addrs };
  }

  // 在每个测试前重置状态
  beforeEach(async function () {
    // 使用 loadFixture 来运行部署函数并获取合约实例
    const { nftContract } = await loadFixture(deployNFTFixture);
    nft = nftContract;
  });

  // 获取已部署合约的辅助函数
  async function getDeployedContract() {
    try {
      // 从环境变量或配置中获取已部署的合约地址
      const contractAddress = process.env.CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error("Contract address not found in environment variables");
      }

      // 获取合约工厂
      const OwnPictureNFT = await ethers.getContractFactory("OwnPictureNFT");

      // 连接到已部署的合约
      return OwnPictureNFT.attach(contractAddress);
    } catch (error) {
      console.error("Error getting deployed contract:", error);
      throw error;
    }
  }

  describe("使用已部署合约", function () {
    beforeEach(async function () {
      try {
        // 尝试获取已部署的合约
        nft = await getDeployedContract();
      } catch (error) {
        // 如果获取失败，使用新部署的合约
        console.log("Using newly deployed contract for testing");
        const { nftContract } = await loadFixture(deployNFTFixture);
        nft = nftContract;
      }
    });

    describe("部署", function () {
      it("应该正确设置平台钱包地址", async function () {
        expect(await nft.platformWallet()).to.equal(platformWallet.address);
      });

      it("应该正确设置合约名称和符号", async function () {
        expect(await nft.name()).to.equal("OwnPicture");
        expect(await nft.symbol()).to.equal("OWP");
      });
    });

    describe("铸造NFT", function () {
      it("应该允许用户铸造NFT", async function () {
        await expect(nft.connect(creator).mintNFT(TOKEN_URI, ROYALTY_POINTS))
          .to.emit(nft, "NFTMinted")
          .withArgs(1n, creator.address, TOKEN_URI);

        expect(await nft.ownerOf(1)).to.equal(creator.address);
        expect(await nft.tokenURI(1)).to.equal(TOKEN_URI);
      });

      it("应该正确设置版税", async function () {
        await nft.connect(creator).mintNFT(TOKEN_URI, ROYALTY_POINTS);
        const [receiver, royaltyAmount] = await nft.royaltyInfo(1, PRICE);
        expect(receiver).to.equal(creator.address);
        expect(royaltyAmount).to.equal(PRICE * BigInt(ROYALTY_POINTS) / 10000n);
      });
    });

    describe("市场功能", function () {
      beforeEach(async function () {
        await nft.connect(creator).mintNFT(TOKEN_URI, ROYALTY_POINTS);
        await nft.connect(creator).listNFT(1, PRICE, RENT_PRICE);
      });

      it("应该允许上架NFT", async function () {
        const listing = await nft.listings(1);
        expect(listing.seller).to.equal(creator.address);
        expect(listing.price).to.equal(PRICE);
        expect(listing.rentPrice).to.equal(RENT_PRICE);
        expect(listing.isListed).to.be.true;
      });

      it("应该允许购买NFT并正确分配资金", async function () {
        // 获取初始余额
        const initialPlatformBalance = await ethers.provider.getBalance(platformWallet.address);
        const initialCreatorBalance = await ethers.provider.getBalance(creator.address);

        // 计算预期的费用分配
        // PRICE = 1 ETH = 1000000000000000000 wei
        const platformFee = (PRICE * BigInt(250)) / BigInt(10000); // 2.5% = 0.025 ETH
        const royaltyFee = (PRICE * BigInt(ROYALTY_POINTS)) / BigInt(10000); // 5% = 0.05 ETH
        // 用户支付的金额
        const userPayment = PRICE - platformFee - royaltyFee;
        
        // 执行购买
        const buyTx = await nft.connect(buyer).buyNFT(1, { value: PRICE });
        await buyTx.wait();

        // 获取购买后的余额
        const finalPlatformBalance = await ethers.provider.getBalance(platformWallet.address);
        const finalCreatorBalance = await ethers.provider.getBalance(creator.address);

        // 计算实际收到的金额
        const platformReceived = finalPlatformBalance - initialPlatformBalance;
        const creatorReceived = finalCreatorBalance - initialCreatorBalance;

        // 验证平台费用
        expect(platformReceived).to.equal(platformFee);

        // 验证用户费用 
        expect(creatorReceived).to.equal(userPayment);
        console.log('Royalty fee:', ethers.formatEther(creatorReceived), 'ETH');
        console.log('Expected royalty fee:', ethers.formatEther(userPayment), 'ETH');

        // 验证所有权转移
        expect(await nft.ownerOf(1)).to.equal(buyer.address);
      });
    });

    describe("租赁功能", function () {
      beforeEach(async function () {
        await nft.connect(creator).mintNFT(TOKEN_URI, ROYALTY_POINTS);
        await nft.connect(creator).listNFT(1, PRICE, RENT_PRICE);
      });

      it("应该允许租赁NFT", async function () {
        const duration = BigInt(30); // 30天
        const totalRentPrice = RENT_PRICE * duration;
        
        await expect(nft.connect(renter).rentNFT(1, duration, { value: totalRentPrice }))
          .to.emit(nft, "NFTRented")
          .withArgs(1n, renter.address, duration);

        const rental = await nft.rentals(1);
        expect(rental.renter).to.equal(renter.address);
        expect(rental.isRented).to.be.true;
      });

      it("不应允许租赁已租用的NFT", async function () {
        const duration = BigInt(30);
        const totalRentPrice = RENT_PRICE * duration;
        
        await nft.connect(renter).rentNFT(1, duration, { value: totalRentPrice });
        
        await expect(
          nft.connect(addrs[0]).rentNFT(1, duration, { value: totalRentPrice })
        ).to.be.revertedWith("NFT already rented");
      });
    });

    describe("管理功能", function () {
      it("应该允许所有者更新平台钱包", async function () {
        const newPlatformWallet = addrs[0].address;
        await nft.connect(owner).setPlatformWallet(newPlatformWallet);
        expect(await nft.platformWallet()).to.equal(newPlatformWallet);
      });

      it("应该允许暂停和恢复合约", async function () {
        await nft.connect(owner).pause();
        expect(await nft.paused()).to.be.true;

        await nft.connect(owner).unpause();
        expect(await nft.paused()).to.be.false;
      });

      it("暂停时不应允许铸造NFT", async function () {
        await nft.connect(owner).pause();
        await expect(
          nft.connect(creator).mintNFT(TOKEN_URI, ROYALTY_POINTS)
        ).to.be.revertedWith("Pausable: paused");
      });
    });

    describe("边界条件和错误处理", function () {
      it("不应允许设置超过最大值的版税", async function () {
        await expect(
          nft.connect(creator).mintNFT(TOKEN_URI, 1001) // 超过10%
        ).to.be.revertedWith("Royalty too high");
      });

      it("不应允许非所有者上架NFT", async function () {
        await nft.connect(creator).mintNFT(TOKEN_URI, ROYALTY_POINTS);
        await expect(
          nft.connect(buyer).listNFT(1, PRICE, RENT_PRICE)
        ).to.be.revertedWith("Not the owner");
      });

      it("不应允许购买未上架的NFT", async function () {
        await nft.connect(creator).mintNFT(TOKEN_URI, ROYALTY_POINTS);
        await expect(
          nft.connect(buyer).buyNFT(1, { value: PRICE })
        ).to.be.revertedWith("NFT not listed for sale");
      });
    });
  });
}); 