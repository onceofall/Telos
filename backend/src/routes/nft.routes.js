import express from 'express';
import auth from '../middleware/auth.middleware.js';
import multer from 'multer';
import NFTController from '../controllers/nft.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 测试路由
router.get('/test', (req, res) => {
  res.json({ message: 'NFT route working' });
});

// NFT 铸造相关路由
router.post('/mint', 
  // auth.authenticate, 
  upload.single('image'), 
  NFTController.mintNFT
);

// NFT 查询相关路由
router.get('/market/list', NFTController.getMarketNFTs);
router.get('/user/:userId', NFTController.getUserNFTs);
router.get('/:tokenId', NFTController.getNFTDetails);

// NFT 交易相关路由
router.post('/:tokenId/buy', 
  auth.authenticate, 
  NFTController.buyNFT
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
router.post('/:tokenId/rent', 
  auth.authenticate, 
  NFTController.rentNFT
);

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

export default router; 