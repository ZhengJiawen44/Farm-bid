const Auction = require('../models/Auctions');
const Product = require('../models/Product');  
const Notification = require('../models/Notification');

// Create a new auction (existing function)
exports.createAuction = async (req, res) => {
  const { productId, startingBid, endTime } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product || product.user.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    // Parse and validate endTime
    const parsedEndTime = new Date(endTime);
    const currentDate = new Date();

    if (isNaN(parsedEndTime.getTime()) || parsedEndTime <= currentDate) {
      return res.status(400).json({ message: 'Invalid or past endTime provided. Please provide a valid future date.' });
    }

    // Create the auction
    const newAuction = new Auction({
      product: productId,
      startingPrice: startingBid,
      endTime: parsedEndTime.toISOString(), // Store the endTime in ISO format
      bids: [],
    });

    await newAuction.save();
    res.status(201).json(newAuction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Get all auctions 
exports.getAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find().populate('product');
    const currentDate = new Date();

    const updatedAuctions = auctions.map((auction) => {
      const auctionStatus = currentDate > auction.endTime ? 'ended' : 'active';

      const highestBid = auction.bids.length > 0
        ? Math.max(...auction.bids.map((bid) => bid.amount))
        : auction.startingPrice;

      return {
        ...auction.toObject(),
        highestBid,
        status: auctionStatus,  // Calculate status based on endTime and current time
      };
    });

    res.json(updatedAuctions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Submit a bid 
exports.submitBid = async (req, res) => {
  const { auctionId } = req.params;
  const { bidAmount } = req.body;

  try {
    const auction = await Auction.findById(auctionId).populate('product');

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Check if the auction has ended
    if (new Date() > auction.endTime || auction.status === 'ended') {
      return res.status(400).json({ message: 'This auction has already ended.' });
    }

    const highestBid = auction.bids.length > 0 ? auction.bids[auction.bids.length - 1].amount : auction.startingPrice;
    if (bidAmount <= highestBid) {
      return res.status(400).json({ message: 'Bid must be higher than the current highest bid' });
    }

    auction.bids.push({
      user: req.user.id,
      amount: bidAmount,
      time: Date.now(),
    });

    await auction.save();

    // Add notification for the farmer
    const farmerNotification = new Notification({
      user: auction.product.user,
      message: `A new bid of $${bidAmount} was placed on your product "${auction.product.title}".`,
      type: 'bid'
    });
    await farmerNotification.save();

    // Notification for the previous highest bidder
    if (auction.bids.length > 1) {
      const previousBidderId = auction.bids[auction.bids.length - 2].user;
      const outbidNotification = new Notification({
        user: previousBidderId,
        message: `You have been outbid on the auction for "${auction.product.title}".`,
        type: 'bid'
      });
      await outbidNotification.save();
    }

    res.status(200).json(auction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get auctions created by the logged-in farmer 
exports.getFarmerAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find().populate('product');
    const farmerAuctions = auctions
      .filter(auction => auction.product && auction.product.user.toString() === req.user.id)
      .map(auction => {
        const highestBid = auction.bids.length > 0
          ? Math.max(...auction.bids.map(bid => bid.amount))
          : auction.startingPrice;
        const auctionStatus = new Date() > auction.endTime ? 'Ended' : 'Ongoing';

        // Return auction with the highest bid and status
        return {
          ...auction.toObject(),
          highestBid,
          status: auctionStatus
        };
      });

    if (farmerAuctions.length === 0) {
      return res.status(404).json({ message: 'No auctions found for this farmer' });
    }

    res.json(farmerAuctions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};  

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


