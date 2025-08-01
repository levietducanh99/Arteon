use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, mint_to};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("CRaskU2g9Wzenfm1s89z5LdDkgCoaMqo9dbHn7YXvTAY");

#[program]
pub mod smart_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = *ctx.accounts.user.key;
        counter.count = 0;
        msg!("Counter initialized to: {}", counter.count);
        Ok(())
    }

    pub fn increment(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        msg!("Counter incremented to: {}", counter.count);
        Ok(())
    }

    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        if counter.count == 0 {
            return Err(ErrorCode::CannotDecrementBelowZero.into());
        }
        counter.count -= 1;
        msg!("Counter decremented to: {}", counter.count);
        Ok(())
    }

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        metadata_uri: String,
        total_supply: u64
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.metadata_uri = metadata_uri;
        vault.total_supply = total_supply;
        vault.is_fractionalized = false;
        vault.buyout_status = 0;
        vault.token_mint = None;

        msg!("Vault initialized with metadata: {}, total supply: {}",
            vault.metadata_uri, vault.total_supply);
        Ok(())
    }

    pub fn fractionalize_vault(ctx: Context<FractionalizeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        // Check that the vault has not already been fractionalized
        if vault.is_fractionalized {
            return Err(ErrorCode::VaultAlreadyFractionalized.into());
        }

        // Get the bump for the token mint PDA
        let vault_key = vault.key();
        let seeds = &[
            b"token_mint",
            vault_key.as_ref(),
            &[ctx.bumps.token_mint],
        ];
        let signer = &[&seeds[..]];

        // Initialize the mint account
        let rent = Rent::get()?;
        let space = 82; // Size of Mint account
        let lamports = rent.minimum_balance(space);

        // Create the mint account using system program WITH PDA SIGNER
        anchor_lang::system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.token_mint.to_account_info(),
                },
                signer, // Use PDA signer here!
            ),
            lamports,
            space as u64,
            &ctx.accounts.token_program.key(),
        )?;

        // Initialize the mint with 9 decimals
        token::initialize_mint(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::InitializeMint {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            9, // 9 decimals
            &ctx.accounts.authority.key(),
            Some(&ctx.accounts.authority.key()),
        )?;

        // Create the associated token account for the authority if it doesn't exist
        if ctx.accounts.authority_token_account.data_is_empty() {
            anchor_spl::associated_token::create(
                CpiContext::new(
                    ctx.accounts.associated_token_program.to_account_info(),
                    anchor_spl::associated_token::Create {
                        payer: ctx.accounts.authority.to_account_info(),
                        associated_token: ctx.accounts.authority_token_account.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                    },
                ),
            )?;
        }

        // Mint the tokens to the authority's token account
        let mint_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.authority_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );

        mint_to(mint_ctx, vault.total_supply)?;

        // Update the vault state
        vault.is_fractionalized = true;
        vault.token_mint = Some(ctx.accounts.token_mint.key());

        msg!("Vault successfully fractionalized!");
        msg!("Token mint: {}", ctx.accounts.token_mint.key());
        msg!("Authority token balance: {}", vault.total_supply);

        Ok(())
    }

    pub fn initiate_buyout(
        ctx: Context<InitiateBuyout>,
        offer_amount: u64
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let buyout_offer = &mut ctx.accounts.buyout_offer;

        // Check that the vault is fractionalized
        if !vault.is_fractionalized {
            return Err(ErrorCode::VaultNotFractionalized.into());
        }

        // Check that offer amount is greater than 0
        if offer_amount == 0 {
            return Err(ErrorCode::InvalidOfferAmount.into());
        }

        // Initialize the buyout offer
        buyout_offer.vault = vault.key();
        buyout_offer.buyer = ctx.accounts.buyer.key();
        buyout_offer.offer_amount = offer_amount;
        buyout_offer.timestamp = Clock::get()?.unix_timestamp;

        msg!("Buyout offer initiated!");
        msg!("Vault: {}", buyout_offer.vault);
        msg!("Buyer: {}", buyout_offer.buyer);
        msg!("Offer amount: {} lamports", buyout_offer.offer_amount);
        msg!("Timestamp: {}", buyout_offer.timestamp);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8 + 32)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + // discriminator
               32 + // authority: Pubkey
               4 + 200 + // metadata_uri: String (4 bytes for length + max 200 chars)
               8 + // total_supply: u64
               1 + // is_fractionalized: bool
               1 + // buyout_status: u8
               1 + 32  // token_mint: Option<Pubkey> (1 for Option discriminator + 32 for Pubkey)
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FractionalizeVault<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::UnauthorizedAccess,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// Token mint PDA derived from vault address
    /// CHECK: This PDA is created and initialized as a token mint in the instruction
    #[account(
        mut,
        seeds = [b"token_mint", vault.key().as_ref()],
        bump,
    )]
    pub token_mint: UncheckedAccount<'info>,

    /// CHECK: This account is initialized as the authority's associated token account
    #[account(mut)]
    pub authority_token_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitiateBuyout<'info> {
    #[account()]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        init,
        payer = buyer,
        space = 8 + // discriminator
               32 + // vault: Pubkey
               32 + // buyer: Pubkey
               8 + // offer_amount: u64
               8,   // timestamp: i64
        seeds = [b"buyout_offer", vault.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub buyout_offer: Account<'info, BuyoutOffer>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub metadata_uri: String,
    pub total_supply: u64,
    pub is_fractionalized: bool,
    pub buyout_status: u8,
    pub token_mint: Option<Pubkey>, // Added to store the mint address when fractionalized
}

#[account]
pub struct BuyoutOffer {
    pub vault: Pubkey,
    pub buyer: Pubkey,
    pub offer_amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Cannot decrement counter below zero")]
    CannotDecrementBelowZero,

    #[msg("Unauthorized access. Only the vault authority can perform this action.")]
    UnauthorizedAccess,

    #[msg("Vault has already been fractionalized.")]
    VaultAlreadyFractionalized,

    #[msg("Vault has not been fractionalized.")]
    VaultNotFractionalized,

    #[msg("Invalid offer amount. Offer amount must be greater than zero.")]
    InvalidOfferAmount,
}
