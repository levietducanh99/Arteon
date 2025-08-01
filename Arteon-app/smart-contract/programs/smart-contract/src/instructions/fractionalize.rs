use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, MintTo, mint_to, Transfer, transfer};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::*;
use crate::constant::*;
use crate::error::*;

#[derive(Accounts)]
pub struct Fractionalize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.nft_mint.as_ref()],
        bump = vault.bump,
        has_one = authority,
        constraint = !vault.is_closed @ ArteonError::VaultClosed,
        constraint = !vault.is_locked @ ArteonError::VaultLockedForBuyout
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        associated_token::mint = vault.nft_mint,
        associated_token::authority = authority
    )]
    pub user_nft_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = vault.nft_mint,
        associated_token::authority = vault
    )]
    pub vault_nft_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        mint::authority = vault
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = authority
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn fractionalize(
    ctx: Context<Fractionalize>,
    amount: u64,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    // Validate amount
    require!(
        amount >= MIN_FRACTIONAL_AMOUNT,
        ArteonError::InvalidFractionAmount
    );
    
    // Check if user has the NFT
    require!(
        ctx.accounts.user_nft_account.amount > 0,
        ArteonError::NftNotInVault
    );
    
    // Transfer NFT to vault
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_nft_account.to_account_info(),
            to: ctx.accounts.vault_nft_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        },
    );
    
    transfer(transfer_ctx, 1)?;
    
    // Mint fractional tokens to user
    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: vault.to_account_info(),
        },
        &[&[VAULT_SEED, vault.nft_mint.as_ref(), &[vault.bump]]],
    );
    
    mint_to(mint_ctx, amount)?;
    
    // Update vault state
    vault.total_supply = vault.total_supply.checked_add(amount)
        .ok_or(ArteonError::InvalidFractionAmount)?;
    
    msg!("Fractionalized successfully!");
    msg!("NFT transferred to vault");
    msg!("Minted {} fractional tokens", amount);
    msg!("Total supply: {}", vault.total_supply);
    
    Ok(())
}
