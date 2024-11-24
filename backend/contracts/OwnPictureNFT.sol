// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract OwnPictureNFT is ERC721, ERC721URIStorage, ERC721Royalty, ReentrancyGuard, Ownable, Pausable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // 常量定义
    uint256 public constant MAX_ROYALTY = 1000; // 最大版税10%
    uint256 public constant PLATFORM_FEE = 250;  // 平台费用2.5%

    // NFT市场相关结构
    struct Listing {
        address seller;
        uint256 price;
        uint256 rentPrice;
        bool isListed;
    }

    // 租赁相关结构
    struct Rental {
        address renter;
        uint256 expires;
        bool isRented;
    }

    // 映射关系
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Rental) public rentals;
    mapping(uint256 => address) public creators;
    mapping(address => uint256) public creatorBalance; // 创作者收益
    mapping(uint256 => bool) public tokenBlacklist; // NFT黑名单

    // 平台地址
    address public platformWallet;

    // 事件声明
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);
    event NFTListed(uint256 indexed tokenId, uint256 price, uint256 rentPrice);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event NFTRented(uint256 indexed tokenId, address indexed renter, uint256 duration);
    event RoyaltyUpdated(uint256 indexed tokenId, uint96 royaltyPoints);
    event CreatorWithdraw(address indexed creator, uint256 amount);
    event TokenBlacklisted(uint256 indexed tokenId, bool status);

    // 修饰符
    modifier notBlacklisted(uint256 tokenId) {
        require(!tokenBlacklist[tokenId], "Token is blacklisted");
        _;
    }

    modifier onlyCreator(uint256 tokenId) {
        require(creators[tokenId] == msg.sender, "Not the creator");
        _;
    }

    constructor(address _platformWallet) ERC721("OwnPicture", "OWP") {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    // 铸造NFT
    function mintNFT(string memory _tokenURI, uint96 royaltyPoints) 
        public 
        whenNotPaused
        returns (uint256) 
    {
        require(royaltyPoints <= MAX_ROYALTY, "Royalty too high");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        _setTokenRoyalty(newTokenId, msg.sender, royaltyPoints);
        
        creators[newTokenId] = msg.sender;
        
        emit NFTMinted(newTokenId, msg.sender, _tokenURI);
        return newTokenId;
    }

    // 上架NFT
    function listNFT(uint256 tokenId, uint256 price, uint256 rentPrice) 
        public 
        whenNotPaused
        notBlacklisted(tokenId)
    {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(!rentals[tokenId].isRented, "NFT is currently rented");
        require(price > 0, "Price must be greater than 0");
        
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            rentPrice: rentPrice,
            isListed: true
        });
        
        emit NFTListed(tokenId, price, rentPrice);
    }

    // 购买NFT
    function buyNFT(uint256 tokenId) 
        public 
        payable 
        nonReentrant 
        whenNotPaused
        notBlacklisted(tokenId)
    {
        Listing memory listing = listings[tokenId];
        require(listing.isListed, "NFT not listed for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        
        address seller = listing.seller;
        uint256 price = listing.price;
        
        // 处理费用分配
        uint256 platformFee = (price * PLATFORM_FEE) / 10000;
        (address royaltyReceiver, uint256 royaltyAmount) = royaltyInfo(tokenId, price);
        uint256 sellerAmount = price - platformFee - royaltyAmount;
        
        // 转账
        payable(platformWallet).transfer(platformFee);
        if(royaltyAmount > 0) {
            creatorBalance[royaltyReceiver] += royaltyAmount;
        }
        payable(seller).transfer(sellerAmount);
        
        // 转移NFT所有权
        _transfer(seller, msg.sender, tokenId);
        
        // 清除listing
        delete listings[tokenId];
        
        emit NFTSold(tokenId, seller, msg.sender, price);
    }

    // 租赁NFT
    function rentNFT(uint256 tokenId, uint256 duration) 
        public 
        payable 
        nonReentrant 
        whenNotPaused
        notBlacklisted(tokenId)
    {
        require(duration > 0 && duration <= 365, "Invalid duration");
        Listing memory listing = listings[tokenId];
        require(listing.rentPrice > 0, "NFT not available for rent");
        require(!rentals[tokenId].isRented, "NFT already rented");
        
        uint256 totalRentPrice = listing.rentPrice * duration;
        require(msg.value >= totalRentPrice, "Insufficient payment");
        
        // 处理租赁费用
        uint256 platformFee = (totalRentPrice * PLATFORM_FEE) / 10000;
        uint256 ownerAmount = totalRentPrice - platformFee;
        
        payable(platformWallet).transfer(platformFee);
        payable(ownerOf(tokenId)).transfer(ownerAmount);
        
        // 记录租赁信息
        rentals[tokenId] = Rental({
            renter: msg.sender,
            expires: block.timestamp + (duration * 1 days),
            isRented: true
        });
        
        emit NFTRented(tokenId, msg.sender, duration);
    }

    // 提取创作者收益
    function withdrawCreatorBalance() 
        public 
        nonReentrant 
    {
        uint256 balance = creatorBalance[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        creatorBalance[msg.sender] = 0;
        payable(msg.sender).transfer(balance);
        
        emit CreatorWithdraw(msg.sender, balance);
    }

    // 管理功能
    function setTokenBlacklist(uint256 tokenId, bool status) 
        public 
        onlyOwner 
    {
        tokenBlacklist[tokenId] = status;
        emit TokenBlacklisted(tokenId, status);
    }

    function setPlatformWallet(address newWallet) 
        public 
        onlyOwner 
    {
        require(newWallet != address(0), "Invalid address");
        platformWallet = newWallet;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // 重写必要的函数
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721) whenNotPaused {
        require(!tokenBlacklist[tokenId], "Token is blacklisted");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage, ERC721Royalty) 
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 