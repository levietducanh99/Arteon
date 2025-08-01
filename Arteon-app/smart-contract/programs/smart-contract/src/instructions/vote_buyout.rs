use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::state::*;
use crate::constant::*;
use crate::error::*;

#[derive(Accounts)]
pub struct VoteBuyout<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.nft_mint.as_ref()],
        bump = vault.bump,
        constraint = !vault.is_closed @ ArteonError::VaultClosed,
        constraint = vault.buyout_price.is_some() @ ArteonError::BuyoutVoteNotActive
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        associated_token::mint = vault.token_mint,
        associated_token::authority = voter
    )]
    pub voter_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = voter,
        space = Vote::LEN,
        seeds = [VOTE_SEED, vault.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, Vote>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn vote_buyout(
    ctx: Context<VoteBuyout>,
    vote_for_buyout: bool,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let vote = &mut ctx.accounts.vote;
    let clock = Clock::get()?;
    
    // Check if buyout vote is active
    require!(
        vault.buyout_vote_start.is_some() && vault.buyout_vote_end.is_some(),
        ArteonError::BuyoutVoteNotActive
    );
    
    // Check if vote period has expired
    require!(
        clock.unix_timestamp < vault.buyout_vote_end.unwrap(),
        ArteonError::BuyoutVoteExpired
    );
    
    // Check if voter has tokens
    let token_balance = ctx.accounts.voter_token_account.amount;
    require!(
        token_balance > 0,
        ArteonError::InsufficientTokenBalance
    );
    
    // Check if user already voted
    if vote.vault == vault.key() && vote.voter == ctx.accounts.voter.key() {
        require!(
            vote.token_amount == 0,
            ArteonError::UserAlreadyVoted
        );
    }
    
    // Record the vote
    vote.vault = vault.key();
    vote.voter = ctx.accounts.voter.key();
    vote.token_amount = token_balance;
    vote.vote_for_buyout = vote_for_buyout;
    vote.bump = *ctx.bumps.get("vote").unwrap();
    
    // Update vault vote count
    if vote_for_buyout {
        vault.total_votes = vault.total_votes.checked_add(token_balance)
            .ok_or(ArteonError::InvalidFractionAmount)?;
    }
    
    msg!("Vote recorded successfully!");
    msg!("Voter: {}", vote.voter);
    msg!("Token amount: {}", vote.token_amount);
    msg!("Vote for buyout: {}", vote_for_buyout);
    msg!("Total votes for buyout: {}", vault.total_votes);
    
    Ok(())
}
