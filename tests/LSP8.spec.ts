import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { BigNumberish, BytesLike } from "ethers";
import {
  LSP8Tester,
  LSP8Tester__factory,
  TokenReceiverWithLSP1,
  TokenReceiverWithLSP1__factory,
  TokenReceiverWithoutLSP1,
  TokenReceiverWithoutLSP1__factory,
} from "../build/types";
import { waffleJest } from "@ethereum-waffle/jest";

expect.extend(waffleJest);

export const tokenIdAsBytes32 = (tokenId: BigNumberish): BytesLike => {
  return ethers.utils.hexZeroPad(ethers.BigNumber.from(tokenId).toHexString(), 32);
};

describe("LSP8", () => {
  type TestAccounts = {
    owner: SignerWithAddress;
    tokenReceiver: SignerWithAddress;
    operator: SignerWithAddress;
    anotherOperator: SignerWithAddress;
    anyone: SignerWithAddress;
  };
  let accounts: TestAccounts;

  let lsp8: LSP8Tester;
  const deployParams = {
    name: "LSP8",
    symbol: "NFT",
  };
  const mintedTokenId = tokenIdAsBytes32(10);
  const neverMintedTokenId = tokenIdAsBytes32(1010110);

  beforeEach(async () => {
    const [owner, tokenReceiver, operator, anotherOperator, anyone] = await ethers.getSigners();
    accounts = { owner, tokenReceiver, operator, anotherOperator, anyone };

    lsp8 = await new LSP8Tester__factory(owner).deploy(deployParams.name, deployParams.symbol);

    await lsp8.mint(
      owner.address,
      mintedTokenId,
      true,
      ethers.utils.toUtf8Bytes("mint a token for the owner")
    );
  });

  describe("when deployed", () => {
    it("should have set name and symbol with ERC725Y.setData", async () => {
      const nameKey = "0xdeba1e292f8ba88238e10ab3c7f88bd4be4fac56cad5194b6ecceaf653468af1";
      const symbolKey = "0x2f0a68ab07768e01943a599e73362a0e17a63a72e94dd2e384d2c1d4db932756";

      await expect(lsp8.deployTransaction).toHaveEmittedWith(lsp8, "DataChanged", [
        nameKey,
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(deployParams.name)),
      ]);
      await expect(lsp8.deployTransaction).toHaveEmittedWith(lsp8, "DataChanged", [
        symbolKey,
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(deployParams.symbol)),
      ]);
    });
  });

  describe("totalSupply", () => {
    it("should return total token supply", async () => {
      expect(await lsp8.totalSupply()).toEqual(ethers.BigNumber.from("1"));
    });
  });

  describe("balanceOf", () => {
    describe("when the given address owns tokens", () => {
      it("should return the owned token count", async () => {
        expect(await lsp8.balanceOf(accounts.owner.address)).toEqual(ethers.BigNumber.from("1"));
      });
    });

    describe("when the given address does not own tokens", () => {
      it("should return zero", async () => {
        expect(await lsp8.balanceOf(accounts.anyone.address)).toEqual(ethers.BigNumber.from("0"));
      });
    });

    describe("when the given address is the zero address", () => {
      it("should revert", async () => {
        await expect(lsp8.balanceOf(ethers.constants.AddressZero)).toBeRevertedWith(
          "LSP8: balance query for the zero address"
        );
      });
    });
  });

  describe("tokenOwnerOf", () => {
    describe("when tokenId has not been minted", () => {
      it("should revert", async () => {
        await expect(lsp8.tokenOwnerOf(neverMintedTokenId)).toBeRevertedWith(
          "LSP8: tokenOwner query for nonexistent token"
        );
      });
    });

    describe("when tokenId has been minted", () => {
      it("should return owner address", async () => {
        expect(await lsp8.tokenOwnerOf(mintedTokenId)).toEqual(accounts.owner.address);
      });
    });
  });

  describe("tokenIdsOf", () => {
    describe("when the given address owns some tokens", () => {
      it("should return the list of owned tokenIds", async () => {
        expect(await lsp8.tokenIdsOf(accounts.owner.address)).toEqual([mintedTokenId]);
      });
    });

    describe("when the given address does not owns some tokens", () => {
      it("should empty list", async () => {
        expect(await lsp8.tokenIdsOf(accounts.anyone.address)).toEqual([]);
      });
    });

    describe("when the given address is the zero address", () => {
      it("should revert", async () => {
        await expect(lsp8.tokenIdsOf(ethers.constants.AddressZero)).toBeRevertedWith(
          "LSP8: tokenIdsOf query for the zero address"
        );
      });
    });
  });

  describe("authorizeOperator", () => {
    describe("when tokenId does not exist", () => {
      it("should revert", async () => {
        await expect(
          lsp8.authorizeOperator(accounts.operator.address, neverMintedTokenId)
        ).toBeRevertedWith("LSP8: tokenOwner query for nonexistent token");
      });
    });

    describe("when caller is not owner of tokenId", () => {
      it("should revert", async () => {
        await expect(
          lsp8.connect(accounts.anyone).authorizeOperator(accounts.operator.address, mintedTokenId)
        ).toBeRevertedWith("LSP8: authorize caller not token owner");
      });
    });

    describe("when caller is owner of tokenId", () => {
      describe("when given operator is the tokenOwner", () => {
        it("should revert", async () => {
          await expect(
            lsp8.authorizeOperator(accounts.owner.address, mintedTokenId)
          ).toBeRevertedWith("LSP8: authorizing self as operator");
        });
      });

      describe("when given operator is different than tokenOwner", () => {
        describe("when operator is already authorized", () => {
          beforeEach(async () => {
            await lsp8.authorizeOperator(accounts.operator.address, mintedTokenId);
          });

          it("should succeed", async () => {});
        });
        it("should succeed", async () => {
          const operator = accounts.operator.address;
          const tokenOwner = accounts.owner.address;
          const tokenId = mintedTokenId;

          const tx = await lsp8.authorizeOperator(operator, tokenId);

          await expect(tx).toHaveEmittedWith(lsp8, "AuthorizedOperator", [
            operator,
            tokenOwner,
            tokenId,
          ]);

          expect(await lsp8.isOperatorFor(operator, tokenId)).toEqual(true);
        });
      });
    });
  });

  describe("revokeOperator", () => {
    describe("when tokenId does not exist", () => {
      it("should revert", async () => {
        await expect(
          lsp8.revokeOperator(accounts.operator.address, neverMintedTokenId)
        ).toBeRevertedWith("LSP8: tokenOwner query for nonexistent token");
      });
    });

    describe("when caller is not owner of tokenId", () => {
      it("should revert", async () => {
        await expect(
          lsp8.connect(accounts.anyone).revokeOperator(accounts.operator.address, mintedTokenId)
        ).toBeRevertedWith("LSP8: revoke caller not token owner");
      });
    });

    describe("when caller is owner of tokenId", () => {
      describe("when given operator is the tokenOwner", () => {
        it("should revert", async () => {
          await expect(lsp8.revokeOperator(accounts.owner.address, mintedTokenId)).toBeRevertedWith(
            "LSP8: revoking self as operator"
          );
        });
      });

      describe("when given operator is different than tokenOwner", () => {
        it("should succeed", async () => {
          const operator = accounts.operator.address;
          const tokenOwner = accounts.owner.address;
          const tokenId = mintedTokenId;

          // pre-conditions
          await lsp8.authorizeOperator(operator, tokenId);
          expect(await lsp8.isOperatorFor(operator, tokenId)).toEqual(true);

          // effects
          const tx = await lsp8.revokeOperator(operator, tokenId);
          await expect(tx).toHaveEmittedWith(lsp8, "RevokedOperator", [
            operator,
            tokenOwner,
            tokenId,
          ]);

          // post-conditions
          expect(await lsp8.isOperatorFor(operator, tokenId)).toEqual(false);
        });
      });
    });
  });

  describe("isOperatorFor", () => {
    describe("when tokenId has not been minted", () => {
      it("should revert", async () => {
        await expect(
          lsp8.isOperatorFor(accounts.operator.address, neverMintedTokenId)
        ).toBeRevertedWith("LSP8: operator query for nonexistent token");
      });
    });

    describe("when tokenId has been minted", () => {
      describe("when operator has not been authorized", () => {
        it("should return false", async () => {
          expect(await lsp8.isOperatorFor(accounts.operator.address, mintedTokenId)).toEqual(false);
        });
      });

      describe("when one account have been authorized for the tokenId", () => {
        it("should return true", async () => {
          await lsp8.authorizeOperator(accounts.operator.address, mintedTokenId);

          expect(await lsp8.isOperatorFor(accounts.operator.address, mintedTokenId)).toEqual(true);
        });
      });

      describe("when many accounts have been approved for the tokenId", () => {
        it("should return true for all operators", async () => {
          await lsp8.authorizeOperator(accounts.operator.address, mintedTokenId);
          await lsp8.authorizeOperator(accounts.anotherOperator.address, mintedTokenId);

          expect(await lsp8.isOperatorFor(accounts.operator.address, mintedTokenId)).toEqual(true);
          expect(await lsp8.isOperatorFor(accounts.anotherOperator.address, mintedTokenId)).toEqual(
            true
          );
        });
      });
    });
  });

  describe("getOperatorsOf", () => {
    describe("when tokenId has not been minted", () => {
      it("should revert", async () => {
        await expect(lsp8.getOperatorsOf(neverMintedTokenId)).toBeRevertedWith(
          "LSP8: operator query for nonexistent token"
        );
      });
    });

    describe("when tokenId has been minted", () => {
      describe("when operator has not been authorized", () => {
        it("should return empty list", async () => {
          expect(await lsp8.getOperatorsOf(mintedTokenId)).toEqual([]);
        });
      });

      describe("when one account have been authorized for the tokenId", () => {
        it("should return list", async () => {
          await lsp8.authorizeOperator(accounts.operator.address, mintedTokenId);

          expect(await lsp8.getOperatorsOf(mintedTokenId)).toEqual([accounts.operator.address]);
        });
      });

      describe("when many accounts have been approved for the tokenId", () => {
        it("should return list", async () => {
          await lsp8.authorizeOperator(accounts.operator.address, mintedTokenId);
          await lsp8.authorizeOperator(accounts.anotherOperator.address, mintedTokenId);

          expect(await lsp8.getOperatorsOf(mintedTokenId)).toEqual([
            accounts.operator.address,
            accounts.anotherOperator.address,
          ]);
        });
      });
    });
  });

  describe("transfers", () => {
    type HelperContracts = {
      tokenReceiverWithLSP1: TokenReceiverWithLSP1;
      tokenReceiverWithoutLSP1: TokenReceiverWithoutLSP1;
    };
    let helperContracts: HelperContracts;

    beforeAll(async () => {
      helperContracts = {
        tokenReceiverWithLSP1: await new TokenReceiverWithLSP1__factory(accounts.owner).deploy(),
        tokenReceiverWithoutLSP1: await new TokenReceiverWithoutLSP1__factory(
          accounts.owner
        ).deploy(),
      };
    });

    beforeEach(async () => {
      // setup so we can observe operators being cleared during transfer tests
      await lsp8.authorizeOperator(accounts.operator.address, mintedTokenId);
      await lsp8.authorizeOperator(accounts.anotherOperator.address, mintedTokenId);
    });

    describe("transfer", () => {
      const transferSuccessScenario = async (
        {
          from,
          to,
          tokenId,
          force,
          data,
        }: {
          from: string;
          to: string;
          tokenId: BytesLike;
          force: boolean;
          data: string;
        },
        operator: SignerWithAddress
      ) => {
        // pre-conditions
        const preTokenOwnerOf = await lsp8.tokenOwnerOf(tokenId);
        expect(preTokenOwnerOf).toEqual(from);

        const preOperatorsOf = await lsp8.getOperatorsOf(tokenId);
        expect(preOperatorsOf).toEqual([
          accounts.operator.address,
          accounts.anotherOperator.address,
        ]);

        const preFromTokenIdsOf = await lsp8.tokenIdsOf(from);
        expect(preFromTokenIdsOf.includes(tokenId)).toEqual(true);

        const preToTokenIdsOf = await lsp8.tokenIdsOf(to);
        expect(preToTokenIdsOf.includes(tokenId)).toEqual(false);

        const preFromBalanceOf = await lsp8.balanceOf(from);
        const preToBalanceOf = await lsp8.balanceOf(to);

        // effect
        const tx = await lsp8.connect(operator).transfer(from, to, tokenId, force, data);
        await expect(tx).toHaveEmittedWith(lsp8, "Transfer", [
          operator.address,
          from,
          to,
          tokenId,
          data,
        ]);
        await expect(tx).toHaveEmittedWith(lsp8, "RevokedOperator", [
          accounts.operator.address,
          from,
          tokenId,
        ]);
        await expect(tx).toHaveEmittedWith(lsp8, "RevokedOperator", [
          accounts.anotherOperator.address,
          from,
          tokenId,
        ]);

        // post-conditions
        const postTokenOwnerOf = await lsp8.tokenOwnerOf(tokenId);
        expect(postTokenOwnerOf).toEqual(to);

        const postOperatorsOf = await lsp8.getOperatorsOf(tokenId);
        expect(postOperatorsOf).toEqual([]);

        const postFromTokenIdsOf = await lsp8.tokenIdsOf(from);
        expect(postFromTokenIdsOf.includes(tokenId)).toEqual(false);

        const postToTokenIdsOf = await lsp8.tokenIdsOf(to);
        expect(postToTokenIdsOf.includes(tokenId)).toEqual(true);

        const postFromBalanceOf = await lsp8.balanceOf(from);
        expect(postFromBalanceOf).toEqual(preFromBalanceOf.sub(1));

        const postToBalanceOf = await lsp8.balanceOf(to);
        expect(postToBalanceOf).toEqual(preToBalanceOf.add(1));

        return tx;
      };

      const transferFailScenario = async (
        {
          from,
          to,
          tokenId,
          force,
          data,
        }: {
          from: string;
          to: string;
          tokenId: BytesLike;
          force: boolean;
          data: string;
        },
        operator: SignerWithAddress,
        expectedError: string
      ) => {
        // pre-conditions
        const preTokenOwnerOf = await lsp8.tokenOwnerOf(tokenId);
        expect(preTokenOwnerOf).toEqual(from);

        // effect
        await expect(
          lsp8.connect(operator).transfer(from, to, tokenId, force, data)
        ).toBeRevertedWith(expectedError);
      };

      const sendingTransferTransactions = (getOperator: () => SignerWithAddress) => {
        let operator: SignerWithAddress;
        beforeAll(() => {
          // passed as a thunk since other before hooks setup accounts map
          operator = getOperator();
        });

        describe("when using force=true", () => {
          const force = true;
          const data = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes("doing a transfer with force")
          );

          describe("when `to` is an EOA", () => {
            it("should allow transfering the tokenId", async () => {
              const txParams = {
                from: accounts.owner.address,
                to: accounts.tokenReceiver.address,
                tokenId: mintedTokenId,
                force,
                data,
              };

              await transferSuccessScenario(txParams, operator);
            });
          });

          describe("when `to` is a contract", () => {
            describe("when receiving contract supports LSP1", () => {
              it("should allow transfering the tokenId", async () => {
                const txParams = {
                  operator: accounts.owner.address,
                  from: accounts.owner.address,
                  to: helperContracts.tokenReceiverWithLSP1.address,
                  tokenId: mintedTokenId,
                  force,
                  data,
                };

                const tx = await transferSuccessScenario(txParams, operator);

                const typeId = "0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b";
                const packedData = ethers.utils.solidityPack(
                  ["address", "address", "bytes32", "bytes"],
                  [txParams.from, txParams.to, txParams.tokenId, txParams.data]
                );

                await expect(tx).toHaveEmittedWith(
                  helperContracts.tokenReceiverWithLSP1,
                  "UniversalReceiverCalled",
                  [typeId, packedData]
                );
              });
            });

            describe("when receiving contract does not support LSP1", () => {
              it("should allow transfering the tokenId", async () => {
                const txParams = {
                  operator: accounts.owner.address,
                  from: accounts.owner.address,
                  to: helperContracts.tokenReceiverWithoutLSP1.address,
                  tokenId: mintedTokenId,
                  force,
                  data,
                };

                await transferSuccessScenario(txParams, operator);
              });
            });
          });
        });

        describe("when force=false", () => {
          const force = false;
          const data = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes("doing a transfer without force")
          );

          describe("when `to` is an EOA", () => {
            it("should not allow transfering the tokenId", async () => {
              const txParams = {
                from: accounts.owner.address,
                to: accounts.tokenReceiver.address,
                tokenId: mintedTokenId,
                force,
                data,
              };
              const expectedError = "LSP8: token receiver is EOA";

              await transferFailScenario(txParams, operator, expectedError);
            });
          });

          describe("when `to` is a contract", () => {
            describe("when receiving contract supports LSP1", () => {
              it("should allow transfering the tokenId", async () => {
                const txParams = {
                  operator: accounts.owner.address,
                  from: accounts.owner.address,
                  to: helperContracts.tokenReceiverWithLSP1.address,
                  tokenId: mintedTokenId,
                  force,
                  data,
                };

                const tx = await transferSuccessScenario(txParams, operator);

                const typeId = "0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b";
                const packedData = ethers.utils.solidityPack(
                  ["address", "address", "bytes32", "bytes"],
                  [txParams.from, txParams.to, txParams.tokenId, txParams.data]
                );

                await expect(tx).toHaveEmittedWith(
                  helperContracts.tokenReceiverWithLSP1,
                  "UniversalReceiverCalled",
                  [typeId, packedData]
                );
              });
            });

            describe("when receiving contract does not support LSP1", () => {
              it("should not allow transfering the tokenId", async () => {
                const txParams = {
                  operator: accounts.owner.address,
                  from: accounts.owner.address,
                  to: helperContracts.tokenReceiverWithoutLSP1.address,
                  tokenId: mintedTokenId,
                  force,
                  data,
                };
                const expectedError = "LSP8: token receiver contract missing LSP1 interface";

                await transferFailScenario(txParams, operator, expectedError);
              });
            });
          });
        });
      };

      describe("when tokenOwner sends tx", () => {
        sendingTransferTransactions(() => accounts.owner);
      });

      describe("when operator sends tx", () => {
        sendingTransferTransactions(() => accounts.operator);
      });

      describe("when the from address is incorrect", () => {
        it("should revert", async () => {
          await expect(
            lsp8.transfer(
              accounts.anyone.address,
              accounts.tokenReceiver.address,
              mintedTokenId,
              true,
              ethers.utils.hexlify(ethers.utils.toUtf8Bytes("should revert"))
            )
          ).toBeRevertedWith("LSP8: transfer of tokenId from incorrect owner");
        });
      });

      describe("when the caller is not an operator", () => {
        it("should revert", async () => {
          await expect(
            lsp8
              .connect(accounts.anyone)
              .transfer(
                accounts.anyone.address,
                accounts.tokenReceiver.address,
                mintedTokenId,
                true,
                ethers.utils.hexlify(ethers.utils.toUtf8Bytes("should revert"))
              )
          ).toBeRevertedWith("LSP8: transfer caller is not owner or operator of tokenId");
        });
      });

      describe("when the given tokenId has not been minted", () => {
        it("should revert", async () => {
          await expect(
            lsp8.transfer(
              accounts.anyone.address,
              accounts.tokenReceiver.address,
              neverMintedTokenId,
              true,
              ethers.utils.hexlify(ethers.utils.toUtf8Bytes("should revert"))
            )
          ).toBeRevertedWith("LSP8: tokenOwner query for nonexistent token");
        });
      });

      describe("when the to address is the zero address", () => {
        it("should revert", async () => {
          await expect(
            lsp8.transfer(
              accounts.owner.address,
              ethers.constants.AddressZero,
              mintedTokenId,
              true,
              ethers.utils.hexlify(ethers.utils.toUtf8Bytes("should revert"))
            )
          ).toBeRevertedWith("LSP8: transfer to the zero address");
        });
      });
    });

    describe("transferBatch", () => {
      const anotherMintedTokenId = tokenIdAsBytes32("5555");

      beforeEach(async () => {
        // setup so we can observe operators being cleared during transferBatch tests
        await lsp8.authorizeOperator(accounts.operator.address, mintedTokenId);
        await lsp8.authorizeOperator(accounts.anotherOperator.address, mintedTokenId);

        // setup so we can transfer multiple tokenIds during transferBatch test
        await lsp8.mint(
          accounts.owner.address,
          anotherMintedTokenId,
          true,
          ethers.utils.toUtf8Bytes("mint another token for the owner")
        );

        // setup so we can observe operators being cleared during transferBatch tests
        await lsp8.authorizeOperator(accounts.operator.address, anotherMintedTokenId);
        await lsp8.authorizeOperator(accounts.anotherOperator.address, anotherMintedTokenId);
      });

      const transferBatchSuccessScenario = async (
        {
          from,
          to,
          tokenId,
          force,
          data,
        }: {
          from: string[];
          to: string[];
          tokenId: BytesLike[];
          force: boolean;
          data: string[];
        },
        operator: SignerWithAddress
      ) => {
        // pre-conditions
        await Promise.all(
          tokenId.map((_, index) => async () => {
            const preTokenOwnerOf = await lsp8.tokenOwnerOf(tokenId[index]);
            expect(preTokenOwnerOf).toEqual(from[index]);

            const preOperatorsOf = await lsp8.getOperatorsOf(tokenId);
            expect(preOperatorsOf).toEqual([
              accounts.operator.address,
              accounts.anotherOperator.address,
            ]);
          })
        );

        // effect
        const tx = await lsp8.connect(operator).transferBatch(from, to, tokenId, force, data);

        await Promise.all(
          tokenId.map(async (_, index) => {
            await expect(tx).toHaveEmittedWith(lsp8, "Transfer", [
              operator.address,
              from[index],
              to[index],
              tokenId[index],
              data[index],
            ]);
            await expect(tx).toHaveEmittedWith(lsp8, "RevokedOperator", [
              accounts.operator.address,
              from[index],
              tokenId[index],
            ]);
            await expect(tx).toHaveEmittedWith(lsp8, "RevokedOperator", [
              accounts.anotherOperator.address,
              from[index],
              tokenId[index],
            ]);
          })
        );

        // post-conditions
        await Promise.all(
          tokenId.map((_, index) => async () => {
            const preTokenOwnerOf = await lsp8.tokenOwnerOf(tokenId[index]);
            expect(preTokenOwnerOf).toEqual(to[index]);

            const postOperatorsOf = await lsp8.getOperatorsOf(tokenId[index]);
            expect(postOperatorsOf).toEqual([]);
          })
        );

        return tx;
      };

      const transferBatchFailScenario = async (
        {
          from,
          to,
          tokenId,
          force,
          data,
        }: {
          from: string[];
          to: string[];
          tokenId: BytesLike[];
          force: boolean;
          data: string[];
        },
        operator: SignerWithAddress,
        expectedError: string
      ) => {
        // pre-conditions
        await Promise.all(
          tokenId.map((_, index) => async () => {
            const preTokenOwnerOf = await lsp8.tokenOwnerOf(tokenId[index]);
            expect(preTokenOwnerOf).toEqual(from[index]);
          })
        );

        // effect
        await expect(
          lsp8.connect(operator).transferBatch(from, to, tokenId, force, data)
        ).toBeRevertedWith(expectedError);
      };

      const sendingTransferBatchTransactions = (getOperator: () => SignerWithAddress) => {
        let operator: SignerWithAddress;
        beforeAll(() => {
          // passed as a thunk since other before hooks setup accounts map
          operator = getOperator();
        });

        describe("when using force=true", () => {
          const force = true;
          const data = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes("doing a transfer with force")
          );

          describe("when `to` is an EOA", () => {
            it("should allow transfering the tokenId", async () => {
              const txParams = {
                from: [accounts.owner.address, accounts.owner.address],
                to: [accounts.tokenReceiver.address, accounts.tokenReceiver.address],
                tokenId: [mintedTokenId, anotherMintedTokenId],
                force,
                data: [data, data],
              };

              await transferBatchSuccessScenario(txParams, operator);
            });
          });

          describe("when `to` is a contract", () => {
            describe("when receiving contract supports LSP1", () => {
              it("should allow transfering the tokenId", async () => {
                const txParams = {
                  from: [accounts.owner.address, accounts.owner.address],
                  to: [
                    helperContracts.tokenReceiverWithLSP1.address,
                    helperContracts.tokenReceiverWithLSP1.address,
                  ],
                  tokenId: [mintedTokenId, anotherMintedTokenId],
                  force,
                  data: [data, data],
                };

                const tx = await transferBatchSuccessScenario(txParams, operator);

                await Promise.all(
                  txParams.tokenId.map((_, index) => async () => {
                    const typeId =
                      "0x29ddb589b1fb5fc7cf394961c1adf5f8c6454761adf795e67fe149f658abe895";
                    const packedData = ethers.utils.solidityPack(
                      ["address", "address", "bytes32", "bytes"],
                      [
                        txParams.from[index],
                        txParams.to[index],
                        txParams.tokenId[index],
                        txParams.data[index],
                      ]
                    );

                    await expect(tx).toHaveEmittedWith(
                      helperContracts.tokenReceiverWithLSP1,
                      "UniversalReceiverCalled",
                      [typeId, packedData]
                    );
                  })
                );
              });
            });

            describe("when receiving contract does not support LSP1", () => {
              it("should allow transfering the tokenId", async () => {
                const txParams = {
                  from: [accounts.owner.address, accounts.owner.address],
                  to: [
                    helperContracts.tokenReceiverWithoutLSP1.address,
                    helperContracts.tokenReceiverWithoutLSP1.address,
                  ],
                  tokenId: [mintedTokenId, anotherMintedTokenId],
                  force,
                  data: [data, data],
                };

                await transferBatchSuccessScenario(txParams, operator);
              });
            });
          });
        });

        describe("when force=false", () => {
          const force = false;
          const data = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes("doing a transfer without force")
          );

          describe("when `to` is an EOA", () => {
            it("should not allow transfering the tokenId", async () => {
              const txParams = {
                from: [accounts.owner.address, accounts.owner.address],
                to: [accounts.tokenReceiver.address, accounts.tokenReceiver.address],
                tokenId: [mintedTokenId, anotherMintedTokenId],
                force,
                data: [data, data],
              };
              const expectedError = "LSP8: token receiver is EOA";

              await transferBatchFailScenario(txParams, operator, expectedError);
            });
          });

          describe("when `to` is a contract", () => {
            describe("when receiving contract supports LSP1", () => {
              it("should allow transfering the tokenId", async () => {
                const txParams = {
                  from: [accounts.owner.address, accounts.owner.address],
                  to: [
                    helperContracts.tokenReceiverWithLSP1.address,
                    helperContracts.tokenReceiverWithLSP1.address,
                  ],
                  tokenId: [mintedTokenId, anotherMintedTokenId],
                  force,
                  data: [data, data],
                };

                await transferBatchSuccessScenario(txParams, operator);
              });
            });

            describe("when receiving contract does not support LSP1", () => {
              it("should not allow transfering the tokenId", async () => {
                const txParams = {
                  from: [accounts.owner.address, accounts.owner.address],
                  to: [
                    helperContracts.tokenReceiverWithoutLSP1.address,
                    helperContracts.tokenReceiverWithoutLSP1.address,
                  ],
                  tokenId: [mintedTokenId, anotherMintedTokenId],
                  force,
                  data: [data, data],
                };
                const expectedError = "LSP8: token receiver contract missing LSP1 interface";

                await transferBatchFailScenario(txParams, operator, expectedError);
              });
            });
          });
        });
      };

      describe("when tokenOwner sends tx", () => {
        sendingTransferBatchTransactions(() => accounts.owner);
      });

      describe("when operator sends tx", () => {
        sendingTransferBatchTransactions(() => accounts.operator);
      });

      describe("when the from address is incorrect", () => {
        it("should revert", async () => {
          await expect(
            lsp8.transferBatch(
              [accounts.anyone.address],
              [accounts.tokenReceiver.address],
              [mintedTokenId],
              true,
              [ethers.utils.hexlify(ethers.utils.toUtf8Bytes("should revert"))]
            )
          ).toBeRevertedWith("LSP8: transfer of tokenId from incorrect owner");
        });
      });

      describe("when the caller is not an operator", () => {
        it("should revert", async () => {
          await expect(
            lsp8
              .connect(accounts.anyone)
              .transferBatch(
                [accounts.anyone.address],
                [accounts.tokenReceiver.address],
                [mintedTokenId],
                true,
                [ethers.utils.hexlify(ethers.utils.toUtf8Bytes("should revert"))]
              )
          ).toBeRevertedWith("LSP8: transfer caller is not owner or operator of tokenId");
        });
      });

      describe("when the given tokenId has not been minted", () => {
        it("should revert", async () => {
          await expect(
            lsp8.transferBatch(
              [accounts.anyone.address],
              [accounts.tokenReceiver.address],
              [neverMintedTokenId],
              true,
              [ethers.utils.hexlify(ethers.utils.toUtf8Bytes("should revert"))]
            )
          ).toBeRevertedWith("LSP8: tokenOwner query for nonexistent token");
        });
      });

      describe("when the to address is the zero address", () => {
        it("should revert", async () => {
          await expect(
            lsp8.transferBatch(
              [accounts.owner.address],
              [ethers.constants.AddressZero],
              [mintedTokenId],
              true,
              [ethers.utils.hexlify(ethers.utils.toUtf8Bytes("should revert"))]
            )
          ).toBeRevertedWith("LSP8: transfer to the zero address");
        });
      });

      describe("when function parameters list length does not match", () => {
        it("should revert", async () => {
          const operator = accounts.owner;
          const validTxParams = {
            from: [accounts.owner.address, accounts.owner.address],
            to: [accounts.tokenReceiver.address, accounts.tokenReceiver.address],
            tokenId: [mintedTokenId, anotherMintedTokenId],
            force: true,
            data: [
              ethers.utils.toUtf8Bytes("gonna revert"),
              ethers.utils.toUtf8Bytes("gonna revert"),
            ],
          };

          await transferBatchFailScenario(
            { ...validTxParams, from: [accounts.owner.address] },
            operator,
            "LSP8: transferBatch list length mismatch"
          );

          await transferBatchFailScenario(
            { ...validTxParams, to: [accounts.tokenReceiver.address] },
            operator,
            "LSP8: transferBatch list length mismatch"
          );

          await transferBatchFailScenario(
            { ...validTxParams, tokenId: [mintedTokenId] },
            operator,
            "LSP8: transferBatch list length mismatch"
          );

          await transferBatchFailScenario(
            { ...validTxParams, data: [ethers.utils.toUtf8Bytes("gonna revert")] },
            operator,
            "LSP8: transferBatch list length mismatch"
          );
        });
      });
    });
  });
});
