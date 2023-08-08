// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface ILinkedContractsFactory {
    event DeployedContracts(
        address indexed primaryContract,
        address indexed secondaryContract,
        PrimaryContractDeployment primaryContractDeployment,
        SecondaryContractDeployment secondaryContractDeployment,
        address postDeploymentModule,
        bytes postDeploymentModuleCalldata
    );

    event DeployedERC1167Proxies(
        address indexed primaryContract,
        address indexed secondaryContract,
        PrimaryContractDeploymentInit primaryContractDeploymentInit,
        SecondaryContractDeploymentInit secondaryContractDeploymentInit,
        address postDeploymentModule,
        bytes postDeploymentModuleCalldata
    );

    /**
     * @param salt A unique value used to ensure each created proxies are unique. (Can be used to deploy the contract at a desired address.)
     * @param fundingAmount The value to be sent with the deployment transaction.
     * @param creationBytecode The bytecode of the contract with the constructor params.
     */
    struct PrimaryContractDeployment {
        bytes32 salt;
        uint256 fundingAmount;
        bytes creationBytecode;
    }

    /**
     * @param fundingAmount The value to be sent with the deployment transaction.
     * @param creationBytecode The constructor + runtime bytecode (without the primary contract's address as param)
     * @param addPrimaryContractAddress If set to `true`, this will append the primary contract's address + the `extraConstructorParams` to the `creationBytecode`.
     * @param extraConstructorParams Params to be appended to the `creationBytecode` (after the primary contract address) if `addPrimaryContractAddress` is set to `true`.
     */
    struct SecondaryContractDeployment {
        uint256 fundingAmount;
        bytes creationBytecode;
        bool addPrimaryContractAddress;
        bytes extraConstructorParams;
    }

    /**
     * @param salt A unique value used to ensure each created proxies are unique. (Can be used to deploy the contract at a desired address.)
     * @param fundingAmount The value to be sent with the deployment transaction.
     * @param implementationContract The address of the contract that will be used as a base contract for the proxy.
     * @param initializationCalldata The calldata used to initialise the contract. (initialization should be similar to a constructor in a normal contract.)
     */
    struct PrimaryContractDeploymentInit {
        bytes32 salt;
        uint256 fundingAmount;
        address implementationContract;
        bytes initializationCalldata;
    }

    /**
     * @param fundingAmount The value to be sent with the deployment transaction.
     * @param implementationContract The address of the contract that will be used as a base contract for the proxy.
     * @param initializationCalldata The first part of the initialisation calldata, everything before the primary contract address.
     * @param addPrimaryContractAddress If set to `true`, this will append the primary contract's address + the `extraInitializationParams` to the `initializationCalldata`.
     * @param extraInitializationParams Params to be appended to the `initializationCalldata` (after the primary contract address) if `addPrimaryContractAddress` is set to `true`
     */
    struct SecondaryContractDeploymentInit {
        uint256 fundingAmount;
        address implementationContract;
        bytes initializationCalldata;
        bool addPrimaryContractAddress;
        bytes extraInitializationParams;
    }

    /**
     * @dev Deploys a primary and a secondary linked contract.
     * @notice Contracts deployed. Contract Address: `primaryContractAddress`. Primary Contract Address: `primaryContractAddress`
     *
     * @param primaryContractDeployment Contains the needed parameter to deploy a contract. (`salt`, `fundingAmount`, `creationBytecode`)
     * @param secondaryContractDeployment Contains the needed parameter to deploy the secondary contract. (`fundingAmount`, `creationBytecode`, `addPrimaryContractAddress`, `extraConstructorParams`)
     * @param postDeploymentModule The module to be executed after deployment
     * @param postDeploymentModuleCalldata The data to be passed to the post deployment module
     *
     * @return primaryContractAddress The address of the primary contract.
     * @return secondaryContractAddress The address of the secondary contract.
     */
    function deployContracts(
        PrimaryContractDeployment calldata primaryContractDeployment,
        SecondaryContractDeployment calldata secondaryContractDeployment,
        address postDeploymentModule,
        bytes calldata postDeploymentModuleCalldata
    )
        external
        payable
        returns (
            address primaryContractAddress,
            address secondaryContractAddress
        );

    /**
     * @dev Deploys proxies of a primary contract and a secondary linked contract
     * @notice Contract proxies deployed. Primary Proxy Address: `primaryContractAddress`. Secondary Contract Proxy Address: `secondaryContractAddress`
     *
     * @param primaryContractDeploymentInit Contains the needed parameters to deploy a proxy contract. (`salt`, `fundingAmount`, `implementationContract`, `initializationCalldata`)
     * @param secondaryContractDeploymentInit Contains the needed parameters to deploy the secondary proxy contract. (`fundingAmount`, `implementationContract`, `addPrimaryContractAddress`, `initializationCalldata`, `extraInitializationParams`)
     * @param postDeploymentModule The module to be executed after deployment.
     * @param postDeploymentModuleCalldata The data to be passed to the post deployment module.
     *
     * @return primaryContractAddress The address of the deployed primary contract proxy
     * @return secondaryContractAddress The address of the deployed secondary contract proxy
     */
    function deployERC1167Proxies(
        PrimaryContractDeploymentInit calldata primaryContractDeploymentInit,
        SecondaryContractDeploymentInit
            calldata secondaryContractDeploymentInit,
        address postDeploymentModule,
        bytes calldata postDeploymentModuleCalldata
    )
        external
        payable
        returns (
            address primaryContractAddress,
            address secondaryContractAddress
        );

    /**
     * @dev Computes the addresses of a primary contract and a secondary linked contract
     *
     * @param primaryContractDeployment Contains the needed parameter to deploy the primary contract. (`salt`, `fundingAmount`, `creationBytecode`)
     * @param secondaryContractDeployment Contains the needed parameter to deploy the secondary contract. (`fundingAmount`, `creationBytecode`, `addPrimaryContractAddress`, `extraConstructorParams`)
     * @param postDeploymentModule The module to be executed after deployment
     * @param postDeploymentModuleCalldata The data to be passed to the post deployment module
     *
     * @return primaryContractAddress The address of the deployed primary contract.
     * @return secondaryContractAddress The address of the deployed secondary contract.
     */
    function computeAddresses(
        PrimaryContractDeployment calldata primaryContractDeployment,
        SecondaryContractDeployment calldata secondaryContractDeployment,
        address postDeploymentModule,
        bytes calldata postDeploymentModuleCalldata
    )
        external
        view
        returns (
            address primaryContractAddress,
            address secondaryContractAddress
        );

    /**
     * @dev Computes the addresses of a primary and a secondary linked contracts proxies to be created
     *
     * @param primaryContractDeploymentInit Contains the needed parameters to deploy a primary proxy contract. (`salt`, `fundingAmount`, `implementationContract`, `initializationCalldata`)
     * @param secondaryContractDeploymentInit Contains the needed parameters to deploy the secondary proxy contract. (`fundingAmount`, `implementationContract`, `addPrimaryContractAddress`, `initializationCalldata`, `extraInitializationParams`)
     * @param postDeploymentModule The module to be executed after deployment.
     * @param postDeploymentModuleCalldata The data to be passed to the post deployment module.
     *
     * @return primaryContractAddress The address of the deployed primary contract proxy
     * @return secondaryContractAddress The address of the deployed secondary contract proxy
     */
    function computeERC1167Addresses(
        PrimaryContractDeploymentInit calldata primaryContractDeploymentInit,
        SecondaryContractDeploymentInit
            calldata secondaryContractDeploymentInit,
        address postDeploymentModule,
        bytes calldata postDeploymentModuleCalldata
    )
        external
        view
        returns (
            address primaryContractAddress,
            address secondaryContractAddress
        );
}
