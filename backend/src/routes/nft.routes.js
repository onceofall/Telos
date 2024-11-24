const express = require('express');
const router = express.Router();
const NFTController = require('../controllers/nft.controller');
const auth = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// NFT 铸造相关路由
router.post('/mint', 
  auth.authenticate, 
  upload.single('image'), 
  NFTController.mintNFT
);

// NFT 查询相关路由
router.get('/:tokenId', NFTController.getNFTDetails);
router.get('/user/:userId', NFTController.getUserNFTs);
router.get('/market/list', NFTController.getMarketNFTs);

// NFT 交易相关路由
router.post('/:tokenId/buy', 
  auth.authenticate, 
  NFTController.buyNFT
);
router.post('/:tokenId/rent', 
  auth.authenticate, 
  NFTController.rentNFT
);
router.post('/:tokenId/list', 
  auth.authenticate, 
  NFTController.listNFTForSale
);
router.post('/:tokenId/delist', 
  auth.authenticate, 
  NFTController.delistNFT
);

// NFT 租赁相关路由
router.post('/:tokenId/rent/extend', 
  auth.authenticate, 
  NFTController.extendRental
);
router.post('/:tokenId/rent/end', 
  auth.authenticate, 
  NFTController.endRental
);

// NFT 版税相关路由
router.put('/:tokenId/royalty', 
  auth.authenticate, 
  NFTController.updateRoyalty
);

// NFT 社交相关路由
router.post('/:tokenId/like', 
  auth.authenticate, 
  NFTController.likeNFT
);
router.post('/:tokenId/comment', 
  auth.authenticate, 
  NFTController.addComment
);
router.get('/:tokenId/comments', 
  NFTController.getComments
);

module.exports = router; 