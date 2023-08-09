import { ethers } from 'hardhat';
import { expect } from 'chai';

import { LinkedContractsFactory } from '../../typechain-types';
import { ERC725YDataKeys } from '../../constants';
import { calculateProxiesAddresses } from './helpers';

describe('UniversalProfileDeployer', function () {
  it('should deploy proxies for Universal Profile and Key Manager', async function () {
    const [allPermissionsSigner, universalReceiver, recoverySigner] = await ethers.getSigners();

    const KeyManagerInitFactory = await ethers.getContractFactory('LSP6KeyManagerInit');
    const keyManagerInit = await KeyManagerInitFactory.deploy();

    const UniversalProfileInitFactory = await ethers.getContractFactory('UniversalProfileInit');
    const universalProfileInit = await UniversalProfileInitFactory.deploy();

    const LinkedContractsFactoryFactory = await ethers.getContractFactory('LinkedContractsFactory');

    const LinkedContractsFactory = await LinkedContractsFactoryFactory.deploy();

    const UPDelegatorPostDeploymentManagerFactory = await ethers.getContractFactory(
      'UniversalProfileInitPostDeploymentModule',
    );

    const upPostDeploymentModule = await UPDelegatorPostDeploymentManagerFactory.deploy();

    const salt = ethers.utils.randomBytes(32);

    const primaryContractDeploymentInit: LinkedContractsFactory.PrimaryContractDeploymentInitStruct =
      {
        salt,
        fundingAmount: 0,
        implementationContract: universalProfileInit.address,
        initializationCalldata: universalProfileInit.interface.encodeFunctionData('initialize', [
          upPostDeploymentModule.address,
        ]),
      };

    const secondaryContractDeploymentInit: LinkedContractsFactory.SecondaryContractDeploymentInitStruct =
      {
        fundingAmount: 0,
        implementationContract: keyManagerInit.address,
        addPrimaryContractAddress: true,
        initializationCalldata: '0xc4d66de8',
        extraInitializationParams: '0x',
      };

    const allPermissionsSignerPermissionsKey =
      '0x4b80742de2bf82acb3630000' + allPermissionsSigner.address.slice(2);

    const universalReceiverPermissionsKey =
      '0x4b80742de2bf82acb3630000' + universalReceiver.address.slice(2);

    const recoveryAddressPermissionsKey =
      '0x4b80742de2bf82acb3630000' + recoverySigner.address.slice(2);

    const allPermissionsSignerPermissionsValue =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const create16BytesUint = (value: number) => {
      return ethers.utils.hexZeroPad(ethers.utils.hexlify(value), 16).slice(2);
    };

    const types = ['bytes32[]', 'bytes[]'];

    const encodedBytes = ethers.utils.defaultAbiCoder.encode(types, [
      [
        ERC725YDataKeys.LSP3.LSP3Profile, // LSP3Metadata
        ERC725YDataKeys.LSP1.LSP1UniversalReceiverDelegate, // URD Address
        universalReceiverPermissionsKey, // URD Permissions
        recoveryAddressPermissionsKey, // Recovery Address permissions
        allPermissionsSignerPermissionsKey, // Signers permissions
        ERC725YDataKeys.LSP6['AddressPermissions[]'].length, // Number of address with permissions
        ERC725YDataKeys.LSP6['AddressPermissions[]'].index + create16BytesUint(0), // Index of the first address
        ERC725YDataKeys.LSP6['AddressPermissions[]'].index + create16BytesUint(1), // Index of the second address
        ERC725YDataKeys.LSP6['AddressPermissions[]'].index + create16BytesUint(2), // Index of the third address
      ],
      [
        ethers.utils.randomBytes(32), // LSP3Metadata
        universalReceiver.address, // URD Address
        allPermissionsSignerPermissionsValue, // URD Permissions
        allPermissionsSignerPermissionsValue, // Recovery Address permissions
        allPermissionsSignerPermissionsValue, // Signers permissions
        ethers.utils.defaultAbiCoder.encode(['uint256'], [3]), // Address Permissions array length
        universalReceiver.address,
        recoverySigner.address,
        allPermissionsSigner.address,
      ],
    ]);

    // get the address of the UP and the KeyManager contracts
    const [upAddress, keyManagerAddress] =
      await LinkedContractsFactory.callStatic.deployERC1167Proxies(
        primaryContractDeploymentInit,
        secondaryContractDeploymentInit,
        upPostDeploymentModule.address,
        encodedBytes,
      );

    await LinkedContractsFactory.deployERC1167Proxies(
      primaryContractDeploymentInit,
      secondaryContractDeploymentInit,
      upPostDeploymentModule.address,
      encodedBytes,
    );

    const upProxy = UniversalProfileInitFactory.attach(upAddress);
    const keyManagerProxy = KeyManagerInitFactory.attach(keyManagerAddress);

    const upProxyOwner = await upProxy.owner();
    const keyManagerProxyOwner = await keyManagerProxy.target();

    const [expectedUpProxyAddress, expectedKeyManagerProxyAddress] =
      await LinkedContractsFactory.computeERC1167Addresses(
        primaryContractDeploymentInit,
        secondaryContractDeploymentInit,
        upPostDeploymentModule.address,
        encodedBytes,
      );

    const [calculatedUpProxyAddress, calculatedKMProxyAddress] = await calculateProxiesAddresses(
      primaryContractDeploymentInit.salt,
      primaryContractDeploymentInit.implementationContract,
      secondaryContractDeploymentInit.implementationContract,
      secondaryContractDeploymentInit.initializationCalldata,
      secondaryContractDeploymentInit.addPrimaryContractAddress,
      secondaryContractDeploymentInit.extraInitializationParams,
      upPostDeploymentModule.address,
      encodedBytes,
      LinkedContractsFactory.address,
    );

    expect(upAddress).to.equal(expectedUpProxyAddress);
    expect(upAddress).to.equal(expectedUpProxyAddress);
    expect(upAddress).to.equal(calculatedUpProxyAddress);

    expect(keyManagerAddress).to.equal(expectedKeyManagerProxyAddress);
    expect(keyManagerAddress).to.equal(expectedKeyManagerProxyAddress);
    expect(keyManagerAddress).to.equal(calculatedKMProxyAddress);

    expect(upProxyOwner).to.equal(keyManagerProxy.address);
    expect(upProxyOwner).to.equal(keyManagerProxy.address);
    expect(keyManagerProxyOwner).to.equal(upProxy.address);
    expect(keyManagerProxyOwner).to.equal(upProxy.address);
  });
});
