const { create } = require('ipfs-http-client');
const { ethers } = require('ethers');
const NFT = require('../models/nft.model');
const NFT_ABI = require('../contracts/NFT.abi.js');

class NFTService {
  constructor() {
    this.ipfs = create(process.env.IPFS_NODE);
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    
    // 初始化智能合约
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      NFT_ABI,
      this.provider
    );
  }

  async uploadToIPFS(file, metadata) {
    try {
      // 上传图片到IPFS
      const fileResult = await this.ipfs.add(file.buffer);
      
      // 创建元数据
      const nftMetadata = {
        name: metadata.title,
        description: metadata.description,
        image: `ipfs://${fileResult.path}`,
        attributes: metadata.attributes
      };

      // 上传元数据到IPFS
      const metadataResult = await this.ipfs.add(JSON.stringify(nftMetadata));
      
      return {
        imageHash: fileResult.path,
        metadataHash: metadataResult.path
      };
    } catch (error) {
      throw new Error('Failed to upload to IPFS');
    }
  }

  async mintNFT(userId, ipfsHash, metadata) {
    try {
      const nft = new NFT({
        creator: userId,
        owner: userId,
        title: metadata.title,
        description: metadata.description,
        ipfsHash: ipfsHash,
        price: metadata.price,
        rentPrice: metadata.rentPrice,
        royaltyPercentage: metadata.royaltyPercentage
      });

      await nft.save();
      return nft;
    } catch (error) {
      throw new Error('Failed to mint NFT');
    }
  }

  async getNFTByTokenId(tokenId) {
    try {
      // 从数据库获取NFT tokenId
      const nft = await NFT.findOne({ tokenId })
        .populate('creator', 'username address')
        .populate('owner', 'username address');

      if (!nft) {
        return null;
      }

      // 获取链上数据
      const onchainData = await this.contract.tokenURI(tokenId);
      
      // 合并数据
      return {
        ...nft.toObject(),
        onchainData
      };

    } catch (error) {
      throw new Error(`获取NFT失败: ${error.message}`);
    }
  }

  // 获取用户的NFT列表
  async getNFTsByUser(userId) {
    try {
      const nfts = await NFT.find({ 
        $or: [
          { owner: userId },
          { creator: userId }
        ]
      })
      .populate('creator', 'username address')
      .populate('owner', 'username address')
      .sort({ createdAt: -1 });

      return nfts;
    } catch (error) {
      throw new Error(`获取用户NFT失败: ${error.message}`);
    }
  }

  // 获取市场NFT列表
  async getMarketNFTs(page, limit, sort, order) {
    try {
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sort] = order === 'desc' ? -1 : 1;

      const nfts = await NFT.find({ 
        isListed: true,
        isRented: false 
      })
      .populate('creator', 'username address')
      .populate('owner', 'username address')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

      const total = await NFT.countDocuments({ isListed: true });

      return {
        nfts,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`获取市场NFT失败: ${error.message}`);
    }
  }

  // 购买NFT
  async buyNFT(tokenId, buyerId) {
    try {
      const nft = await NFT.findOne({ tokenId });
      if (!nft) {
        throw new Error('NFT不存在');
      }
      if (!nft.isListed) {
        throw new Error('NFT未上架销售');
      }
      if (nft.isRented) {
        throw new Error('NFT当前处于租赁状态');
      }

      // 调用智能合约进行购买
      const signer = this.provider.getSigner();
      const tx = await this.contract.connect(signer).buyNFT(tokenId, {
        value: ethers.parseEther(nft.price)
      });
      await tx.wait();

      // 更新数据库
      nft.owner = buyerId;
      nft.isListed = false;
      nft.price = '0';
      await nft.save();

      return nft;
    } catch (error) {
      throw new Error(`购买NFT失败: ${error.message}`);
    }
  }

  // 租赁NFT
  async rentNFT(tokenId, renterId, duration) {
    try {
      const nft = await NFT.findOne({ tokenId });
      if (!nft) {
        throw new Error('NFT不存在');
      }
      if (!nft.rentPrice) {
        throw new Error('此NFT不支持租赁');
      }
      if (nft.isRented) {
        throw new Error('NFT已被租用');
      }

      // 计算租赁费用
      const totalRentPrice = parseFloat(nft.rentPrice) * duration;

      // 调用智能合约进行租赁
      const signer = this.provider.getSigner();
      const tx = await this.contract.connect(signer).rentNFT(
        tokenId,
        duration,
        {
          value: ethers.parseEther(totalRentPrice.toString())
        }
      );
      await tx.wait();

      // 更新数据库
      nft.isRented = true;
      nft.renter = renterId;
      nft.rentExpiry = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      await nft.save();

      return nft;
    } catch (error) {
      throw new Error(`租赁NFT失败: ${error.message}`);
    }
  }

  // 上架NFT
  async listNFT(tokenId, ownerId, price, rentPrice) {
    try {
      const nft = await NFT.findOne({ tokenId, owner: ownerId });
      if (!nft) {
        throw new Error('NFT不存在或您不是所有者');
      }
      if (nft.isRented) {
        throw new Error('NFT当前处于租赁状态');
      }

      // 调用智能合约上架
      const signer = this.provider.getSigner();
      const tx = await this.contract.connect(signer).listNFT(
        tokenId,
        ethers.parseEther(price),
        rentPrice ? ethers.parseEther(rentPrice) : 0
      );
      await tx.wait();

      // 更新数据库
      nft.isListed = true;
      nft.price = price;
      nft.rentPrice = rentPrice;
      await nft.save();

      return nft;
    } catch (error) {
      throw new Error(`上架NFT失败: ${error.message}`);
    }
  }

  // 更新版税
  async updateRoyalty(tokenId, creatorId, royaltyPercentage) {
    try {
      const nft = await NFT.findOne({ tokenId, creator: creatorId });
      if (!nft) {
        throw new Error('NFT不存在或您不是创作者');
      }
      if (royaltyPercentage < 0 || royaltyPercentage > 100) {
        throw new Error('版税比例必须在0-100之间');
      }

      // 调用智能合约更新版税
      const signer = this.provider.getSigner();
      const tx = await this.contract.connect(signer).setRoyalty(
        tokenId,
        royaltyPercentage * 100 // 转换为基点 (1% = 100 basis points)
      );
      await tx.wait();

      // 更新数据库
      nft.royaltyPercentage = royaltyPercentage;
      await nft.save();

      return nft;
    } catch (error) {
      throw new Error(`更新版税失败: ${error.message}`);
    }
  }

  // 社交功能：点赞
  async likeNFT(tokenId, userId) {
    try {
      const nft = await NFT.findOne({ tokenId });
      if (!nft) {
        throw new Error('NFT不存在');
      }

      // 检查是否已经点赞
      if (!nft.likes) nft.likes = [];
      const likeIndex = nft.likes.indexOf(userId);

      if (likeIndex === -1) {
        // 添加点赞
        nft.likes.push(userId);
      } else {
        // 取消点赞
        nft.likes.splice(likeIndex, 1);
      }

      await nft.save();
      return {
        likes: nft.likes.length,
        isLiked: likeIndex === -1
      };
    } catch (error) {
      throw new Error(`点赞操作失败: ${error.message}`);
    }
  }

  // 社交功能：评论
  async addComment(tokenId, userId, content) {
    try {
      const nft = await NFT.findOne({ tokenId });
      if (!nft) {
        throw new Error('NFT不存在');
      }

      if (!nft.comments) nft.comments = [];
      
      const comment = {
        userId,
        content,
        createdAt: new Date()
      };

      nft.comments.push(comment);
      await nft.save();

      return comment;
    } catch (error) {
      throw new Error(`添加评论失败: ${error.message}`);
    }
  }
}

module.exports = new NFTService(); 