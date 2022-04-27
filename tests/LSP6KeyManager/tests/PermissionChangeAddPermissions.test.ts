import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// constants
import {
  ERC725YKeys,
  ALL_PERMISSIONS_SET,
  PERMISSIONS,
  OPERATIONS,
} from "../../../constants";

// setup
import { LSP6TestContext } from "../../utils/context";
import { setupKeyManager } from "../../utils/fixtures";

// helpers
import { abiCoder, NotAuthorisedError } from "../../utils/helpers";

export const shouldBehaveLikePermissionChangeOrAddPermissions = (
  buildContext: () => Promise<LSP6TestContext>
) => {
  let context: LSP6TestContext;

  describe("setting permissions keys (CHANGE vs ADD Permissions)", () => {
    let canOnlyAddPermissions: SignerWithAddress,
      canOnlyChangePermissions: SignerWithAddress,
      canOnlySetData: SignerWithAddress,
      // addresses being used to CHANGE (= edit) permissions
      addressToEditPermissions: SignerWithAddress,
      addressWithZeroHexPermissions: SignerWithAddress;

    let permissionArrayKeys: string[] = [];
    let permissionArrayValues: string[] = [];

    beforeEach(async () => {
      context = await buildContext();

      canOnlyAddPermissions = context.accounts[1];
      canOnlyChangePermissions = context.accounts[2];
      canOnlySetData = context.accounts[3];
      addressToEditPermissions = context.accounts[4];
      addressWithZeroHexPermissions = context.accounts[5];

      let permissionKeys = [
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          context.owner.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          canOnlyAddPermissions.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          canOnlyChangePermissions.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          canOnlySetData.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          addressToEditPermissions.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          addressWithZeroHexPermissions.address.substring(2),
      ];

      let permissionValues = [
        ALL_PERMISSIONS_SET,
        ethers.utils.hexZeroPad(PERMISSIONS.ADDPERMISSIONS, 32),
        ethers.utils.hexZeroPad(PERMISSIONS.CHANGEPERMISSIONS, 32),
        ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
        // placeholder permission
        ethers.utils.hexZeroPad(PERMISSIONS.TRANSFERVALUE, 32),
        // 0x0000... = similar to empty, or 'no permissions set'
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ];

      permissionArrayKeys = [
        ERC725YKeys.LSP6["AddressPermissions[]"],
        ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
          "00000000000000000000000000000000",
        ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
          "00000000000000000000000000000001",
        ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
          "00000000000000000000000000000002",
        ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
          "00000000000000000000000000000003",
        ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
          "00000000000000000000000000000004",
        ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
          "00000000000000000000000000000005",
      ];

      permissionArrayValues = [
        ethers.utils.hexZeroPad(6, 32),
        context.owner.address,
        canOnlyAddPermissions.address,
        canOnlyChangePermissions.address,
        canOnlySetData.address,
        addressToEditPermissions.address,
        addressWithZeroHexPermissions.address,
      ];

      permissionKeys = permissionKeys.concat(permissionArrayKeys);
      permissionValues = permissionValues.concat(permissionArrayValues);

      await setupKeyManager(context, permissionKeys, permissionValues);
    });

    describe("when setting one permission key", () => {
      describe("when caller is an address with ALL PERMISSIONS", () => {
        it("should be allowed to ADD permissions", async () => {
          let newController = new ethers.Wallet.createRandom();

          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            newController.address.substr(2);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32)]]
          );

          await context.keyManager.connect(context.owner).execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(result).toEqual(
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32)
          );
        });

        it("should be allowed to CHANGE permissions", async () => {
          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            addressToEditPermissions.address.substring(2);

          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager.connect(context.owner).execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(result).toEqual(value);
        });

        it("should be allowed to increment the 'AddressPermissions[]' key (length)", async () => {
          let key = ERC725YKeys.LSP6["AddressPermissions[]"];
          let value = ethers.utils.hexZeroPad(8, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager.connect(context.owner).execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(result).toEqual(value);
        });

        it("should be allowed to decrement the 'AddressPermissions[]' key (length)", async () => {
          let key = ERC725YKeys.LSP6["AddressPermissions[]"];
          let value = ethers.utils.hexZeroPad(4, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager.connect(context.owner).execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(result).toEqual(value);
        });

        it("should be allowed to edit AddressPermissions[4]", async () => {
          let randomWallet = new ethers.Wallet.createRandom();

          let key =
            ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
            "00000000000000000000000000000004";

          let value = randomWallet.address;

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager.connect(context.owner).execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(ethers.utils.getAddress(result)).toEqual(value);
        });
      });

      describe("when caller is an address with permission ADDPERMISSIONS", () => {
        it("should be allowed to add permissions", async () => {
          let newController = new ethers.Wallet.createRandom();

          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            newController.address.substring(2);

          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager
            .connect(canOnlyAddPermissions)
            .execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(result).toEqual(value);
        });

        it("should not be allowed to CHANGE permission", async () => {
          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            addressToEditPermissions.address.substring(2);

          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlyAddPermissions).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canOnlyAddPermissions.address,
              "CHANGEPERMISSIONS"
            )
          );
        });

        it("should be allowed to increment the 'AddressPermissions[]' key (length)", async () => {
          let key = ERC725YKeys.LSP6["AddressPermissions[]"];
          let value = ethers.utils.hexZeroPad(8, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager
            .connect(canOnlyAddPermissions)
            .execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(result).toEqual(value);
        });

        it("should not be allowed to decrement the 'AddressPermissions[]' key (length)", async () => {
          let key = ERC725YKeys.LSP6["AddressPermissions[]"];
          let value = ethers.utils.hexZeroPad(4, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlyAddPermissions).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canOnlyAddPermissions.address,
              "CHANGEPERMISSIONS"
            )
          );
        });

        it("should not be allowed to edit AddressPermissions[4]", async () => {
          let randomWallet = new ethers.Wallet.createRandom();

          let key =
            ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
            "00000000000000000000000000000004";

          let value = randomWallet.address;

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlyAddPermissions).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canOnlyAddPermissions.address,
              "CHANGEPERMISSIONS"
            )
          );
        });
      });

      describe("when caller is an address with permission CHANGEPERMISSION", () => {
        it("should not be allowed to ADD permissions", async () => {
          let newController = new ethers.Wallet.createRandom();

          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            newController.address.substr(2);

          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager
              .connect(canOnlyChangePermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canOnlyChangePermissions.address,
              "ADDPERMISSIONS"
            )
          );
        });

        it("should not be allowed to set (= ADD) permissions for an address that has 32 x 0 bytes (0x0000...0000) as permission value", async () => {
          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            addressWithZeroHexPermissions.address.substring(2);
          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager
              .connect(canOnlyChangePermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canOnlyChangePermissions.address,
              "ADDPERMISSIONS"
            )
          );
        });

        it("should be allowed to CHANGE permissions", async () => {
          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            addressToEditPermissions.address.substring(2);

          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager
            .connect(canOnlyChangePermissions)
            .execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(result).toEqual(value);
        });

        it("should not be allowed to increment the 'AddressPermissions[]' key (length)", async () => {
          let key = ERC725YKeys.LSP6["AddressPermissions[]"];
          let value = ethers.utils.hexZeroPad(8, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager
              .connect(canOnlyChangePermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canOnlyChangePermissions.address,
              "ADDPERMISSIONS"
            )
          );
        });

        it("should be allowed to decrement the 'AddressPermissions[]' key (length)", async () => {
          let key = ERC725YKeys.LSP6["AddressPermissions[]"];
          let value = ethers.utils.hexZeroPad(4, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager
            .connect(canOnlyChangePermissions)
            .execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(result).toEqual(value);
        });

        it("should be allowed to edit AddressPermissions[4]", async () => {
          let randomWallet = new ethers.Wallet.createRandom();

          let key =
            ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
            "00000000000000000000000000000004";

          let value = randomWallet.address;

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await context.keyManager
            .connect(canOnlyChangePermissions)
            .execute(payload);

          // prettier-ignore
          const result = await context.universalProfile["getData(bytes32)"](key);
          expect(ethers.utils.getAddress(result)).toEqual(value);
        });
      });

      describe("when caller is an address with permission SETDATA", () => {
        it("should not be allowed to ADD permissions", async () => {
          let newController = new ethers.Wallet.createRandom();

          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            newController.address.substr(2);

          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlySetData).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(canOnlySetData.address, "ADDPERMISSIONS")
          );
        });

        it("should not be allowed to set (= ADD) permissions for an address that has 32 x 0 bytes (0x0000...0000) as permission value", async () => {
          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            addressWithZeroHexPermissions.address.substring(2);
          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlySetData).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(canOnlySetData.address, "ADDPERMISSIONS")
          );
        });

        it("should not be allowed to CHANGE permission", async () => {
          let key =
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
            addressToEditPermissions.address.substring(2);

          let value = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlySetData).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(canOnlySetData.address, "CHANGEPERMISSIONS")
          );
        });

        it("should not be allowed to increment the 'AddressPermissions[]' key (length)", async () => {
          let key = ERC725YKeys.LSP6["AddressPermissions[]"];
          let value = ethers.utils.hexZeroPad(8, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlySetData).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(canOnlySetData.address, "ADDPERMISSIONS")
          );
        });

        it("should not be allowed to decrement the 'AddressPermissions[]' key (length)", async () => {
          let key = ERC725YKeys.LSP6["AddressPermissions[]"];
          let value = ethers.utils.hexZeroPad(4, 32);

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlySetData).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(canOnlySetData.address, "CHANGEPERMISSIONS")
          );
        });

        it("should not be allowed to edit AddressPermissions[4]", async () => {
          let randomWallet = new ethers.Wallet.createRandom();

          let key =
            ERC725YKeys.LSP6["AddressPermissions[]"].slice(0, 34) +
            "00000000000000000000000000000004";

          let value = randomWallet.address;

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [[key], [value]]
          );

          await expect(
            context.keyManager.connect(canOnlySetData).execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(canOnlySetData.address, "CHANGEPERMISSIONS")
          );
        });
      });

      /**
       *  @todo should test that an address with only the permission SETDATA
       * cannot add or edit permissions
       */
    });
  });

  describe("setting Allowed Addresses / Functions / etc... permissions", () => {
    beforeEach(async () => {
      context = await buildContext();

      let permissionKeys = [
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          context.owner.address.substring(2),
      ];

      let permissionValues = [ALL_PERMISSIONS_SET];

      await setupKeyManager(context, permissionKeys, permissionValues);
    });

    describe("when setting 1 x permission key for AllowedAddresses", () => {
      it("should pass when setting a valid abi-encoded array of address[] (= 12 x leading '00')", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedAddresses"] +
          newController.address.substr(2);

        let value = abiCoder.encode(
          ["address[]"],
          [
            [
              "0xcafecafecafecafecafecafecafecafecafecafe",
              "0xbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef",
            ],
          ]
        );

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await context.keyManager.connect(context.owner).execute(payload);

        // prettier-ignore
        const result = await context.universalProfile["getData(bytes32)"](key);
        expect(result).toEqual(value);
      });

      it("should fail when setting an invalid abi-encoded array of address[] (random bytes)", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedAddresses"] +
          newController.address.substr(2);

        let value = "0xbadbadbadbad";

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await expect(
          context.keyManager.connect(context.owner).execute(payload)
        ).toBeRevertedWith(
          "LSP6KeyManager: invalid ABI encoded array of addresses"
        );
      });

      it("should fail when setting an invalid abi-encoded array of address[] (not enough leading zero bytes for an address -> 10 x '00')", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedAddresses"] +
          newController.address.substr(2);

        let value =
          "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000cafecafecafecafecafecafecafecafecafecafecafe";

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await expect(
          context.keyManager.connect(context.owner).execute(payload)
        ).toBeRevertedWith(
          "LSP6KeyManager: invalid ABI encoded array of addresses"
        );
      });
    });

    describe("when setting 1 x permission key for AllowedFunctions", () => {
      it("should pass when setting an abi-encoded array of bytes4[] (= 28 leading zeros)", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedFunctions"] +
          newController.address.substr(2);

        let value = abiCoder.encode(
          ["bytes4[]"],
          [["0xcafecafe", "0xbeefbeef"]]
        );

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await context.keyManager.connect(context.owner).execute(payload);

        // prettier-ignore
        const result = await context.universalProfile["getData(bytes32)"](key);
        expect(result).toEqual(value);
      });

      it("should fail when setting an invalid abi-encoded array of bytes4[] (= random bytes)", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedFunctions"] +
          newController.address.substr(2);

        let value = "0xbadbadbadbad";

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await expect(
          context.keyManager.connect(context.owner).execute(payload)
        ).toBeRevertedWith(
          "LSP6KeyManager: invalid ABI encoded array of bytes4"
        );
      });

      it("should fail when setting an invalid abi-encoded array of bytes4[] (not enough leading zero bytes for a bytes4 value -> 26 x '00')", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedFunctions"] +
          newController.address.substr(2);

        let value =
          "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000cafecafecafe";

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await expect(
          context.keyManager.connect(context.owner).execute(payload)
        ).toBeRevertedWith(
          "LSP6KeyManager: invalid ABI encoded array of bytes4"
        );
      });
    });

    describe("when setting 1 x permission key for AllowedStandards", () => {
      it("should pass when setting an abi-encoded array bytes4[] (= 28 leading zeros)", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedStandards"] +
          newController.address.substr(2);

        let value = abiCoder.encode(
          ["bytes4[]"],
          [["0xcafecafe", "0xbeefbeef"]]
        );

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await context.keyManager.connect(context.owner).execute(payload);

        // prettier-ignore
        const result = await context.universalProfile["getData(bytes32)"](key);
        expect(result).toEqual(value);
      });

      it("should fail when setting an invalid abi-encoded array of bytes4[] (= random bytes)", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedStandards"] +
          newController.address.substr(2);

        let value = "0xbadbadbadbad";

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await expect(
          context.keyManager.connect(context.owner).execute(payload)
        ).toBeRevertedWith(
          "LSP6KeyManager: invalid ABI encoded array of bytes4"
        );
      });

      it("should fail when setting an invalid abi-encoded array of bytes4[] (not enough leading zero bytes for a bytes4 value -> 26 x '00')", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedStandards"] +
          newController.address.substr(2);

        let value =
          "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000cafecafecafe";

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await expect(
          context.keyManager.connect(context.owner).execute(payload)
        ).toBeRevertedWith(
          "LSP6KeyManager: invalid ABI encoded array of bytes4"
        );
      });
    });

    describe("when setting 1 x permission key for AllowedERC725YKeys", () => {
      it("should pass when setting an abi-encoded array of bytes32[]", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedERC725YKeys"] +
          newController.address.substr(2);

        let value = abiCoder.encode(
          ["bytes32[]"],
          [
            [
              "0xcafecafecafecafecafecafecafecafecafecafecafecafecafecafecafecafe",
              "0xbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef",
            ],
          ]
        );

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await context.keyManager.connect(context.owner).execute(payload);

        // prettier-ignore
        const result = await context.universalProfile["getData(bytes32)"](key);
        expect(result).toEqual(value);
      });

      it("should fail when setting an invalid abi-encoded array of bytes32[] (random bytes)", async () => {
        let newController = new ethers.Wallet.createRandom();

        let key =
          ERC725YKeys.LSP6["AddressPermissions:AllowedERC725YKeys"] +
          newController.address.substr(2);

        let value = "0xbadbadbadbad";

        let payload = context.universalProfile.interface.encodeFunctionData(
          "setData(bytes32[],bytes[])",
          [[key], [value]]
        );

        await expect(
          context.keyManager.connect(context.owner).execute(payload)
        ).toBeRevertedWith(
          "LSP6KeyManager: invalid ABI encoded array of bytes32"
        );
      });
    });
  });

  describe("setting mixed keys (SETDATA, CHANGE & ADD Permissions", () => {
    let canSetDataAndAddPermissions: SignerWithAddress,
      canSetDataAndChangePermissions: SignerWithAddress,
      canSetDataOnly: SignerWithAddress;
    // addresses being used to CHANGE (= edit) permissions
    let addressesToEditPermissions: [SignerWithAddress, SignerWithAddress];

    beforeEach(async () => {
      context = await buildContext();

      canSetDataAndAddPermissions = context.accounts[1];
      canSetDataAndChangePermissions = context.accounts[2];
      canSetDataOnly = context.accounts[3];

      addressesToEditPermissions = [context.accounts[4], context.accounts[5]];

      const permissionKeys = [
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          context.owner.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          canSetDataAndAddPermissions.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          canSetDataAndChangePermissions.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          canSetDataOnly.address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          addressesToEditPermissions[0].address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          addressesToEditPermissions[1].address.substring(2),
        ERC725YKeys.LSP6["AddressPermissions[]"],
      ];

      const permissionValues = [
        ALL_PERMISSIONS_SET,
        ethers.utils.hexZeroPad(
          PERMISSIONS.SETDATA + PERMISSIONS.ADDPERMISSIONS,
          32
        ),
        ethers.utils.hexZeroPad(
          PERMISSIONS.SETDATA + PERMISSIONS.CHANGEPERMISSIONS,
          32
        ),
        ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
        // placeholder permission
        ethers.utils.hexZeroPad(PERMISSIONS.TRANSFERVALUE, 32),
        ethers.utils.hexZeroPad(PERMISSIONS.TRANSFERVALUE, 32),
        // AddressPermissions[].length
        ethers.utils.hexZeroPad(6, 32),
      ];

      await setupKeyManager(context, permissionKeys, permissionValues);
    });

    describe("when setting multiple keys", () => {
      describe("when caller is an address with ALL PERMISSIONS", () => {
        it("(should pass): 2 x keys + add 2 x new permissions", async () => {
          let newControllerKeyOne = new ethers.Wallet.createRandom();
          let newControllerKeyTwo = new ethers.Wallet.createRandom();

          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyOne.address.substr(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyTwo.address.substr(2),
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await context.keyManager.connect(context.owner).execute(payload);

          // prettier-ignore
          const fetchedResult = await context.universalProfile["getData(bytes32[])"](keys);
          expect(fetchedResult).toEqual(values);
        });

        it("(should pass): 2 x keys + change 2 x existing permissions", async () => {
          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[0].address.substring(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[1].address.substring(2),
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await context.keyManager.connect(context.owner).execute(payload);

          // prettier-ignore
          const fetchedResult = await context.universalProfile["getData(bytes32[])"](keys);
          expect(fetchedResult).toEqual(values);
        });

        it("(should pass): 2 x keys + (add 1 x new permission) + (change 1 x existing permission)", async () => {
          let newControllerKeyOne = new ethers.Wallet.createRandom();

          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyOne.address.substring(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[0].address.substring(2),
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(PERMISSIONS.SIGN, 32),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await context.keyManager.connect(context.owner).execute(payload);

          // prettier-ignore
          const fetchedResult = await context.universalProfile["getData(bytes32[])"](keys);
          expect(fetchedResult).toEqual(values);
        });
      });

      describe("when caller is an address with permission SETDATA + ADDPERMISSIONS", () => {
        it("(should pass): 2 x keys + add 2 x new permissions + increment AddressPermissions[].length by +2", async () => {
          let newControllerKeyOne = new ethers.Wallet.createRandom();
          let newControllerKeyTwo = new ethers.Wallet.createRandom();

          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyOne.address.substr(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyTwo.address.substr(2),
            ERC725YKeys.LSP6["AddressPermissions[]"],
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
            ethers.utils.hexZeroPad(8, 32),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await context.keyManager
            .connect(canSetDataAndAddPermissions)
            .execute(payload);

          // prettier-ignore
          const fetchedResult = await context.universalProfile["getData(bytes32[])"](keys);
          expect(fetchedResult).toEqual(values);
        });

        it("(should fail): 2 x keys + add 2 x new permissions + decrement AddressPermissions[].length by -1", async () => {
          let newControllerKeyOne = new ethers.Wallet.createRandom();
          let newControllerKeyTwo = new ethers.Wallet.createRandom();

          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyOne.address.substr(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyTwo.address.substr(2),
            ERC725YKeys.LSP6["AddressPermissions[]"],
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
            ethers.utils.hexZeroPad(5, 32),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await expect(
            context.keyManager
              .connect(canSetDataAndAddPermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canSetDataAndAddPermissions.address,
              "CHANGEPERMISSIONS"
            )
          );
        });

        it("(should fail): 2 x keys + change 2 x existing permissions", async () => {
          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[0].address.substring(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[1].address.substring(2),
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await expect(
            context.keyManager
              .connect(canSetDataAndAddPermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canSetDataAndAddPermissions.address,
              "CHANGEPERMISSIONS"
            )
          );
        });

        it("(should fail): 2 x keys + (add 1 x new permission) + (change 1 x existing permission)", async () => {
          let newControllerKeyOne = new ethers.Wallet.createRandom();

          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyOne.address.substr(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[0].address.substr(2),
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(PERMISSIONS.SIGN, 32),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await expect(
            context.keyManager
              .connect(canSetDataAndAddPermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canSetDataAndAddPermissions.address,
              "CHANGEPERMISSIONS"
            )
          );
        });
      });

      describe("when caller is an address with permission SETDATA + CHANGEPERMISSIONS", () => {
        it("(should pass): 2 x keys + remove 2 x addresses with permissions + decrement AddressPermissions[].length by -2", async () => {
          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[0].address.substring(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[1].address.substring(2),
            ERC725YKeys.LSP6["AddressPermissions[]"],
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            ethers.utils.hexZeroPad(4, 32),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await context.keyManager
            .connect(canSetDataAndChangePermissions)
            .execute(payload);

          // prettier-ignore
          const fetchedResult = await context.universalProfile["getData(bytes32[])"](keys);
          expect(fetchedResult).toEqual(values);
        });

        it("(should pass): 2 x keys + change 2 x existing permissions", async () => {
          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[0].address.substring(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[1].address.substring(2),
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await context.keyManager
            .connect(canSetDataAndChangePermissions)
            .execute(payload);

          // prettier-ignore
          const fetchedResult = await context.universalProfile["getData(bytes32[])"](keys);
          expect(fetchedResult).toEqual(values);
        });

        it("(should fail): 2 x keys + add 2 x new permissions", async () => {
          let newControllerKeyOne = new ethers.Wallet.createRandom();
          let newControllerKeyTwo = new ethers.Wallet.createRandom();

          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyOne.address.substr(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyTwo.address.substr(2),
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
            ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await expect(
            context.keyManager
              .connect(canSetDataAndChangePermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canSetDataAndChangePermissions.address,
              "ADDPERMISSIONS"
            )
          );
        });

        it("{should fail): 2 x keys + increment AddressPermissions[].length by +1", async () => {
          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions[]"],
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(7, 32),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await expect(
            context.keyManager
              .connect(canSetDataAndChangePermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canSetDataAndChangePermissions.address,
              "ADDPERMISSIONS"
            )
          );
        });

        it("(should fail): 2 x keys + (add 1 x new permission) + (change 1 x existing permission)", async () => {
          let newControllerKeyOne = new ethers.Wallet.createRandom();

          let keys = [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("My First Key")),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("My SecondKey Key")
            ),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              newControllerKeyOne.address.substr(2),
            ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
              addressesToEditPermissions[0].address.substr(2),
          ];

          let values = [
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My First Value")),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("My Second Value")),
            ethers.utils.hexZeroPad(PERMISSIONS.SIGN, 32),
            ethers.utils.hexZeroPad(
              PERMISSIONS.SETDATA + PERMISSIONS.TRANSFERVALUE,
              32
            ),
          ];

          let payload = context.universalProfile.interface.encodeFunctionData(
            "setData(bytes32[],bytes[])",
            [keys, values]
          );

          await expect(
            context.keyManager
              .connect(canSetDataAndAddPermissions)
              .execute(payload)
          ).toBeRevertedWith(
            NotAuthorisedError(
              canSetDataAndAddPermissions.address,
              "CHANGEPERMISSIONS"
            )
          );
        });
      });
    });
  });
};
