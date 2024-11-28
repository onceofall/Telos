import mongoose from 'mongoose';

const nftSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
  },
  creator: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
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
  imageUrl: {
    type: String,
    required: true,
  },
  metadataUrl: {
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
  isListed: {
    type: Boolean,
    default: false,
  },
  isRented: {
    type: Boolean,
    default: false,
  },
  renter: {
    type: String,
  },
  rentExpiry: Date,
  transactionHash: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const NFT = mongoose.model('NFT', nftSchema);

export default NFT; 