import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { LSP8CappedSupplyTester, LSP8CappedSupplyTester__factory } from "../build/types";

describe("LSP8CappedSupply", () => {
  type TestAccounts = {
    owner: SignerWithAddress;
    tokenReceiver: SignerWithAddress;
  };
  let accounts: TestAccounts;

  let lsp8CappedSupply: LSP8CappedSupplyTester;
  const deployParams = {
    name: "capped supply",
    symbol: "CAP",
    tokenSupplyCap: ethers.BigNumber.from("2"),
  };

  beforeAll(async () => {
    const [owner, tokenReceiver] = await ethers.getSigners();
    accounts = { owner, tokenReceiver };

    lsp8CappedSupply = await new LSP8CappedSupplyTester__factory(owner).deploy(
      deployParams.name,
      deployParams.symbol,
      deployParams.tokenSupplyCap
    );
  });

  it("should allow reading tokenSupplyCap", async () => {
    const tokenSupplyCap = await lsp8CappedSupply.tokenSupplyCap();
    expect(tokenSupplyCap).toEqual(deployParams.tokenSupplyCap);
  });

  it("should allow reading mintableSupply", async () => {
    const mintableSupply = await lsp8CappedSupply.mintableSupply();
    expect(mintableSupply).toEqual(deployParams.tokenSupplyCap);
  });

  describe("when minting tokens", () => {
    const mintedTokenIds = Array(deployParams.tokenSupplyCap.toNumber())
      .fill(null)
      .map((_, i) => ethers.utils.keccak256(i));

    it("should allow minting amount up to tokenSupplyCap", async () => {
      for (let i = 0; i < mintedTokenIds.length; i++) {
        const preMintableSupply = await lsp8CappedSupply.mintableSupply();

        const tokenId = mintedTokenIds[i];
        await lsp8CappedSupply.mint(accounts.tokenReceiver.address, tokenId);

        const postMintableSupply = await lsp8CappedSupply.mintableSupply();
        expect(postMintableSupply).toEqual(preMintableSupply.sub(1));
      }
    });

    describe("when cap has been reached", () => {
      const anotherTokenId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VIP token"));

      it("should error when minting more than tokenSupplyCapTokens", async () => {
        const preMintableSupply = await lsp8CappedSupply.mintableSupply();
        expect(preMintableSupply.toString()).toEqual("0");

        await expect(
          lsp8CappedSupply.mint(accounts.tokenReceiver.address, anotherTokenId)
        ).toBeRevertedWith("LSP8CappedSupply: mintableSupply is zero");
      });

      it("should allow minting after burning", async () => {
        const preBurnMintableSupply = await lsp8CappedSupply.mintableSupply();
        expect(preBurnMintableSupply.toString()).toEqual("0");

        await lsp8CappedSupply.burn(mintedTokenIds[0]);

        const postBurnMintableSupply = await lsp8CappedSupply.mintableSupply();
        expect(postBurnMintableSupply).toEqual(preBurnMintableSupply.add(1));

        await lsp8CappedSupply.mint(accounts.tokenReceiver.address, anotherTokenId);

        const postMintMintableSupply = await lsp8CappedSupply.mintableSupply();
        expect(postMintMintableSupply).toEqual(postBurnMintableSupply.sub(1));
      });
    });
  });
});
