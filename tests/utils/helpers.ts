import { BigNumber, BytesLike } from "ethers";
import { ethers } from "hardhat";

export const abiCoder = ethers.utils.defaultAbiCoder;
export const provider = ethers.provider;

export const AddressOffset = "000000000000000000000000";
export const EMPTY_PAYLOAD = "0x";

export const LSP1_HOOK_PLACEHOLDER =
  "0xffffffffffffffff0000000000000000aaaaaaaaaaaaaaaa1111111111111111";

/**
 * Private keys for the accounts used in the tests.
 * These are the private keys for the accounts generated by the hardhat node (local blockchain).
 * The private keys are used to sign messages with lsp6-signers.js library.
 *
 * WARNING! These private keys and their related accounts are publicly known and should never be used in production.
 *          Any funds sent to them on Mainnet or any other live network WILL BE LOST.
 */
export const LOCAL_PRIVATE_KEYS = {
  ACCOUNT0:
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  ACCOUNT1:
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  ACCOUNT2:
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  ACCOUNT3:
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  ACCOUNT4:
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  ACCOUNT5:
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  ACCOUNT6:
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
};

// bytes32 arraylength

export const ARRAY_LENGTH = {
  ZERO: "0x0000000000000000000000000000000000000000000000000000000000000000",
  ONE: "0x0000000000000000000000000000000000000000000000000000000000000001",
  TWO: "0x0000000000000000000000000000000000000000000000000000000000000002",
  THREE: "0x0000000000000000000000000000000000000000000000000000000000000003",
  FOUR: "0x0000000000000000000000000000000000000000000000000000000000000004",
  FIVE: "0x0000000000000000000000000000000000000000000000000000000000000005",
  SIX: "0x0000000000000000000000000000000000000000000000000000000000000006",
  SEVEN: "0x0000000000000000000000000000000000000000000000000000000000000007",
  EIGHT: "0x0000000000000000000000000000000000000000000000000000000000000008",
};

// Random Token Id
export const TOKEN_ID = {
  ONE: "0xad7c5bef027816a800da1736444fb58a807ef4c9603b7848673f7e3a68eb14a5",
  TWO: "0xd4d1a59767271eefdc7830a772b9732a11d503531d972ab8c981a6b1c0e666e5",
  THREE: "0x3672b35640006da199633c5c75015da83589c4fb84ef8276b18076529e3d3196",
  FOUR: "0x80a6c6138772c2d7c710a3d49f4eea603028994b7e390f670dd68566005417f0",
  FIVE: "0x5c6f8b1aed769a328dad1ae15220e93730cdd52cb12817ae5fd8c15023d660d3",
  SIX: "0x65ce3c3668a850c4f9fce91762a3fb886380399f02a9eb1495055234e7c0287a",
  SEVEN: "0x00121ee2bd9802ce88a413ac1851c8afe6fe7474fb5d1b7da4475151b013da53",
  EIGHT: "0x367f9d97f8dd1bece61f8b74c5db7616958147682674fd32de73490bd6347f60",
};

export function getRandomAddresses(count: Number): string[] {
  let addresses: string[] = [];
  for (let ii = 0; ii < count; ii++) {
    // addresses stored under ERC725Y storage have always lowercases character.
    // therefore, disable the checksum by converting to lowercase to avoid failing tests
    let randomAddress = ethers.Wallet.createRandom().address.toLowerCase();
    addresses.push(randomAddress);
  }

  return addresses;
}

export function generateKeysAndValues(_elementObject) {
  let keys: string[] = [];
  let values: string[] = [];
  for (const [_key, _value] of Object.entries(_elementObject)) {
    let key = ethers.utils.toUtf8Bytes(_key);
    let value = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(_value as string)
    );

    keys.push(ethers.utils.keccak256(key));
    values.push(value);
  }

  return [keys, values];
}

export function getRandomString() {
  const value =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randoms = [];
  for (let i = 0; i < 32; i++) {
    randoms.push(value[Math.floor(Math.random() * value.length)]);
  }
  return randoms.join("");
}

export async function getMapAndArrayKeyValues(
  account,
  vaultMapKey: string,
  arrayKey: string,
  elementInArray: string
) {
  // prettier-ignore
  let [mapValue, arrayLength, elementAddress] = await account["getData(bytes32[])"](
        [
            vaultMapKey, 
            arrayKey, 
            elementInArray
        ]
    );

  return [mapValue, arrayLength, elementAddress];
}

export function combinePermissions(..._permissions: string[]) {
  let result: BigNumber = ethers.BigNumber.from(0);

  _permissions.forEach((permission) => {
    let permissionAsBN = ethers.BigNumber.from(permission);
    result = result.add(permissionAsBN);
  });

  return ethers.utils.hexZeroPad(result.toHexString(), 32);
}

export function encodeCompactedBytes(inputKeys: BytesLike[]) {
  let compactBytesArray = "0x";
  for (let i = 0; i < inputKeys.length; i++) {
    compactBytesArray +=
      ethers.utils
        .hexlify([inputKeys[i].toString().substring(2).length / 2])
        .substring(2) + inputKeys[i].toString().substring(2);
  }
  return compactBytesArray;
}

export function decodeCompactBytes(compactBytesArray: BytesLike) {
  let pointer: number = 2;
  let keysToExport: BytesLike[] = [];
  while (pointer < compactBytesArray.length) {
    const length = ethers.BigNumber.from(
      "0x" + compactBytesArray.toString().substring(pointer, pointer + 2)
    ).toNumber();

    keysToExport.push(
      "0x" +
        compactBytesArray
          .toString()
          .substring(pointer + 2, pointer + 2 * (length + 1))
    );

    pointer += 2 * (length + 1);
  }
  return keysToExport;
}
