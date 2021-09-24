import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { LSP4CompatibilityTester, LSP4CompatibilityTester__factory } from "../build/types";

describe("LSP4Compatibility", () => {
  type TestAccounts = {
    owner: SignerWithAddress;
  };
  let accounts: TestAccounts;

  let lsp4Compatibility: LSP4CompatibilityTester;
  const deployParams = {
    name: "Much compat",
    symbol: "WOW",
  };

  beforeAll(async () => {
    const [owner] = await ethers.getSigners();
    accounts = { owner };

    lsp4Compatibility = await new LSP4CompatibilityTester__factory(owner).deploy(
      deployParams.name,
      deployParams.symbol
    );
  });

  it("should allow reading name", async () => {
    // using compatibility getter -> returns(string)
    const nameAsString = await lsp4Compatibility.name();
    expect(nameAsString).toEqual(deployParams.name);

    // using getData -> returns(bytes)
    const nameAsBytes = await lsp4Compatibility.getData(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("LSP4TokenName"))
    );
    expect(ethers.utils.toUtf8String(nameAsBytes)).toEqual(deployParams.name);
  });

  it("should allow reading symbol", async () => {
    // using compatibility getter -> returns(string)
    const symbolAsString = await lsp4Compatibility.symbol();
    expect(symbolAsString).toEqual(deployParams.symbol);

    // using getData -> returns(bytes)
    const symbolAsBytes = await lsp4Compatibility.getData(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("LSP4TokenSymbol"))
    );
    expect(ethers.utils.toUtf8String(symbolAsBytes)).toEqual(deployParams.symbol);
  });
});
