import { expect } from "chai";
import { ethers } from "hardhat";

//types
import { BytesLike } from "ethers";
import {
  SingleReentrancyRelayer__factory,
  UniversalProfile__factory,
} from "../../../../types";

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
  generateSingleRelayPayload,
  loadTestCase,
} from "./reentrancyHelpers";

export const testSingleExecuteToSingleExecuteRelayCall = (
  buildContext: () => Promise<LSP6TestContext>,
  buildReentrancyContext: (
    context: LSP6TestContext
  ) => Promise<ReentrancyContext>
) => {
  let context: LSP6TestContext;
  let reentrancyContext: ReentrancyContext;
  let executePayload: BytesLike;

  before(async () => {
    context = await buildContext();
    reentrancyContext = await buildReentrancyContext(context);

    const reentrantCallPayload =
      new SingleReentrancyRelayer__factory().interface.encodeFunctionData(
        "relayCallThatReenters",
        [context.keyManager.address]
      );
    executePayload =
      new UniversalProfile__factory().interface.encodeFunctionData(
        "execute(uint256,address,uint256,bytes)",
        [
          0,
          reentrancyContext.singleReentarncyRelayer.address,
          0,
          reentrantCallPayload,
        ]
      );
  });

  describe("when reentering and transferring value", () => {
    before(async () => {
      await generateSingleRelayPayload(
        context.universalProfile,
        context.keyManager,
        "TRANSFERVALUE",
        reentrancyContext.singleReentarncyRelayer,
        reentrancyContext.reentrantSigner,
        reentrancyContext.newControllerAddress,
        reentrancyContext.newURDAddress
      );
    });

    transferValueTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "TRANSFERVALUE",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantSigner.address,
          reentrancyContext.singleReentarncyRelayer.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["execute(bytes)"](executePayload)
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantSigner.address,
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
        reentrancyContext.reentrantSigner.address,
        reentrancyContext.singleReentarncyRelayer.address
      );

      await expect(
        context.keyManager
          .connect(reentrancyContext.caller)
          ["execute(bytes)"](executePayload)
      ).to.be.revertedWithCustomError(context.keyManager, "NoCallsAllowed");
    });

    it("should pass if the reentrant contract has the following permissions: REENTRANCY, TRANSFERVALUE & AllowedCalls", async () => {
      await loadTestCase(
        "TRANSFERVALUE",
        transferValueTestCases.ValidCase,
        context,
        reentrancyContext,
        reentrancyContext.reentrantSigner.address,
        reentrancyContext.singleReentarncyRelayer.address
      );

      expect(
        await context.universalProfile.provider.getBalance(
          context.universalProfile.address
        )
      ).to.equal(ethers.utils.parseEther("10"));

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["execute(bytes)"](executePayload);

      expect(
        await context.universalProfile.provider.getBalance(
          context.universalProfile.address
        )
      ).to.equal(ethers.utils.parseEther("9"));

      expect(
        await context.universalProfile.provider.getBalance(
          reentrancyContext.singleReentarncyRelayer.address
        )
      ).to.equal(ethers.utils.parseEther("1"));
    });
  });

  describe("when reentering and setting data", () => {
    before(async () => {
      await generateSingleRelayPayload(
        context.universalProfile,
        context.keyManager,
        "SETDATA",
        reentrancyContext.singleReentarncyRelayer,
        reentrancyContext.reentrantSigner,
        reentrancyContext.newControllerAddress,
        reentrancyContext.newURDAddress
      );
    });

    setDataTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "SETDATA",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantSigner.address,
          reentrancyContext.singleReentarncyRelayer.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["execute(bytes)"](executePayload)
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantSigner.address,
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
        reentrancyContext.reentrantSigner.address,
        reentrancyContext.singleReentarncyRelayer.address
      );

      await expect(
        context.keyManager
          .connect(reentrancyContext.caller)
          ["execute(bytes)"](executePayload)
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
        reentrancyContext.reentrantSigner.address,
        reentrancyContext.singleReentarncyRelayer.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["execute(bytes)"](executePayload);

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
    before(async () => {
      await generateSingleRelayPayload(
        context.universalProfile,
        context.keyManager,
        "ADDPERMISSIONS",
        reentrancyContext.singleReentarncyRelayer,
        reentrancyContext.reentrantSigner,
        reentrancyContext.newControllerAddress,
        reentrancyContext.newURDAddress
      );
    });

    addPermissionsTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "ADDPERMISSIONS",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantSigner.address,
          reentrancyContext.singleReentarncyRelayer.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["execute(bytes)"](executePayload)
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantSigner.address,
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
        reentrancyContext.reentrantSigner.address,
        reentrancyContext.singleReentarncyRelayer.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["execute(bytes)"](executePayload);

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
    before(async () => {
      await generateSingleRelayPayload(
        context.universalProfile,
        context.keyManager,
        "CHANGEPERMISSIONS",
        reentrancyContext.singleReentarncyRelayer,
        reentrancyContext.reentrantSigner,
        reentrancyContext.newControllerAddress,
        reentrancyContext.newURDAddress
      );
    });

    changePermissionsTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "CHANGEPERMISSIONS",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantSigner.address,
          reentrancyContext.singleReentarncyRelayer.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["execute(bytes)"](executePayload)
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantSigner.address,
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
        reentrancyContext.reentrantSigner.address,
        reentrancyContext.singleReentarncyRelayer.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["execute(bytes)"](executePayload);

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
    before(async () => {
      await generateSingleRelayPayload(
        context.universalProfile,
        context.keyManager,
        "ADDUNIVERSALRECEIVERDELEGATE",
        reentrancyContext.singleReentarncyRelayer,
        reentrancyContext.reentrantSigner,
        reentrancyContext.newControllerAddress,
        reentrancyContext.newURDAddress
      );
    });

    addUniversalReceiverDelegateTestCases.NotAuthorised.forEach((testCase) => {
      it(`should revert if the reentrant contract has the following permissions: ${testCase.permissionsText}`, async () => {
        await loadTestCase(
          "ADDUNIVERSALRECEIVERDELEGATE",
          testCase,
          context,
          reentrancyContext,
          reentrancyContext.reentrantSigner.address,
          reentrancyContext.singleReentarncyRelayer.address
        );

        await expect(
          context.keyManager
            .connect(reentrancyContext.caller)
            ["execute(bytes)"](executePayload)
        )
          .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
          .withArgs(
            reentrancyContext.reentrantSigner.address,
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
        reentrancyContext.reentrantSigner.address,
        reentrancyContext.singleReentarncyRelayer.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["execute(bytes)"](executePayload);

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
    before(async () => {
      await generateSingleRelayPayload(
        context.universalProfile,
        context.keyManager,
        "CHANGEUNIVERSALRECEIVERDELEGATE",
        reentrancyContext.singleReentarncyRelayer,
        reentrancyContext.reentrantSigner,
        reentrancyContext.newControllerAddress,
        reentrancyContext.newURDAddress
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
            reentrancyContext.reentrantSigner.address,
            reentrancyContext.singleReentarncyRelayer.address
          );

          await expect(
            context.keyManager
              .connect(reentrancyContext.caller)
              ["execute(bytes)"](executePayload)
          )
            .to.be.revertedWithCustomError(context.keyManager, "NotAuthorised")
            .withArgs(
              reentrancyContext.reentrantSigner.address,
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
        reentrancyContext.reentrantSigner.address,
        reentrancyContext.singleReentarncyRelayer.address
      );

      await context.keyManager
        .connect(reentrancyContext.caller)
        ["execute(bytes)"](executePayload);

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
