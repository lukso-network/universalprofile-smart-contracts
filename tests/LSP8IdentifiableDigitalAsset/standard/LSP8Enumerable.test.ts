import { LSP8EnumerableTester, LSP8EnumerableTester__factory } from '../../../types';

import { shouldInitializeLikeLSP8 } from '../LSP8IdentifiableDigitalAsset.behaviour';
import {
  shouldBehaveLikeLSP8Enumerable,
  LSP8EnumerableTestContext,
  getNamedAccounts,
} from '../LSP8Enumerable.behaviour';
import { LSP4_TOKEN_TYPES, LSP8_TOKEN_ID_TYPES } from '../../../constants';

describe('LSP8Enumerable with constructor', () => {
  const buildTestContext = async () => {
    const accounts = await getNamedAccounts();

    const deployParams = {
      name: 'LSP8 Enumerable - deployed with constructor',
      symbol: 'LSP8 NMRBL',
      newOwner: accounts.owner.address,
      lsp4TokenType: LSP4_TOKEN_TYPES.NFT,
      lsp8TokenIdType: LSP8_TOKEN_ID_TYPES.NUMBER,
    };

    const lsp8Enumerable: LSP8EnumerableTester = await new LSP8EnumerableTester__factory(
      accounts.owner,
    ).deploy(
      deployParams.name,
      deployParams.symbol,
      deployParams.newOwner,
      deployParams.lsp4TokenType,
      deployParams.lsp8TokenIdType,
    );

    return { accounts, lsp8Enumerable, deployParams };
  };

  describe('when deploying the contract', () => {
    let context: LSP8EnumerableTestContext;

    before(async () => {
      context = await buildTestContext();
    });

    shouldInitializeLikeLSP8(async () => {
      const { lsp8Enumerable: lsp8, deployParams } = context;
      return {
        lsp8,
        deployParams,
        initializeTransaction: context.lsp8Enumerable.deployTransaction,
      };
    });
  });

  describe('when testing deployed contract', () => {
    shouldBehaveLikeLSP8Enumerable(buildTestContext);
  });
});
