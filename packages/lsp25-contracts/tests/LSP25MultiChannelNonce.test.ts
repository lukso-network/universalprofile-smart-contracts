import { ethers } from 'hardhat';
import { expect } from 'chai';
import { LSP25_VERSION } from '../constants';
import { EIP191Signer } from '@lukso/eip191-signer.js';

import { LSP25MultiChannelNonceTester, LSP25MultiChannelNonceTester__factory } from '../typechain';

/**
 * Private keys for the accounts used in the tests.
 * These are the private keys for the accounts generated by the hardhat node (local blockchain).
 * The private keys are used to sign messages with lsp6-signers.js library.
 *
 * WARNING! These private keys and their related accounts are publicly known and should never be used in production.
 *          Any funds sent to them on Mainnet or any other live network WILL BE LOST.
 */
const LOCAL_PRIVATE_KEYS = {
  ACCOUNT0: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  ACCOUNT1: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  ACCOUNT2: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  ACCOUNT3: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  ACCOUNT4: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  ACCOUNT5: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  ACCOUNT6: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  ACCOUNT7: '0x030ab56c9834360e1c0dba6b9a955b6e127f3166cda462c2472f67e1ba773053',
};

describe('LSP25MultiChannelNonce', () => {
  let contract: LSP25MultiChannelNonceTester;
  let account;

  const HARDHAT_CHAINID = 31337;

  const eip191Signer = new EIP191Signer();
  const signerPrivateKey = LOCAL_PRIVATE_KEYS.ACCOUNT0;

  before(async () => {
    account = (await ethers.getSigners())[0];

    contract = await new LSP25MultiChannelNonceTester__factory(account).deploy();
  });

  describe('testing `_isValidNonce`', () => {
    it('should return `true` when providing a valid nonce', async () => {
      const nonce = await contract.getNonce(account.address, 0);
      const result = await contract.isValidNonce(account.address, nonce);
      expect(result).to.be.true;
    });

    it('should return `false` if the wrong nonce provided', async () => {
      const nonce = await contract.getNonce(account.address, 0);
      const invalidNonce = 35;
      expect(nonce).to.not.equal(invalidNonce); // sanity check

      const result = await contract.isValidNonce(account.address, invalidNonce);
      expect(result).to.be.false;
    });
  });

  describe('testing `_recoverSignerFromLSP25Signature`', () => {
    it('should pass and recover the right address if the data was signed with LSP25 signature format', async () => {
      const channelId = 0;

      const parameters = {
        nonce: await contract.getNonce(account.address, channelId),
        validityTimestamps: 0,
        valueToSend: 0,
        payload: '0xcafecafe',
      };

      const encodedMessage = ethers.solidityPacked(
        ['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes'],
        [
          LSP25_VERSION,
          HARDHAT_CHAINID,
          parameters.nonce,
          parameters.validityTimestamps,
          parameters.valueToSend,
          parameters.payload,
        ],
      );

      const { signature } = await eip191Signer.signDataWithIntendedValidator(
        contract.target as string,
        encodedMessage,
        signerPrivateKey,
      );

      const recoveredAddress = await contract.recoverSignerFromLSP25Signature(
        signature,
        parameters.nonce,
        parameters.validityTimestamps,
        parameters.valueToSend,
        parameters.payload,
      );
      expect(recoveredAddress).to.equal(account.address);
    });

    it('should return the wrong address if the data was signed with version different than 25', async () => {
      const channelId = 0;

      const parameters = {
        nonce: await contract.getNonce(account.address, channelId),
        validityTimestamps: 0,
        valueToSend: 0,
        payload: '0xcafecafe',
      };

      const encodedMessage = ethers.solidityPacked(
        ['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes'],
        [
          12345, // incorrect version number
          HARDHAT_CHAINID,
          parameters.nonce,
          parameters.validityTimestamps,
          parameters.valueToSend,
          parameters.payload,
        ],
      );

      const { signature } = await eip191Signer.signDataWithIntendedValidator(
        contract.target as string,
        encodedMessage,
        signerPrivateKey,
      );

      const recoveredAddress = await contract.recoverSignerFromLSP25Signature(
        signature,
        parameters.nonce,
        parameters.validityTimestamps,
        parameters.valueToSend,
        parameters.payload,
      );
      expect(recoveredAddress).to.not.equal(account.address);
    });

    it('should return the wrong address if the data was signed with an invalid nonce', async () => {
      const parameters = {
        nonce: 12345,
        validityTimestamps: 0,
        valueToSend: 0,
        payload: '0xcafecafe',
      };

      const encodedMessage = ethers.solidityPacked(
        ['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes'],
        [
          12345, // incorrect version number
          HARDHAT_CHAINID,
          parameters.nonce,
          parameters.validityTimestamps,
          parameters.valueToSend,
          parameters.payload,
        ],
      );

      const { signature } = await eip191Signer.signDataWithIntendedValidator(
        contract.target as string,
        encodedMessage,
        signerPrivateKey,
      );

      const recoveredAddress = await contract.recoverSignerFromLSP25Signature(
        signature,
        parameters.nonce,
        parameters.validityTimestamps,
        parameters.valueToSend,
        parameters.payload,
      );
      expect(recoveredAddress).to.not.equal(account.address);
    });
  });
});
