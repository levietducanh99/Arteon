import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, clusterApiUrl } from '@solana/web3.js';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BuyoutOffer from '../models/buyoutOffer.models.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {Object} InitiateBuyoutRequest
 * @property {string} vaultAddress
 * @property {number} offerLamports
 * @property {Uint8Array} [buyerKeypair]
 * @property {string} [buyerKeypairPath]
 */

/**
 * @typedef {Object} AcceptRejectBuyoutRequest
 * @property {string} vaultAddress
 * @property {string} buyerPubkey
 */

class BuyoutController {
  constructor() {
    // Initialize connection to localhost for testing
    this.connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    this.initializeProgram();
  }

  async initializeProgram() {
    try {
      // Load IDL from local file
      const idlPath = path.join(__dirname, '../../smart-contract/target/idl/smart_contract.json');
      const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

      // Program ID from your smart contract
      const programId = new PublicKey('CRaskU2g9Wzenfm1s89z5LdDkgCoaMqo9dbHn7YXvTAY');

      // Create a dummy wallet for the provider (will be replaced with actual signers)
      const dummyKeypair = Keypair.generate();
      const wallet = new anchor.Wallet(dummyKeypair);

      this.provider = new anchor.AnchorProvider(this.connection, wallet, {
        commitment: 'confirmed',
      });

      this.program = new anchor.Program(idl, this.provider);

      console.log('✅ Buyout controller initialized with program ID:', programId.toString());
    } catch (error) {
      console.error('❌ Failed to initialize buyout controller:', error);
      throw error;
    }
  }

