import { expect } from "chai";
import { ethers } from "hardhat";

//types
import { BigNumber, BytesLike } from "ethers";

// constants
import { ERC725YDataKeys } from "../../../../constants";

// setup
import { LSP6TestContext } from "../../../utils/context";

// helpers
import {
  // Types
  ReentrancyContext,
  // Test cases
  transferValueTestCases,
  setDataTestCases,
  addPermissionsTestCases,
  changePermissionsTestCases,
  addUniversalReceiverDelegateTestCases,
  changeUniversalReceiverDelegateTestCases,
  // Functions
  generateRelayCall,
  generateExecutePayload,
  loadTestCase,
} from "./reentrancyHelpers";

export const testSingleExecuteRelayCallToSingleExecute = (
  buildContext: () => Promise<LSP6TestContext>,
  buildReentrancyContext: (
    context: LSP6TestContext
  ) => Promise<ReentrancyContext>
) => {
  let context: LSP6TestContext;
  let reentrancyContext: ReentrancyContext;

  before(async () => {
    context = await buildContext();
    reentrancyContext = await buildReentrancyContext(context);
  });

  describe("when reentering and transferring value", () => {
    let relayCallParams: {
      signature: BytesLike;
      nonce: BigNumber;
      payload: BytesLike;
    };
    before(async () => {
      const executePayload = generateExecutePayload(
        context.keyManager.address,
        reentrancyContext.reentrantContract.address,
        "TRANSFERVALUE"
      );

      relayCallParams = await generateRelayCall(
        context.keyManager,
        executePayload,
        reentrancyContext.signer
      );
    });

    transferValueTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "TRANSFERVALUE",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantContract.address,
          reentrancyContext.reentrantContract.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["executeRelayCall(bytes,uint256,bytes)"](
              relayCallParams.signature,
              relayCallParams.nonce,
              relayCallParams.payload
            )
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantContract.address,
            testCase.missingPermission
          );
      });
    });

    it("should revert if the reentrant contract has the following permissions: REENTRANCY, TRANSFERVALUE & NO AllowedCalls", async () => {
      await loadTestCase(
        "TRANSFERVALUE",
        transferValueTestCases.NoCallsAllowed,
        context,
        reentrancyContext,
        reentrancyContext.reentrantContract.address,
        reentrancyContext.reentrantContract.address
      );

      await expect(
        context.keyManager
          .connect(reentrancyContext.caller)
          ["executeRelayCall(bytes,uint256,bytes)"](
            relayCallParams.signature,
            relayCallParams.nonce,
            relayCallParams.payload
          )
      ).to.be.revertedWithCustomError(context.keyManager, "NoCallsAllowed");
    });

    it("should pass if the reentrant contract has the following permissions: REENTRANCY, TRANSFERVALUE & AllowedCalls", async () => {
      await loadTestCase(
        "TRANSFERVALUE",
        transferValueTestCases.ValidCase,
        context,
        reentrancyContext,
        reentrancyContext.reentrantContract.address,
        reentrancyContext.reentrantContract.address
      );

      expect(
        await context.universalProfile.provider.getBalance(
          context.universalProfile.address
        )
      ).to.equal(ethers.utils.parseEther("10"));

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["executeRelayCall(bytes,uint256,bytes)"](
          relayCallParams.signature,
          relayCallParams.nonce,
          relayCallParams.payload
        );

      expect(
        await context.universalProfile.provider.getBalance(
          context.universalProfile.address
        )
      ).to.equal(ethers.utils.parseEther("9"));

      expect(
        await context.universalProfile.provider.getBalance(
          reentrancyContext.reentrantContract.address
        )
      ).to.equal(ethers.utils.parseEther("1"));
    });
  });

  describe("when reentering and setting data", () => {
    let relayCallParams: {
      signature: BytesLike;
      nonce: BigNumber;
      payload: BytesLike;
    };
    before(async () => {
      const executePayload = generateExecutePayload(
        context.keyManager.address,
        reentrancyContext.reentrantContract.address,
        "SETDATA"
      );

      relayCallParams = await generateRelayCall(
        context.keyManager,
        executePayload,
        reentrancyContext.signer
      );
    });

    setDataTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "SETDATA",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantContract.address,
          reentrancyContext.reentrantContract.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["executeRelayCall(bytes,uint256,bytes)"](
              relayCallParams.signature,
              relayCallParams.nonce,
              relayCallParams.payload
            )
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantContract.address,
            testCase.missingPermission
          );
      });
    });

    it("should revert if the reentrant contract has the following permissions: REENTRANCY, SETDATA & NO AllowedERC725YDataKeys", async () => {
      await loadTestCase(
        "SETDATA",
        setDataTestCases.NoERC725YDataKeysAllowed,
        context,
        reentrancyContext,
        reentrancyContext.reentrantContract.address,
        reentrancyContext.reentrantContract.address
      );

      await expect(
        context.keyManager
          .connect(reentrancyContext.caller)
          ["executeRelayCall(bytes,uint256,bytes)"](
            relayCallParams.signature,
            relayCallParams.nonce,
            relayCallParams.payload
          )
      ).to.be.revertedWithCustomError(
        context.keyManager,
        "NoERC725YDataKeysAllowed"
      );
    });

    it("should pass if the reentrant contract has the following permissions: REENTRANCY, SETDATA & AllowedERC725YDataKeys", async () => {
      await loadTestCase(
        "SETDATA",
        setDataTestCases.ValidCase,
        context,
        reentrancyContext,
        reentrancyContext.reentrantContract.address,
        reentrancyContext.reentrantContract.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["executeRelayCall(bytes,uint256,bytes)"](
          relayCallParams.signature,
          relayCallParams.nonce,
          relayCallParams.payload
        );

      const hardcodedKey = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("SomeRandomTextUsed")
      );
      const hardcodedValue = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes("SomeRandomTextUsed")
      );

      expect(
        await context.universalProfile["getData(bytes32)"](hardcodedKey)
      ).to.equal(hardcodedValue);
    });
  });

  describe("when reentering and adding permissions", () => {
    let relayCallParams: {
      signature: BytesLike;
      nonce: BigNumber;
      payload: BytesLike;
    };
    before(async () => {
      const executePayload = generateExecutePayload(
        context.keyManager.address,
        reentrancyContext.reentrantContract.address,
        "ADDPERMISSIONS"
      );

      relayCallParams = await generateRelayCall(
        context.keyManager,
        executePayload,
        reentrancyContext.signer
      );
    });

    addPermissionsTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "ADDPERMISSIONS",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantContract.address,
          reentrancyContext.reentrantContract.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["executeRelayCall(bytes,uint256,bytes)"](
              relayCallParams.signature,
              relayCallParams.nonce,
              relayCallParams.payload
            )
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantContract.address,
            testCase.missingPermission
          );
      });
    });

    it("should pass if the reentrant contract has the following permissions: REENTRANCY, ADDPERMISSIONS", async () => {
      await loadTestCase(
        "ADDPERMISSIONS",
        addPermissionsTestCases.ValidCase,
        context,
        reentrancyContext,
        reentrancyContext.reentrantContract.address,
        reentrancyContext.reentrantContract.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["executeRelayCall(bytes,uint256,bytes)"](
          relayCallParams.signature,
          relayCallParams.nonce,
          relayCallParams.payload
        );

      const hardcodedPermissionKey =
        ERC725YDataKeys.LSP6["AddressPermissions:Permissions"] +
        reentrancyContext.newControllerAddress.substring(2);
      const hardcodedPermissionValue =
        "0x0000000000000000000000000000000000000000000000000000000000000010";

      expect(
        await context.universalProfile["getData(bytes32)"](
          hardcodedPermissionKey
        )
      ).to.equal(hardcodedPermissionValue);
    });
  });

  describe("when reentering and changing permissions", () => {
    let relayCallParams: {
      signature: BytesLike;
      nonce: BigNumber;
      payload: BytesLike;
    };
    before(async () => {
      const executePayload = generateExecutePayload(
        context.keyManager.address,
        reentrancyContext.reentrantContract.address,
        "CHANGEPERMISSIONS"
      );

      relayCallParams = await generateRelayCall(
        context.keyManager,
        executePayload,
        reentrancyContext.signer
      );
    });

    changePermissionsTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "CHANGEPERMISSIONS",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantContract.address,
          reentrancyContext.reentrantContract.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["executeRelayCall(bytes,uint256,bytes)"](
              relayCallParams.signature,
              relayCallParams.nonce,
              relayCallParams.payload
            )
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantContract.address,
            testCase.missingPermission
          );
      });
    });

    it("should pass if the reentrant contract has the following permissions: REENTRANCY, CHANGEPERMISSIONS", async () => {
      await loadTestCase(
        "CHANGEPERMISSIONS",
        changePermissionsTestCases.ValidCase,
        context,
        reentrancyContext,
        reentrancyContext.reentrantContract.address,
        reentrancyContext.reentrantContract.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["executeRelayCall(bytes,uint256,bytes)"](
          relayCallParams.signature,
          relayCallParams.nonce,
          relayCallParams.payload
        );

      const hardcodedPermissionKey =
        ERC725YDataKeys.LSP6["AddressPermissions:Permissions"] +
        reentrancyContext.newControllerAddress.substring(2);
      const hardcodedPermissionValue = "0x";

      expect(
        await context.universalProfile["getData(bytes32)"](
          hardcodedPermissionKey
        )
      ).to.equal(hardcodedPermissionValue);
    });
  });

  describe("when reentering and adding URD", () => {
    let relayCallParams: {
      signature: BytesLike;
      nonce: BigNumber;
      payload: BytesLike;
    };
    before(async () => {
      const executePayload = generateExecutePayload(
        context.keyManager.address,
        reentrancyContext.reentrantContract.address,
        "ADDUNIVERSALRECEIVERDELEGATE"
      );

      relayCallParams = await generateRelayCall(
        context.keyManager,
        executePayload,
        reentrancyContext.signer
      );
    });

    addUniversalReceiverDelegateTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "ADDUNIVERSALRECEIVERDELEGATE",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantContract.address,
          reentrancyContext.reentrantContract.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["executeRelayCall(bytes,uint256,bytes)"](
              relayCallParams.signature,
              relayCallParams.nonce,
              relayCallParams.payload
            )
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantContract.address,
            testCase.missingPermission
          );
      });
    });

    it("should pass if the reentrant contract has the following permissions: REENTRANCY, ADDUNIVERSALRECEIVERDELEGATE", async () => {
      await loadTestCase(
        "ADDUNIVERSALRECEIVERDELEGATE",
        addUniversalReceiverDelegateTestCases.ValidCase,
        context,
        reentrancyContext,
        reentrancyContext.reentrantContract.address,
        reentrancyContext.reentrantContract.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["executeRelayCall(bytes,uint256,bytes)"](
          relayCallParams.signature,
          relayCallParams.nonce,
          relayCallParams.payload
        );

      const hardcodedLSP1Key =
        ERC725YDataKeys.LSP1.LSP1UniversalReceiverDelegatePrefix +
        reentrancyContext.randomLSP1TypeId.substring(2, 42);

      const hardcodedLSP1Value = reentrancyContext.newURDAddress;

      expect(
        await context.universalProfile["getData(bytes32)"](hardcodedLSP1Key)
      ).to.equal(hardcodedLSP1Value.toLowerCase());
    });
  });

  describe("when reentering and changing URD", () => {
    let relayCallParams: {
      signature: BytesLike;
      nonce: BigNumber;
      payload: BytesLike;
    };
    before(async () => {
      const executePayload = generateExecutePayload(
        context.keyManager.address,
        reentrancyContext.reentrantContract.address,
        "CHANGEUNIVERSALRECEIVERDELEGATE"
      );

      relayCallParams = await generateRelayCall(
        context.keyManager,
        executePayload,
        reentrancyContext.signer
      );
    });

    changeUniversalReceiverDelegateTestCases.NotAuthorised.forEach(
      (testCase) => {
        it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
          await loadTestCase(
            "CHANGEUNIVERSALRECEIVERDELEGATE",
            testCase,
            context,
            reentrancyContext,
            reentrancyContext.reentrantContract.address,
            reentrancyContext.reentrantContract.address
          );

          await expect(
            context.keyManager
              .connect(reentrancyContext.caller)
              ["executeRelayCall(bytes,uint256,bytes)"](
                relayCallParams.signature,
                relayCallParams.nonce,
                relayCallParams.payload
              )
          )
            .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
            .withArgs(
              reentrancyContext.reentrantContract.address,
              testCase.missingPermission
            );
        });
      }
    );

    it("should pass if the reentrant contract has the following permissions: REENTRANCY, CHANGEUNIVERSALRECEIVERDELEGATE", async () => {
      await loadTestCase(
        "CHANGEUNIVERSALRECEIVERDELEGATE",
        changeUniversalReceiverDelegateTestCases.ValidCase,
        context,
        reentrancyContext,
        reentrancyContext.reentrantContract.address,
        reentrancyContext.reentrantContract.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["executeRelayCall(bytes,uint256,bytes)"](
          relayCallParams.signature,
          relayCallParams.nonce,
          relayCallParams.payload
        );

      const hardcodedLSP1Key =
        ERC725YDataKeys.LSP1.LSP1UniversalReceiverDelegatePrefix +
        reentrancyContext.randomLSP1TypeId.substring(2, 42);

      const hardcodedLSP1Value = "0x";

      expect(
        await context.universalProfile["getData(bytes32)"](hardcodedLSP1Key)
      ).to.equal(hardcodedLSP1Value.toLowerCase());
    });
  });

  after(async () => {
    await reentrancyContext.owner.sendTransaction({
      to: context.universalProfile.address,
      value: ethers.utils.parseEther("1"),
    });
  });
};
