import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Tạo một keypair mới
const keypair = Keypair.generate();

console.log('Generated Authority Wallet:');
console.log('Public Key:', keypair.publicKey.toString());

// Lưu vào file authority-wallet.json
const walletData = {
  publicKey: keypair.publicKey.toString(),
  secretKey: Array.from(keypair.secretKey),
  createdAt: new Date().toISOString(),
  purpose: 'Fixed Server Authority Wallet for All Vaults',
  isFixed: true
};

fs.writeFileSync('./data/authority-wallet.json', JSON.stringify(walletData, null, 2));
console.log('✅ Authority wallet saved to data/authority-wallet.json');
console.log('🔑 This will be your fixed server authority for all vaults');
