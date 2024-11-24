const NFTService = require('../services/nft.service');
const multer = require('multer');
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制5MB
  }
});

class NFTController {
  // 上传并铸造NFT
  async mintNFT(req, res) {
    try {
      const { title, description, price, rentPrice, royaltyPercentage } = req.body;
      const file = req.file;
      const userId = req.user.id; // 从认证中间件获取

      // 参数验证
      if (!file || !title || !price) {
        return res.status(400).json({ 
          message: '缺少必要参数：图片、标题或价格' 
        });
      }

      // 上传到IPFS
      const ipfsResult = await NFTService.uploadToIPFS(file, {
        title,
        description,
        attributes: []
      });

      // 铸造NFT
      const nft = await NFTService.mintNFT(userId, ipfsResult.metadataHash, {
        title,
        description,
        price,
        rentPrice,
        royaltyPercentage
      });

      res.status(201).json({
        message: 'NFT铸造成功',
        data: nft
      });

    } catch (error) {
      console.error('NFT铸造失败:', error);
      res.status(500).json({ 
        message: '铸造NFT时发生错误',
        error: error.message 
      });
    }
  }

  // 获取NFT详情
  async getNFTDetails(req, res) {
    try {
      const { tokenId } = req.params;
      const nft = await NFTService.getNFTByTokenId(tokenId);
      
      if (!nft) {
        return res.status(404).json({ 
          message: 'NFT不存在' 
        });
      }

      res.json({
        message: '获取成功',
        data: nft
      });

    } catch (error) {
      res.status(500).json({ 
        message: '获取NFT详情失败',
        error: error.message 
      });
    }
  }

  // 获取用户的NFT列表
  async getUserNFTs(req, res) {
    try {
      const { userId } = req.params;
      const nfts = await NFTService.getNFTsByUser(userId);
      
      res.json({
        message: '获取成功',
        data: nfts
      });
    } catch (error) {
      res.status(500).json({
        message: '获取用户NFT失败',
        error: error.message
      });
    }
  }

  // 获取市场上在售的NFT列表
  async getMarketNFTs(req, res) {
    try {
      const { page = 1, limit = 10, sort = 'price', order = 'asc' } = req.query;
      const nfts = await NFTService.getMarketNFTs(page, limit, sort, order);
      
      res.json({
        message: '获取成功',
        data: nfts
      });
    } catch (error) {
      res.status(500).json({
        message: '获取市场NFT失败',
        error: error.message
      });
    }
  }

  // 购买NFT
  async buyNFT(req, res) {
    try {
      const { tokenId } = req.params;
      const buyerId = req.user.id;
      
      const result = await NFTService.buyNFT(tokenId, buyerId);
      
      res.json({
        message: 'NFT购买成功',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        message: 'NFT购买失败',
        error: error.message
      });
    }
  }

  // 租赁NFT
  async rentNFT(req, res) {
    try {
      const { tokenId } = req.params;
      const { duration } = req.body; // 租赁时长（天）
      const renterId = req.user.id;
      
      const result = await NFTService.rentNFT(tokenId, renterId, duration);
      
      res.json({
        message: 'NFT租赁成功',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        message: 'NFT租赁失败',
        error: error.message
      });
    }
  }

  // 上架NFT
  async listNFTForSale(req, res) {
    try {
      const { tokenId } = req.params;
      const { price, rentPrice } = req.body;
      const ownerId = req.user.id;
      
      const result = await NFTService.listNFT(tokenId, ownerId, price, rentPrice);
      
      res.json({
        message: 'NFT上架成功',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        message: 'NFT上架失败',
        error: error.message
      });
    }
  }

  // 更新版税
  async updateRoyalty(req, res) {
    try {
      const { tokenId } = req.params;
      const { royaltyPercentage } = req.body;
      const creatorId = req.user.id;
      
      const result = await NFTService.updateRoyalty(tokenId, creatorId, royaltyPercentage);
      
      res.json({
        message: '版税更新成功',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        message: '版税更新失败',
        error: error.message
      });
    }
  }

  // 点赞NFT
  async likeNFT(req, res) {
    try {
      const { tokenId } = req.params;
      const userId = req.user.id;
      
      const result = await NFTService.likeNFT(tokenId, userId);
      
      res.json({
        message: '点赞成功',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        message: '点赞失败',
        error: error.message
      });
    }
  }

  // 评论NFT
  async addComment(req, res) {
    try {
      const { tokenId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;
      
      const result = await NFTService.addComment(tokenId, userId, content);
      
      res.json({
        message: '评论成功',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        message: '评论失败',
        error: error.message
      });
    }
  }
}

module.exports = new NFTController(); 