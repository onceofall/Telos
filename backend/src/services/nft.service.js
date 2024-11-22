const { create } = require('ipfs-http-client');
const { ethers } = require('ethers');
const NFT = require('../models/nft.model');

class NFTService {
  constructor() {
    this.ipfs = create(process.env.IPFS_NODE);
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
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
}

module.exports = new NFTService(); 