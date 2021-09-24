import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { BigNumberish, BytesLike } from "ethers";
import {
  LSP8CompatibilityForERC721Tester,
  LSP8CompatibilityForERC721Tester__factory,
  TokenReceiverWithLSP1,
  TokenReceiverWithLSP1__factory,
  TokenReceiverWithoutLSP1,
  TokenReceiverWithoutLSP1__factory,
} from "../build/types";

export const tokenIdAsBytes32 = (tokenId: BigNumberish): BytesLike => {
  return ethers.utils.hexZeroPad(ethers.BigNumber.from(tokenId).toHexString(), 32);
};

describe("LSP8CompatibilityForERC721", () => {
  type TestAccounts = {
    owner: SignerWithAddress;
    tokenReceiver: SignerWithAddress;
    operator: SignerWithAddress;
    anotherOperator: SignerWithAddress;
    anyone: SignerWithAddress;
  };
  let accounts: TestAccounts;

  let lsp8CompatibilityForERC721: LSP8CompatibilityForERC721Tester;
  const deployParams = {
    name: "Compat for ERC721",
    symbol: "NFT",
  };
  const mintedTokenId = 10;
  const neverMintedTokenId = 1010110;

  beforeEach(async () => {
    const [owner, tokenReceiver, operator, anotherOperator, anyone] = await ethers.getSigners();
    accounts = { owner, tokenReceiver, operator, anotherOperator, anyone };

    lsp8CompatibilityForERC721 = await new LSP8CompatibilityForERC721Tester__factory(owner).deploy(
      deployParams.name,
      deployParams.symbol
    );

    await lsp8CompatibilityForERC721.mint(owner.address, mintedTokenId);
  });

  describe("ownerOf", () => {
    describe("when tokenId has not been minted", () => {
      it("should revert", async () => {
        await expect(lsp8CompatibilityForERC721.ownerOf(neverMintedTokenId)).toBeRevertedWith(
          "LSP8: tokenOwner query for nonexistent token"
        );
      });
    });

    describe("when tokenId has been minted", () => {
      it("should return owner address", async () => {
        expect(await lsp8CompatibilityForERC721.ownerOf(mintedTokenId)).toEqual(
          accounts.owner.address
        );
      });
    });
  });

  describe("approve", () => {
    describe("when caller is not owner of tokenId", () => {
      it("should revert", async () => {
        await expect(
          lsp8CompatibilityForERC721
            .connect(accounts.anyone)
            .approve(accounts.operator.address, mintedTokenId)
        ).toBeRevertedWith("LSP8: authorize caller not token owner");
      });
    });

    describe("when caller is owner of tokenId", () => {
      it("should succeed", async () => {
        const operator = accounts.operator.address;
        const tokenId = mintedTokenId;

        const tx = await lsp8CompatibilityForERC721.approve(operator, tokenId);

        expect(tx).toHaveEmittedWith(lsp8CompatibilityForERC721, "AuthorizedOperator", [
          operator,
          accounts.owner.address,
          tokenIdAsBytes32(tokenId),
        ]);
      });
    });
  });

  describe("getApproved", () => {
    describe("when tokenId has not been minted", () => {
      it("should revert", async () => {
        await expect(lsp8CompatibilityForERC721.getApproved(neverMintedTokenId)).toBeRevertedWith(
          "LSP8: operator query for nonexistent token"
        );
      });
    });

    describe("when tokenId has been minted", () => {
      describe("when there have been no approvals for the tokenId", () => {
        it("should return address(0)", async () => {
          expect(await lsp8CompatibilityForERC721.getApproved(mintedTokenId)).toEqual(
            ethers.constants.AddressZero
          );
        });
      });

      describe("when one account has been approved for the tokenId", () => {
        it("should return the operator address", async () => {
          await lsp8CompatibilityForERC721.approve(
            accounts.operator.address,
            tokenIdAsBytes32(mintedTokenId)
          );

          expect(await lsp8CompatibilityForERC721.getApproved(mintedTokenId)).toEqual(
            accounts.operator.address
          );
        });
      });

      describe("when many accounts have been approved for the tokenId", () => {
        it("should return the last new authorized operator", async () => {
          // We approve the same account in the first and third approve call, with a different
          // account in the second call as the last "new" approval.
          // This is to highlight its not 100% the same behavior as ERC721 since that implementation
          // has one active approval at a time, and LSP8 has a list of authorized operator addresses
          const operatorFirstAndThirdCall = accounts.operator.address;
          const operatorSecondCall = accounts.anotherOperator.address;

          await lsp8CompatibilityForERC721.approve(
            operatorFirstAndThirdCall,
            tokenIdAsBytes32(mintedTokenId)
          );
          await lsp8CompatibilityForERC721.approve(
            operatorSecondCall,
            tokenIdAsBytes32(mintedTokenId)
          );
          await lsp8CompatibilityForERC721.approve(
            operatorFirstAndThirdCall,
            tokenIdAsBytes32(mintedTokenId)
          );

          expect(await lsp8CompatibilityForERC721.getApproved(mintedTokenId)).toEqual(
            accounts.anotherOperator.address
          );
        });
      });
    });
  });

  describe("transfers", () => {
    type TestDeployedContracts = {
      tokenReceiverWithLSP1: TokenReceiverWithLSP1;
      tokenReceiverWithoutLSP1: TokenReceiverWithoutLSP1;
    };
    let deployedContracts: TestDeployedContracts;

    beforeAll(async () => {
      deployedContracts = {
        tokenReceiverWithLSP1: await new TokenReceiverWithLSP1__factory(accounts.owner).deploy(),
        tokenReceiverWithoutLSP1: await new TokenReceiverWithoutLSP1__factory(
          accounts.owner
        ).deploy(),
      };
    });

    beforeEach(async () => {
      // setup so we can observe approvals being cleared during transfer tests
      await lsp8CompatibilityForERC721.approve(accounts.operator.address, mintedTokenId);
    });

    const transferSuccessScenario = async (
      {
        operator,
        from,
        to,
        tokenId,
      }: { operator: string; from: string; to: string; tokenId: number },
      transferFn: string,
      expectedData: string
    ) => {
      // pre-conditions
      const preOwnerOf = await lsp8CompatibilityForERC721.ownerOf(tokenId);
      expect(preOwnerOf).toEqual(from);

      // effect
      const tx = await lsp8CompatibilityForERC721[transferFn](from, to, tokenId);
      expect(tx).toHaveEmittedWith(lsp8CompatibilityForERC721, "Transfer", [
        operator,
        from,
        to,
        tokenIdAsBytes32(tokenId),
        expectedData,
      ]);
      expect(tx).toHaveEmittedWith(lsp8CompatibilityForERC721, "RevokedOperator", [
        accounts.operator.address,
        from,
        tokenIdAsBytes32(tokenId),
      ]);

      // post-conditions
      const postOwnerOf = await lsp8CompatibilityForERC721.ownerOf(tokenId);
      expect(postOwnerOf).toEqual(to);
    };

    const transferFailScenario = async (
      {
        operator,
        from,
        to,
        tokenId,
      }: { operator: string; from: string; to: string; tokenId: number },
      transferFn: string,
      expectedError: string
    ) => {
      // pre-conditions
      const preOwnerOf = await lsp8CompatibilityForERC721.ownerOf(tokenId);
      expect(preOwnerOf).toEqual(from);

      // effect
      await expect(lsp8CompatibilityForERC721[transferFn](from, to, tokenId)).toBeRevertedWith(
        expectedError
      );

      // post-conditions
      const postOwnerOf = await lsp8CompatibilityForERC721.ownerOf(tokenId);
      expect(preOwnerOf).toEqual(preOwnerOf);
    };

    describe("transferFrom", () => {
      const transferFn = "transferFrom";
      const expectedData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("compat-transferFrom"));

      describe("when `to` is an EOA", () => {
        it("should allow transfering the tokenId", async () => {
          const txParams = {
            operator: accounts.owner.address,
            from: accounts.owner.address,
            to: accounts.tokenReceiver.address,
            tokenId: mintedTokenId,
          };

          await transferSuccessScenario(txParams, transferFn, expectedData);
        });
      });

      describe("when `to` is a contract", () => {
        describe("when receiving contract supports LSP1", () => {
          it("should allow transfering the tokenId", async () => {
            const txParams = {
              operator: accounts.owner.address,
              from: accounts.owner.address,
              to: deployedContracts.tokenReceiverWithLSP1.address,
              tokenId: mintedTokenId,
            };

            await transferSuccessScenario(txParams, transferFn, expectedData);
          });
        });

        describe("when receiving contract does not support LSP1", () => {
          it("should allow transfering the tokenId", async () => {
            const txParams = {
              operator: accounts.owner.address,
              from: accounts.owner.address,
              to: deployedContracts.tokenReceiverWithoutLSP1.address,
              tokenId: mintedTokenId,
            };

            await transferSuccessScenario(txParams, transferFn, expectedData);
          });
        });
      });
    });

    describe("safeTransferFrom", () => {
      const transferFn = "safeTransferFrom";
      const expectedData = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes("compat-safeTransferFrom")
      );

      describe("when `to` is an EOA", () => {
        it("should not allow transfering the tokenId", async () => {
          const txParams = {
            operator: accounts.owner.address,
            from: accounts.owner.address,
            to: accounts.tokenReceiver.address,
            tokenId: mintedTokenId,
          };
          const expectedError = "LSP8: token receiver is EOA";

          await transferFailScenario(txParams, transferFn, expectedError);
        });
      });

      describe("when `to` is a contract", () => {
        describe("when receiving contract supports LSP1", () => {
          it("should allow transfering the tokenId", async () => {
            const txParams = {
              operator: accounts.owner.address,
              from: accounts.owner.address,
              to: deployedContracts.tokenReceiverWithLSP1.address,
              tokenId: mintedTokenId,
            };

            await transferSuccessScenario(txParams, transferFn, expectedData);
          });
        });

        describe("when receiving contract does not support LSP1", () => {
          it("should not allow transfering the tokenId", async () => {
            const txParams = {
              operator: accounts.owner.address,
              from: accounts.owner.address,
              to: deployedContracts.tokenReceiverWithoutLSP1.address,
              tokenId: mintedTokenId,
            };
            const expectedError = "LSP8: token receiver contract missing LSP1 interface";

            await transferFailScenario(txParams, transferFn, expectedError);
          });
        });
      });
    });
  });
});
