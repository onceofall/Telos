import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { ethers } from 'ethers';
import NFT from '../models/nft.model.js';
import NFT_ABI from '../contracts/NFT.abi.js';
import dotenv from 'dotenv';

dotenv.config();

class NFTService {
  constructor() {
    // 初始化 Filebase S3 客户端
    this.s3Client = new S3Client({
      endpoint: "https://s3.filebase.com",
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.FILEBASE_ACCESS_KEY,
        secretAccessKey: process.env.FILEBASE_SECRET_KEY
      }
    });

    // 初始化区块链提供者和合约
    
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    console.log(process.env.BLOCKCHAIN_RPC_URL);
    // 确保私钥格式正确
    const privateKey = process.env.PRIVATE_KEY_1.startsWith('0x') 
        ? process.env.PRIVATE_KEY_1 
        : `0x${process.env.PRIVATE_KEY_1}`;

    console.log(privateKey);

    // 初始化钱包
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    console.log('Wallet address:', this.wallet.address);
    
    console.log(process.env.CONTRACT_ADDRESS);
    // 使用钱包连接合约
    this.nftContract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      NFT_ABI,
      this.wallet  // 使用钱包而不是 provider
    );

    console.log('NFT Contract initialized at:', process.env.CONTRACT_ADDRESS);
  }

  // 上传文件到 Filebase IPFS
  async uploadFileToIPFS(file) {
    try {
      console.log('Starting file upload to Filebase...');
      
      // 生成唯一的文件名
      const fileName = `${Date.now()}-${file.originalname}`;
      
      const params = {
        Bucket: process.env.FILEBASE_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype
      };

      const command = new PutObjectCommand(params);
      await this.s3Client.send(command);

      // Filebase IPFS CID 格式
      const cid = await this.getFileCID(fileName);
      const ipfsUrl = `ipfs://${cid}`;
      
      console.log('File uploaded to Filebase IPFS:', ipfsUrl);
      return ipfsUrl;

    } catch (error) {
      console.error('Filebase upload error:', error);
      throw new Error(`Filebase upload failed: ${error.message}`);
    }
  }

  // 获取文件的 CID
  async getFileCID(fileName) {
    try {
      const params = {
        Bucket: process.env.FILEBASE_BUCKET,
        Key: fileName
      };

      const command = new HeadObjectCommand(params);
      const response = await this.s3Client.send(command);

      // Filebase 在响应头中提供 CID
      const cid = response.Metadata?.['cid'];
      
      if (!cid) {
        throw new Error('CID not found in metadata');
      }

      console.log('Retrieved CID:', cid);
      return cid;

    } catch (error) {
      console.error('Error getting CID:', error);
      throw new Error(`Failed to get CID: ${error.message}`);
    }
  }

  // 上传元数据到 Filebase IPFS
  async uploadMetadataToIPFS(metadata) {
    try {
      const fileName = `metadata-${Date.now()}.json`;
      
      const params = {
        Bucket: process.env.FILEBASE_BUCKET,
        Key: fileName,
        Body: JSON.stringify(metadata),
        ContentType: 'application/json'
      };

      const command = new PutObjectCommand(params);
      await this.s3Client.send(command);

      const cid = await this.getFileCID(fileName);
      const ipfsUrl = `ipfs://${cid}`;
      
      console.log('Metadata uploaded to Filebase IPFS:', ipfsUrl);
      return ipfsUrl;

    } catch (error) {
      console.error('Filebase metadata upload error:', error);
      throw new Error(`Filebase metadata upload failed: ${error.message}`);
    }
  }

  // 铸造NFT
  async mintNFT(userId, file, nftData) {
    try {
      // 检查账户余额
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log('Account balance:', ethers.formatEther(balance), 'ETH');
      
      if (balance === BigInt(0)) {
        throw new Error('Insufficient funds in wallet');
      }

      // 1. 上传图片到IPFS
      const imageUrl = await this.uploadFileToIPFS(file);

      // 2. 创建并上传元数据
      const metadata = {
        name: nftData.title,
        description: nftData.description,
        image: imageUrl,
        attributes: [
          {
            trait_type: "Creator",
            value: userId
          },
          {
            trait_type: "Price",
            value: nftData.price
          },
          {
            trait_type: "RentPrice",
            value: nftData.rentPrice || "0"
          }
        ]
      };

      const metadataUrl = await this.uploadMetadataToIPFS(metadata);

      // 3. 调用智能合约铸造NFT
      console.log('Minting NFT with:', {
        metadataUrl,
        royaltyPercentage: nftData.royaltyPercentage
      });

      const tx = await this.nftContract.mintNFT(
        metadataUrl,
        nftData.royaltyPercentage
      );

      console.log('Transaction hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      // 修改事件解析方式
      const mintLog = receipt.logs.find(log => {
        try {
          const parsedLog = this.nftContract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          // 检查是否为 Transfer 事件，因为这是 ERC721 标准的铸造事件
          return parsedLog?.name === 'Transfer' && parsedLog.args[0] === ethers.ZeroAddress;
        } catch (e) {
          return false;
        }
      });

      if (!mintLog) {
        console.error('Available logs:', receipt.logs);
        throw new Error('NFT minting event not found in transaction logs');
      }

      const parsedLog = this.nftContract.interface.parseLog({
        topics: mintLog.topics,
        data: mintLog.data
      });

      // 从 Transfer 事件中获取 tokenId
      const tokenId = parsedLog.args[2].toString();
      const creator = parsedLog.args[1];

      console.log('Mint event parsed:', {
        tokenId,
        creator
      });

      // 5. 保存到数据库
      const nft = new NFT({
        tokenId,
        creator: creator,
        owner: creator,
        title: nftData.title,
        description: nftData.description,
        ipfsHash: metadataUrl,
        imageUrl: imageUrl,
        metadataUrl: metadataUrl,
        price: nftData.price,
        rentPrice: nftData.rentPrice,
        royaltyPercentage: nftData.royaltyPercentage,
        transactionHash: receipt.hash
      });

      console.log('Saving NFT to database:', {
        tokenId,
        creator,
        metadataUrl,
        imageUrl
      });

      await nft.save();
      console.log('NFT saved successfully');

      // 6. 返回完整的NFT信息
      return {
        tokenId,
        metadata: metadata,
        ipfsHash: metadataUrl,
        imageUrl: imageUrl,
        transactionHash: receipt.hash,
        ...nft.toObject()
      };

    } catch (error) {
      console.error('NFT minting error:', error);
      throw new Error(`Failed to mint NFT: ${error.message}`);
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

  // 铸造NFT的合约调用
  async mintNFTOnChain(metadataUrl, royaltyPercentage) {
    try {
      const signer = await this.provider.getSigner();
      const contractWithSigner = this.nftContract.connect(signer);

      const tx = await contractWithSigner.mintNFT(
        metadataUrl,
        royaltyPercentage
      );

      const receipt = await tx.wait();
      console.log('NFT minted on chain:', receipt.transactionHash);

      // 从事件中获取tokenId
      const mintEvent = receipt.events.find(e => e.event === 'NFTMinted');
      return {
        tokenId: mintEvent.args.tokenId.toString(),
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error minting NFT on chain:', error);
      throw new Error(`Blockchain mint failed: ${error.message}`);
    }
  }
}

export default new NFTService(); 