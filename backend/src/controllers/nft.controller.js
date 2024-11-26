import NFTService from '../services/nft.service.js';

const NFTController = {
  // 铸造NFT
  mintNFT: async (req, res) => {
    try {
      const { title, description, price, rentPrice, royaltyPercentage } = req.body;
      const file = req.file;
      const userId = req.id;

      if (!file || !title || !price) {
        return res.status(400).json({ 
          message: '缺少必要参数：图片、标题或价格' 
        });
      }

      const nft = await NFTService.mintNFT(userId, file, {
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
  },

  // 获取NFT详情
  getNFTDetails: async (req, res) => {
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
  },

  // 获取用户的NFT列表
  getUserNFTs: async (req, res) => {
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
  },

  // 获取市场NFT列表
  getMarketNFTs: async (req, res) => {
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
  },

  // 购买NFT
  buyNFT: async (req, res) => {
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
  },

  // 上架NFT
  listNFTForSale: async (req, res) => {
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
  },

  // 下架NFT
  delistNFT: async (req, res) => {
    try {
      const { tokenId } = req.params;
      const ownerId = req.user.id;
      
      await NFTService.delistNFT(tokenId, ownerId);
      
      res.json({
        message: 'NFT下架成功'
      });
    } catch (error) {
      res.status(500).json({
        message: 'NFT下架失败',
        error: error.message
      });
    }
  },

  // 租赁NFT
  rentNFT: async (req, res) => {
    try {
      const { tokenId } = req.params;
      const { duration } = req.body;
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
  },

  // 延长租赁
  extendRental: async (req, res) => {
    try {
      const { tokenId } = req.params;
      const { duration } = req.body;
      const renterId = req.user.id;
      
      const result = await NFTService.extendRental(tokenId, renterId, duration);
      
      res.json({
        message: '租赁延期成功',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        message: '租赁延期失败',
        error: error.message
      });
    }
  },

  // 结束租赁
  endRental: async (req, res) => {
    try {
      const { tokenId } = req.params;
      const userId = req.user.id;
      
      await NFTService.endRental(tokenId, userId);
      
      res.json({
        message: '租赁结束成功'
      });
    } catch (error) {
      res.status(500).json({
        message: '租赁结束失败',
        error: error.message
      });
    }
  },

  // 更新版税
  updateRoyalty: async (req, res) => {
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
};

export default NFTController; 