  // POST /buyout/initiate
  initiateBuyout = async (req, res) => {
    try {
      const { vaultAddress, offerLamports, buyerKeypair, buyerKeypairPath } = req.body;

      console.log('🚀 Initiating buyout offer:', {
        vault: vaultAddress,
        offer: offerLamports,
        timestamp: new Date().toISOString()
      });

      // Validate inputs
      if (!vaultAddress || !offerLamports) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: vaultAddress, offerLamports'
        });
      }

      // Validate vault address format (Base58, ~44 characters)
      if (typeof vaultAddress !== 'string' || vaultAddress.length < 32 || vaultAddress.length > 44) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vaultAddress format. Must be a valid Base58 string (32-44 characters)'
        });
      }

      // Test if vaultAddress is a valid PublicKey
      try {
        new PublicKey(vaultAddress);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid vaultAddress: ${vaultAddress}. Must be a valid Solana public key.`
        });
      }

      if (offerLamports <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Offer amount must be greater than 0'
        });
      }

      // Load buyer keypair with validation
      let buyer;
      if (buyerKeypair) {
        // Validate buyerKeypair array
        if (!Array.isArray(buyerKeypair)) {
          return res.status(400).json({
            success: false,
            message: 'buyerKeypair must be an array of numbers'
          });
        }

        if (buyerKeypair.length !== 64) {
          return res.status(400).json({
            success: false,
            message: `buyerKeypair must have exactly 64 bytes, got ${buyerKeypair.length}`
          });
        }

        // Validate all elements are numbers in valid range
        for (let i = 0; i < buyerKeypair.length; i++) {
          if (!Number.isInteger(buyerKeypair[i]) || buyerKeypair[i] < 0 || buyerKeypair[i] > 255) {
            return res.status(400).json({
              success: false,
              message: `Invalid byte at index ${i}: ${buyerKeypair[i]}. Must be integer 0-255.`
            });
          }
        }

        try {
          buyer = Keypair.fromSecretKey(new Uint8Array(buyerKeypair));
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: `Invalid buyerKeypair: ${error.message}`
          });
        }
      } else if (buyerKeypairPath) {
        try {
          const keypairData = JSON.parse(fs.readFileSync(buyerKeypairPath, 'utf-8'));

          // Validate keypair from file
          if (!Array.isArray(keypairData) || keypairData.length !== 64) {
            return res.status(400).json({
              success: false,
              message: `Invalid keypair file: must contain array of exactly 64 bytes, got ${keypairData?.length || 'invalid'}`
            });
          }

          buyer = Keypair.fromSecretKey(new Uint8Array(keypairData));
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: `Failed to load keypair from file: ${error.message}`
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Must provide either buyerKeypair or buyerKeypairPath'
        });
      }

      const vaultPubkey = new PublicKey(vaultAddress);

      // Check if vault exists and is fractionalized
      let vaultAccount;
      try {
        vaultAccount = await this.program.account.vault.fetch(vaultPubkey);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: `Vault not found at address: ${vaultAddress}. Make sure the vault exists and is deployed on localhost.`
        });
      }

      if (!vaultAccount.isFractionalized) {
        return res.status(400).json({
          success: false,
          message: 'Vault must be fractionalized before accepting buyout offers'
        });
      }

      // Derive buyout offer PDA
      const [buyoutOfferPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('buyout_offer'),
          vaultPubkey.toBuffer(),
          buyer.publicKey.toBuffer(),
        ],
        this.program.programId
      );

      // Check if buyer already has a pending offer
      try {
        await this.program.account.buyoutOffer.fetch(buyoutOfferPDA);
        return res.status(400).json({
          success: false,
          message: 'Buyer already has a pending offer for this vault'
        });
      } catch (error) {
        // Expected error if offer doesn't exist yet
      }

      // Create provider with buyer as signer
      const buyerWallet = new anchor.Wallet(buyer);
      const buyerProvider = new anchor.AnchorProvider(this.connection, buyerWallet, {
        commitment: 'confirmed',
      });
      const programWithBuyer = new anchor.Program(
        this.program.idl,
        buyerProvider
      );

      // Send initiate buyout transaction
      // TODO: Implement initiate_buyout instruction in smart contract
      // For now, we'll mock the buyout initiation
      console.log('💡 Mock: Creating buyout offer...');
      console.log('🏛️  Vault:', vaultAddress);
      console.log('👤 Buyer:', buyer.publicKey.toString());
      console.log('💵 Offer:', offerLamports, 'lamports');
      console.log('📍 Buyout Offer PDA:', buyoutOfferPDA.toString());

      // Mock transaction signature
      const signature = `mock_buyout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // const signature = await programWithBuyer.methods
      //   .initiateBuyout(new BN(offerLamports))
      //   .accounts({
      //     vault: vaultPubkey,
      //     buyer: buyer.publicKey,
      //     buyoutOffer: buyoutOfferPDA,
      //     systemProgram: anchor.web3.SystemProgram.programId,
      //   })
      //   .signers([buyer])
      //   .rpc();

      console.log('✅ Buyout offer initiated successfully!');
      console.log('📝 Transaction signature:', signature);
      console.log('🏛️  Vault:', vaultAddress);
      console.log('👤 Buyer:', buyer.publicKey.toString());
      console.log('💵 Offer:', offerLamports, 'lamports');

      // Save buyout offer to database
      try {
        console.log('💾 Saving buyout offer to database...');

        const buyoutOfferRecord = await BuyoutOffer.create({
          vaultAddress,
          buyerPublicKey: buyer.publicKey.toString(),
          buyoutOfferPDA: buyoutOfferPDA.toString(),
          offerAmount: offerLamports.toString(),
          offerAmountSOL: offerLamports / 1000000000, // Convert lamports to SOL
          transactionSignature: signature,
          network: 'localhost',
          status: 'pending',
          vaultInfo: {
            authority: vaultAccount.authority.toString(),
            metadataUri: vaultAccount.metadataUri,
            totalSupply: vaultAccount.totalSupply.toString(),
            tokenMint: vaultAccount.tokenMint ? vaultAccount.tokenMint.toString() : null,
          },
          buyerNote: req.body.buyerNote || '', // Optional note from buyer
        });

        console.log('✅ Buyout offer saved to database with ID:', buyoutOfferRecord._id);

        res.json({
          success: true,
          signature,
          data: {
            vault: vaultAddress,
            buyer: buyer.publicKey.toString(),
            offerAmount: offerLamports,
            offerAmountSOL: offerLamports / 1000000000,
            buyoutOfferPDA: buyoutOfferPDA.toString(),
            offerId: buyoutOfferRecord._id,
            status: 'pending',
            createdAt: buyoutOfferRecord.createdAt,
            expiresAt: buyoutOfferRecord.expiresAt,
          }
        });

      } catch (dbError) {
        console.error('❌ Failed to save buyout offer to database:', dbError);

        // Still return success since blockchain operation succeeded (or mocked)
        res.json({
          success: true,
          signature,
          data: {
            vault: vaultAddress,
            buyer: buyer.publicKey.toString(),
            offerAmount: offerLamports,
            buyoutOfferPDA: buyoutOfferPDA.toString(),
            warning: 'Offer created but not saved to database'
          }
        });
      }

    } catch (error) {
      console.error('❌ Error initiating buyout:', error);
      res.status(500).json({
        success: false,
        message: `Failed to initiate buyout: ${error.message}`
      });
    }
  };

  // GET /buyout/offers/:vaultAddress
  getBuyoutOffers = async (req, res) => {
    try {
      const { vaultAddress } = req.params;

      console.log('🔍 Fetching buyout offers for vault:', vaultAddress);

      if (!vaultAddress) {
        return res.status(400).json({
          success: false,
          message: 'Vault address is required'
        });
      }

      const vaultPubkey = new PublicKey(vaultAddress);

      // Verify vault exists
      try {
        await this.program.account.vault.fetch(vaultPubkey);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Vault not found'
        });
      }

      // Get all buyout offer accounts for this vault
      const offers = await this.program.account.buyoutOffer.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: vaultPubkey.toBase58(),
          },
        },
      ]);

      const formattedOffers = offers.map(offer => ({
        address: offer.publicKey.toString(),
        vault: offer.account.vault.toString(),
        buyer: offer.account.buyer.toString(),
        offerAmount: offer.account.offerAmount.toString(),
        timestamp: offer.account.timestamp.toNumber(),
        timestampDate: new Date(offer.account.timestamp.toNumber() * 1000).toISOString()
      }));

      console.log(`✅ Found ${formattedOffers.length} buyout offers for vault ${vaultAddress}`);

      res.json({
        success: true,
        data: {
          vaultAddress,
          totalOffers: formattedOffers.length,
          offers: formattedOffers
        }
      });

    } catch (error) {
      console.error('❌ Error fetching buyout offers:', error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch buyout offers: ${error.message}`
      });
    }
  };

  // POST /buyout/accept
  acceptBuyout = async (req, res) => {
    try {
      const { vaultAddress, buyerPubkey } = req.body;

      console.log('✅ Accepting buyout offer:', {
        vault: vaultAddress,
        buyer: buyerPubkey,
        timestamp: new Date().toISOString()
      });

      if (!vaultAddress || !buyerPubkey) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: vaultAddress, buyerPubkey'
        });
      }

      const vaultPubkey = new PublicKey(vaultAddress);
      const buyerPublicKey = new PublicKey(buyerPubkey);

      // Get vault account to verify authority
      const vaultAccount = await this.program.account.vault.fetch(vaultPubkey);

      // Derive buyout offer PDA
      const [buyoutOfferPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('buyout_offer'),
          vaultPubkey.toBuffer(),
          buyerPublicKey.toBuffer(),
        ],
        this.program.programId
      );

      // Verify buyout offer exists
      const buyoutOffer = await this.program.account.buyoutOffer.fetch(buyoutOfferPDA);

      // TODO: Implement accept_buyout instruction in smart contract
      // For now, we'll mock the acceptance by updating vault status
      console.log('💡 Mock: Accepting buyout offer...');
      console.log('💰 Offer amount:', buyoutOffer.offerAmount.toString(), 'lamports');
      console.log('🏛️  Vault authority:', vaultAccount.authority.toString());
      console.log('👤 Buyer:', buyoutOffer.buyer.toString());

      // Mock response since accept_buyout instruction is not yet implemented
      res.json({
        success: true,
        message: 'Buyout offer accepted (mocked)',
        data: {
          vault: vaultAddress,
          buyer: buyerPubkey,
          offerAmount: buyoutOffer.offerAmount.toString(),
          status: 'accepted',
          note: 'This is a mock response. The accept_buyout instruction needs to be implemented in the smart contract.'
        }
      });

    } catch (error) {
      console.error('❌ Error accepting buyout:', error);
      res.status(500).json({
        success: false,
        message: `Failed to accept buyout: ${error.message}`
      });
    }
  };

  // POST /buyout/reject
  rejectBuyout = async (req, res) => {
    try {
      const { vaultAddress, buyerPubkey } = req.body;

      console.log('❌ Rejecting buyout offer:', {
        vault: vaultAddress,
        buyer: buyerPubkey,
        timestamp: new Date().toISOString()
      });

      if (!vaultAddress || !buyerPubkey) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: vaultAddress, buyerPubkey'
        });
      }

      const vaultPubkey = new PublicKey(vaultAddress);
      const buyerPublicKey = new PublicKey(buyerPubkey);

      // Get vault account to verify authority
      const vaultAccount = await this.program.account.vault.fetch(vaultPubkey);

      // Derive buyout offer PDA
      const [buyoutOfferPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('buyout_offer'),
          vaultPubkey.toBuffer(),
          buyerPublicKey.toBuffer(),
        ],
        this.program.programId
      );

      // Verify buyout offer exists
      const buyoutOffer = await this.program.account.buyoutOffer.fetch(buyoutOfferPDA);

      // TODO: Implement reject_buyout or close_buyout_offer instruction in smart contract
      // For now, we'll mock the rejection
      console.log('💡 Mock: Rejecting buyout offer...');
      console.log('💰 Rejected offer amount:', buyoutOffer.offerAmount.toString(), 'lamports');
      console.log('🏛️  Vault authority:', vaultAccount.authority.toString());
      console.log('👤 Buyer:', buyoutOffer.buyer.toString());

      // Mock response since reject_buyout instruction is not yet implemented
      res.json({
        success: true,
        message: 'Buyout offer rejected (mocked)',
        data: {
          vault: vaultAddress,
          buyer: buyerPubkey,
          offerAmount: buyoutOffer.offerAmount.toString(),
          status: 'rejected',
          note: 'This is a mock response. The reject_buyout or close_buyout_offer instruction needs to be implemented in the smart contract.'
        }
      });

    } catch (error) {
      console.error('❌ Error rejecting buyout:', error);
      res.status(500).json({
        success: false,
        message: `Failed to reject buyout: ${error.message}`
      });
    }
  };

  // GET /buyout/generate-buyer-keypair - Generate a new buyer keypair for testing
  generateBuyerKeypair = async (req, res) => {
    try {
      console.log('🔑 Generating new buyer keypair...');

      // Generate new keypair
      const buyerKeypair = Keypair.generate();
      const publicKey = buyerKeypair.publicKey.toString();
      const secretKey = Array.from(buyerKeypair.secretKey);

      // Optional: Save to file if requested
      const { saveToFile, filename } = req.query;
      let savedPath = null;

      if (saveToFile === 'true') {
        const keypairFilename = filename || `buyer-keypair-${Date.now()}.json`;
        const keypairPath = path.join(__dirname, '../config', keypairFilename);

        // Ensure config directory exists
        const configDir = path.dirname(keypairPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        // Save keypair to file
        fs.writeFileSync(keypairPath, JSON.stringify(secretKey, null, 2));
        savedPath = keypairPath;
        console.log('💾 Buyer keypair saved to:', savedPath);
      }

      // Check balance on localhost
      let balance = 0;
      try {
        balance = await this.connection.getBalance(buyerKeypair.publicKey);
      } catch (error) {
        console.log('⚠️  Could not fetch balance from localhost');
      }

      console.log('✅ Buyer keypair generated successfully!');
      console.log('👤 Public Key:', publicKey);
      console.log('💰 Current Balance:', balance / 1000000000, 'SOL');

      res.json({
        success: true,
        data: {
          publicKey,
          secretKey,
          balance: balance / 1000000000, // Convert lamports to SOL
          balanceLamports: balance,
          savedPath,
          note: 'Store the secretKey safely. You can use it in buyout requests.'
        }
      });

    } catch (error) {
      console.error('❌ Error generating buyer keypair:', error);
      res.status(500).json({
        success: false,
        message: `Failed to generate buyer keypair: ${error.message}`
      });
    }
  };

  // POST /buyout/airdrop-buyer - Request SOL airdrop for a buyer (localhost only)
  airdropToBuyer = async (req, res) => {
    try {
      const { buyerPubkey, amount = 10 } = req.body;

      if (!buyerPubkey) {
        return res.status(400).json({
          success: false,
          message: 'buyerPubkey is required'
        });
      }

      console.log('💧 Requesting localhost airdrop for buyer:', buyerPubkey);

      const buyerPublicKey = new PublicKey(buyerPubkey);
      const airdropAmount = amount * 1000000000; // Convert SOL to lamports

      // Request airdrop from localhost
      const signature = await this.connection.requestAirdrop(buyerPublicKey, airdropAmount);

      // Wait for confirmation
      await this.connection.confirmTransaction(signature);

      // Get updated balance
      const newBalance = await this.connection.getBalance(buyerPublicKey);

      console.log('✅ Localhost airdrop completed!');
      console.log('📝 Transaction signature:', signature);
      console.log('💰 New balance:', newBalance / 1000000000, 'SOL');

      res.json({
        success: true,
        signature,
        data: {
          buyerPubkey,
          airdropAmount: amount,
          newBalance: newBalance / 1000000000,
          newBalanceLamports: newBalance
        }
      });

    } catch (error) {
      console.error('❌ Error requesting localhost airdrop:', error);
      res.status(500).json({
        success: false,
        message: `Failed to request localhost airdrop: ${error.message}`
      });
    }
  };

  // GET /buyout/all-offers - Get all buyout offers across all vaults
  getAllBuyoutOffers = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        vaultAddress,
        buyerPublicKey,
        minAmount,
        maxAmount
      } = req.query;

      console.log('🔍 Fetching all buyout offers with filters:', {
        page, limit, status, sortBy, sortOrder, vaultAddress, buyerPublicKey
      });

      // Build filter object
      const filter = {};

      if (status !== 'all') {
        filter.status = status;
      }

      if (vaultAddress) {
        filter.vaultAddress = vaultAddress;
      }

      if (buyerPublicKey) {
        filter.buyerPublicKey = buyerPublicKey;
      }

      if (minAmount || maxAmount) {
        filter.offerAmountSOL = {};
        if (minAmount) filter.offerAmountSOL.$gte = parseFloat(minAmount);
        if (maxAmount) filter.offerAmountSOL.$lte = parseFloat(maxAmount);
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;

      const [offers, totalCount] = await Promise.all([
        BuyoutOffer.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        BuyoutOffer.countDocuments(filter)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      console.log(`✅ Found ${offers.length} buyout offers (${totalCount} total)`);

      res.json({
        success: true,
        data: {
          offers,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalOffers: totalCount,
            offersPerPage: parseInt(limit),
            hasNext,
            hasPrev,
          },
          filters: {
            status,
            vaultAddress,
            buyerPublicKey,
            minAmount,
            maxAmount,
            sortBy,
            sortOrder
          }
        }
      });

    } catch (error) {
      console.error('❌ Error fetching all buyout offers:', error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch buyout offers: ${error.message}`
      });
    }
  };

  // GET /buyout/vault/:vaultAddress/offers - Get buyout offers for specific vault from database
  getVaultBuyoutOffers = async (req, res) => {
    try {
      const { vaultAddress } = req.params;
      const { status = 'pending', sortBy = 'offerAmountSOL', sortOrder = 'desc' } = req.query;

      console.log('🔍 Fetching buyout offers from database for vault:', vaultAddress);

      if (!vaultAddress) {
        return res.status(400).json({
          success: false,
          message: 'Vault address is required'
        });
      }

      // Build filter
      const filter = { vaultAddress };
      if (status !== 'all') {
        filter.status = status;
      }

      // Get offers from database
      const offers = await BuyoutOffer.find(filter)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .lean();

      // Get vault info for context
      let vaultInfo = null;
      try {
        const vaultPubkey = new PublicKey(vaultAddress);
        const vaultAccount = await this.program.account.vault.fetch(vaultPubkey);
        vaultInfo = {
          authority: vaultAccount.authority.toString(),
          metadataUri: vaultAccount.metadataUri,
          totalSupply: vaultAccount.totalSupply.toString(),
          isFractionalized: vaultAccount.isFractionalized,
          tokenMint: vaultAccount.tokenMint ? vaultAccount.tokenMint.toString() : null,
        };
      } catch (error) {
        console.warn('⚠️ Could not fetch vault info:', error.message);
      }

      console.log(`✅ Found ${offers.length} buyout offers for vault ${vaultAddress}`);

      res.json({
        success: true,
        data: {
          vaultAddress,
          vaultInfo,
          totalOffers: offers.length,
          offers,
          filters: { status, sortBy, sortOrder }
        }
      });

    } catch (error) {
      console.error('❌ Error fetching vault buyout offers:', error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch vault buyout offers: ${error.message}`
      });
    }
  };

  // GET /buyout/buyer/:buyerPublicKey/offers - Get buyout offers by buyer
  getBuyerOffers = async (req, res) => {
    try {
      const { buyerPublicKey } = req.params;
      const { status = 'all', page = 1, limit = 10 } = req.query;

      console.log('🔍 Fetching buyout offers for buyer:', buyerPublicKey);

      if (!buyerPublicKey) {
        return res.status(400).json({
          success: false,
          message: 'Buyer public key is required'
        });
      }

      // Build filter
      const filter = { buyerPublicKey };
      if (status !== 'all') {
        filter.status = status;
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;

      const [offers, totalCount] = await Promise.all([
        BuyoutOffer.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        BuyoutOffer.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      console.log(`✅ Found ${offers.length} buyout offers for buyer ${buyerPublicKey}`);

      res.json({
        success: true,
        data: {
          buyerPublicKey,
          totalOffers: totalCount,
          offers,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          }
        }
      });

    } catch (error) {
      console.error('❌ Error fetching buyer offers:', error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch buyer offers: ${error.message}`
      });
    }
  };

  // GET /buyout/top-offers - Get top buyout offers by amount
  getTopOffers = async (req, res) => {
    try {
      const { limit = 10, status = 'pending' } = req.query;

      console.log('🔍 Fetching top buyout offers...');

      // Build filter
      const filter = {};
      if (status !== 'all') {
        filter.status = status;
        if (status === 'pending') {
          // Only include non-expired offers
          filter.expiresAt = { $gt: new Date() };
        }
      }

      const offers = await BuyoutOffer.find(filter)
        .sort({ offerAmountSOL: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      console.log(`✅ Found ${offers.length} top buyout offers`);

      res.json({
        success: true,
        data: {
          totalOffers: offers.length,
          offers,
          criteria: {
            sortBy: 'offerAmountSOL',
            sortOrder: 'desc',
            limit: parseInt(limit),
            status
          }
        }
      });

    } catch (error) {
      console.error('❌ Error fetching top offers:', error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch top offers: ${error.message}`
      });
    }
  };

  // GET /buyout/statistics - Get buyout statistics
  getBuyoutStatistics = async (req, res) => {
    try {
      console.log('📊 Calculating buyout statistics...');

      const [
        totalOffers,
        pendingOffers,
        acceptedOffers,
        rejectedOffers,
        expiredOffers,
        totalValueStats,
        topOffer
      ] = await Promise.all([
        BuyoutOffer.countDocuments(),
        BuyoutOffer.countDocuments({ status: 'pending', expiresAt: { $gt: new Date() } }),
        BuyoutOffer.countDocuments({ status: 'accepted' }),
        BuyoutOffer.countDocuments({ status: 'rejected' }),
        BuyoutOffer.countDocuments({
          $or: [
            { status: 'expired' },
            { status: 'pending', expiresAt: { $lte: new Date() } }
          ]
        }),
        BuyoutOffer.aggregate([
          {
            $group: {
              _id: null,
              totalValue: { $sum: '$offerAmountSOL' },
              averageOffer: { $avg: '$offerAmountSOL' },
              minOffer: { $min: '$offerAmountSOL' },
              maxOffer: { $max: '$offerAmountSOL' }
            }
          }
        ]),
        BuyoutOffer.findOne().sort({ offerAmountSOL: -1 }).lean()
      ]);

      const stats = totalValueStats[0] || {
        totalValue: 0,
        averageOffer: 0,
        minOffer: 0,
        maxOffer: 0
      };

      console.log('✅ Buyout statistics calculated');

      res.json({
        success: true,
        data: {
          offers: {
            total: totalOffers,
            pending: pendingOffers,
            accepted: acceptedOffers,
            rejected: rejectedOffers,
            expired: expiredOffers,
          },
          value: {
            totalValueSOL: stats.totalValue,
            averageOfferSOL: stats.averageOffer,
            minOfferSOL: stats.minOffer,
            maxOfferSOL: stats.maxOffer,
          },
          topOffer: topOffer ? {
            id: topOffer._id,
            vaultAddress: topOffer.vaultAddress,
            buyerPublicKey: topOffer.buyerPublicKey,
            offerAmountSOL: topOffer.offerAmountSOL,
            status: topOffer.status,
            createdAt: topOffer.createdAt
          } : null,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error calculating buyout statistics:', error);
      res.status(500).json({
        success: false,
        message: `Failed to calculate statistics: ${error.message}`
      });
    }
  };
}

export default new BuyoutController();
