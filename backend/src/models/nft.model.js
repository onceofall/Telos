const mongoose = require('mongoose');

const nftSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  ipfsHash: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  rentPrice: String,
  royaltyPercentage: {
    type: Number,
    default: 0,
  },
  isRented: {
    type: Boolean,
    default: false,
  },
  rentExpiry: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('NFT', nftSchema); 