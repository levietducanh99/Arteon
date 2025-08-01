use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("6BoiezFL64ETgYVmNAE3w3di2qoQDEU6BMHt3Yqfe9XU");

#[program]
pub mod smart_contract {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        artist_royalty_bps: u64,
        rent_price_per_day: Option<u64>,
    ) -> Result<()> {
        instructions::initialize_vault::initialize_vault(ctx, artist_royalty_bps, rent_price_per_day)
    }

    pub fn fractionalize(
        ctx: Context<Fractionalize>,
        amount: u64,
    ) -> Result<()> {
        instructions::fractionalize::fractionalize(ctx, amount)
    }

    pub fn vote_buyout(
        ctx: Context<VoteBuyout>,
        vote_for_buyout: bool,
    ) -> Result<()> {
        instructions::vote_buyout::vote_buyout(ctx, vote_for_buyout)
    }

    pub fn redeem(
        ctx: Context<Redeem>,
        amount: u64,
    ) -> Result<()> {
        instructions::redeem::redeem(ctx, amount)
    }

    pub fn buyout(
        ctx: Context<Buyout>,
    ) -> Result<()> {
        instructions::buyout::buyout(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
