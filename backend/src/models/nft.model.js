import mongoose from 'mongoose';

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
  isListed: {
    type: Boolean,
    default: false,
  },
  isRented: {
    type: Boolean,
    default: false,
  },
  renter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rentExpiry: Date,
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  metadataUrl: {
    type: String,
    required: true,
  },
  transactionHash: {
    type: String,
  },
});

const NFT = mongoose.model('NFT', nftSchema);

export default NFT; 