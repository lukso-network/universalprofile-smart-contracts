import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TargetContract, TargetContract__factory } from "../../../types";

// constants
import {
  ALL_PERMISSIONS,
  ERC725YKeys,
  OPERATION_TYPES,
  PERMISSIONS,
} from "../../../constants";

// helpers
import { combinePermissions } from "../../utils/helpers";

// setup
import { LSP6TestContext } from "../../utils/context";
import { setupKeyManager } from "../../utils/fixtures";
import { provider } from "../../utils/helpers";

export const shouldBehaveLikeExecuteRelayCall = (
  buildContext: () => Promise<LSP6TestContext>
) => {
  let context: LSP6TestContext;

  let signer: SignerWithAddress,
    relayer: SignerWithAddress,
    random: SignerWithAddress;
  let targetContract: TargetContract;

  before(async () => {
    context = await buildContext();

    signer = context.accounts[1];
    relayer = context.accounts[2];
    random = context.accounts[3];

    targetContract = await new TargetContract__factory(
      context.accounts[0]
    ).deploy();

    const permissionKeys = [
      ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
        context.owner.address.substring(2),
      ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
        signer.address.substring(2),
    ];

    const permissionsValues = [
      ALL_PERMISSIONS,
      combinePermissions(PERMISSIONS.CALL, PERMISSIONS.TRANSFERVALUE),
    ];

    await setupKeyManager(context, permissionKeys, permissionsValues);
  });

  describe("When testing executeRelayCall(..)", () => {
    describe("When testing signed message", () => {
      describe("When testing msg.value", () => {
        describe("When sending more than the signed msg.value", () => {
          it("should revert by recovering a non permissioned address", async () => {
            let executeRelayCallPayload =
              context.universalProfile.interface.encodeFunctionData("execute", [
                OPERATION_TYPES.CALL,
                random.address,
                0,
                "0x",
              ]);

            let latestNonce = await context.keyManager.callStatic.getNonce(
              signer.address,
              0
            );

            let valueToSign = 5;

            const signedMessageParams = {
              chainId: 31337, // HARDHAT_CHAINID
              address: context.keyManager.address,
              nonce: latestNonce,
              Msgvalue: valueToSign,
              payload: executeRelayCallPayload,
            };

            let valueToSendFromRelayer = 10;

            let hash = ethers.utils.solidityKeccak256(
              ["uint256", "address", "uint256", "uint256", "bytes"],
              [
                signedMessageParams.chainId,
                signedMessageParams.address,
                signedMessageParams.nonce,
                signedMessageParams.Msgvalue,
                signedMessageParams.payload,
              ]
            );

            let signature = await signer.signMessage(
              ethers.utils.arrayify(hash)
            );

            await expect(
              context.keyManager.executeRelayCall(
                signature,
                signedMessageParams.nonce,
                signedMessageParams.payload,
                { value: valueToSendFromRelayer }
              )
            ).to.be.revertedWithCustomError(
              context.keyManager,
              "NoPermissionsSet"
            );
          });
        });
        describe("When sending 0 while msg.value signed > 0", () => {
          it("should revert by recovering a non permissioned address", async () => {
            let executeRelayCallPayload =
              context.universalProfile.interface.encodeFunctionData("execute", [
                OPERATION_TYPES.CALL,
                random.address,
                0,
                "0x",
              ]);

            let latestNonce = await context.keyManager.callStatic.getNonce(
              signer.address,
              0
            );

            let valueToSign = 5;

            const signedMessageParams = {
              chainId: 31337, // HARDHAT_CHAINID
              address: context.keyManager.address,
              nonce: latestNonce,
              Msgvalue: valueToSign,
              payload: executeRelayCallPayload,
            };

            let valueToSendFromRelayer = 0;

            let hash = ethers.utils.solidityKeccak256(
              ["uint256", "address", "uint256", "uint256", "bytes"],
              [
                signedMessageParams.chainId,
                signedMessageParams.address,
                signedMessageParams.nonce,
                signedMessageParams.Msgvalue,
                signedMessageParams.payload,
              ]
            );

            let signature = await signer.signMessage(
              ethers.utils.arrayify(hash)
            );

            await expect(
              context.keyManager
                .connect(relayer)
                .executeRelayCall(
                  signature,
                  signedMessageParams.nonce,
                  signedMessageParams.payload,
                  { value: valueToSendFromRelayer }
                )
            ).to.be.revertedWithCustomError(
              context.keyManager,
              "NoPermissionsSet"
            );
          });
        });
        describe("When sending exact msg.value like the one that is signed", () => {
          it("should pass", async () => {
            let executeRelayCallPayload =
              context.universalProfile.interface.encodeFunctionData("execute", [
                OPERATION_TYPES.CALL,
                random.address,
                0,
                "0x",
              ]);

            let latestNonce = await context.keyManager.callStatic.getNonce(
              signer.address,
              0
            );

            let valueToSendFromRelayer = 10;

            const signedMessageParams = {
              chainId: 31337, // HARDHAT_CHAINID
              address: context.keyManager.address,
              nonce: latestNonce,
              Msgvalue: valueToSendFromRelayer,
              payload: executeRelayCallPayload,
            };

            let hash = ethers.utils.solidityKeccak256(
              ["uint256", "address", "uint256", "uint256", "bytes"],
              [
                signedMessageParams.chainId,
                signedMessageParams.address,
                signedMessageParams.nonce,
                signedMessageParams.Msgvalue,
                signedMessageParams.payload,
              ]
            );

            const balanceOfUpBefore = await provider.getBalance(
              context.universalProfile.address
            );

            let signature = await signer.signMessage(
              ethers.utils.arrayify(hash)
            );

            await context.keyManager
              .connect(relayer)
              .executeRelayCall(
                signature,
                signedMessageParams.nonce,
                signedMessageParams.payload,
                { value: valueToSendFromRelayer }
              );

            const balanceOfUpAfter = await provider.getBalance(
              context.universalProfile.address
            );

            expect(balanceOfUpBefore.add(valueToSendFromRelayer)).to.equal(
              balanceOfUpAfter
            );
          });
        });
        describe("When UP have 0 value and interacting with contract that require value", () => {
          describe("When interacting without sending any value from KeyManager but with sending from UP", () => {
            it("should revert", async () => {
              let nameToSet = "Alice";
              let targetContractPayload =
                targetContract.interface.encodeFunctionData("setNamePayable", [
                  nameToSet,
                ]);

              let requiredValueForExecution = 51; // specified in `setNamePayable(..)`

              let latestNonce = await context.keyManager.callStatic.getNonce(
                signer.address,
                0
              );

              let executeRelayCallPayload =
                context.universalProfile.interface.encodeFunctionData(
                  "execute",
                  [
                    OPERATION_TYPES.CALL,
                    targetContract.address,
                    requiredValueForExecution,
                    targetContractPayload,
                  ]
                );

              let valueToSendFromRelayer = 0;

              const signedMessageParams = {
                chainId: 31337, // HARDHAT_CHAINID
                address: context.keyManager.address,
                nonce: latestNonce,
                Msgvalue: valueToSendFromRelayer,
                payload: executeRelayCallPayload,
              };

              let hash = ethers.utils.solidityKeccak256(
                ["uint256", "address", "uint256", "uint256", "bytes"],
                [
                  signedMessageParams.chainId,
                  signedMessageParams.address,
                  signedMessageParams.nonce,
                  signedMessageParams.Msgvalue,
                  signedMessageParams.payload,
                ]
              );

              let signature = await signer.signMessage(
                ethers.utils.arrayify(hash)
              );

              await expect(
                context.keyManager
                  .connect(relayer)
                  .executeRelayCall(
                    signature,
                    latestNonce,
                    executeRelayCallPayload,
                    { value: valueToSendFromRelayer }
                  )
              ).to.be.revertedWith("ERC725X: insufficient balance");
            });
          });
          describe("When interacting with execution cost from KeyManager with sending from UP", () => {
            it("should pass", async () => {
              let nameToSet = "Alice";
              let targetContractPayload =
                targetContract.interface.encodeFunctionData("setNamePayable", [
                  nameToSet,
                ]);

              let requiredValueForExecution = 51; // specified in `setNamePayable(..)`

              let latestNonce = await context.keyManager.callStatic.getNonce(
                signer.address,
                0
              );

              let executeRelayCallPayload =
                context.universalProfile.interface.encodeFunctionData(
                  "execute",
                  [
                    OPERATION_TYPES.CALL,
                    targetContract.address,
                    requiredValueForExecution,
                    targetContractPayload,
                  ]
                );

              let valueToSendFromRelayer = 51;

              const signedMessageParams = {
                chainId: 31337, // HARDHAT_CHAINID
                address: context.keyManager.address,
                nonce: latestNonce,
                Msgvalue: valueToSendFromRelayer,
                payload: executeRelayCallPayload,
              };

              let hash = ethers.utils.solidityKeccak256(
                ["uint256", "address", "uint256", "uint256", "bytes"],
                [
                  signedMessageParams.chainId,
                  signedMessageParams.address,
                  signedMessageParams.nonce,
                  signedMessageParams.Msgvalue,
                  signedMessageParams.payload,
                ]
              );

              let signature = await signer.signMessage(
                ethers.utils.arrayify(hash)
              );

              await context.keyManager
                .connect(relayer)
                .executeRelayCall(
                  signature,
                  latestNonce,
                  executeRelayCallPayload,
                  { value: valueToSendFromRelayer }
                );
              const result = await targetContract.callStatic.getName();
              expect(result).to.equal(nameToSet);
            });
          });
        });
      });
    });
  });
};
