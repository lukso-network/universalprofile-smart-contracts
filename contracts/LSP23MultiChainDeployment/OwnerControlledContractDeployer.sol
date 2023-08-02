// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IPostDeploymentModule} from "./IPostDeploymentModule.sol";

error InvalidValueSum();
error ControlledContractProxyInitFailureError(bytes errorData);
error OwnerProxyInitFailureError(bytes errorData);

contract OwnerControlledContractDeployer {
    struct ControlledContractDeployment {
        uint256 value;
        bytes creationBytecode;
    }

    struct OwnerContractDeployment {
        uint256 value;
        bytes creationBytecode;
        bool addControlledContractAddress; // will append the controlled contract address to the constructor params if true + the extraConstructorParams
        bytes extraConstructorParams; // params to be appended to the bytecode after the controlled contract address
    }

    struct ControlledContractDeploymentInit {
        uint256 value;
        address implementationContract;
        bytes initializationCalldata;
    }

    struct OwnerContractDeploymentInit {
        uint256 value;
        address implementationContract;
        bool addControlledContractAddress; // will append the controlled contract address to the initialisation calldata if true as well as the extraInitializationParams
        bytes initializationCalldata;
        bytes extraInitializationParams; // params to be appended to the initialisation calldata after the controlled contract address
    }

    event DeployedContracts(
        address indexed controlledContract,
        address indexed ownerContract,
        bytes32 salt,
        ControlledContractDeployment controlledContractDeployment,
        OwnerContractDeployment ownerContractDeployment,
        address postDeploymentModule,
        bytes postDeploymentModuleCalldata
    );

    event DeployedERC1167Proxies(
        address indexed controlledContract,
        address indexed ownerContract,
        bytes32 salt,
        ControlledContractDeploymentInit controlledContractDeploymentInit,
        OwnerContractDeploymentInit ownerContractDeploymentInit,
        address postDeploymentModuleCalldata,
        bytes calldataToPostDeploymentModule
    );

    function deployContracts(
        bytes32 salt,
        address postDeploymentModule,
        bytes calldata postDeploymentModuleCalldata,
        ControlledContractDeployment calldata controlledContractDeployment,
        OwnerContractDeployment calldata ownerContractDeployment
    )
        public
        payable
        returns (
            address controlledContractAddress,
            address ownerContractAddress
        )
    {
        // check that the msg.value is equal to the sum of the values of the controlled and owner contracts
        if (
            msg.value !=
            controlledContractDeployment.value + ownerContractDeployment.value
        ) {
            revert InvalidValueSum();
        }

        /* generate salt for the controlled contract
         *  the salt is generated by hashing the following elements:
         *   - the salt
         *   - the owner contract bytecode
         *   - the owner addControlledContractAddress boolean
         *   - the owner extraConstructorParams
         *   - the postDeploymentModule address
         *   - the postDeploymentModuleCalldata
         *
         */
        bytes32 controlledContractGeneratedSalt = keccak256(
            abi.encode(
                salt,
                ownerContractDeployment.creationBytecode,
                ownerContractDeployment.addControlledContractAddress,
                ownerContractDeployment.extraConstructorParams,
                postDeploymentModule,
                postDeploymentModuleCalldata
            )
        );

        // deploy the controlled contract
        controlledContractAddress = Create2.deploy(
            controlledContractDeployment.value,
            controlledContractGeneratedSalt,
            controlledContractDeployment.creationBytecode
        );

        // if addControlledContractAddress is true, the controlled contract address + extraConstructorParams will be appended to the constructor params
        bytes memory ownerByteCode;
        if (ownerContractDeployment.addControlledContractAddress) {
            ownerByteCode = abi.encodePacked(
                ownerContractDeployment.creationBytecode,
                abi.encode(controlledContractAddress),
                ownerContractDeployment.extraConstructorParams
            );
        } else {
            ownerByteCode = ownerContractDeployment.creationBytecode;
        }

        // here owner refers as the future owner of the controlled contract at the end of the transaction
        ownerContractAddress = Create2.deploy(
            ownerContractDeployment.value,
            keccak256(abi.encodePacked(controlledContractAddress)),
            ownerByteCode
        );

        emit DeployedContracts(
            controlledContractAddress,
            ownerContractAddress,
            salt,
            controlledContractDeployment,
            ownerContractDeployment,
            postDeploymentModule,
            postDeploymentModuleCalldata
        );

        // execute the post deployment module logic in the postDeploymentModule
        IPostDeploymentModule(postDeploymentModule).executePostDeployment(
            controlledContractAddress,
            ownerContractAddress,
            postDeploymentModuleCalldata
        );
    }

    function deployERC1167Proxies(
        bytes32 salt,
        address postDeploymentModule,
        bytes calldata calldataToPostDeploymentModule,
        ControlledContractDeploymentInit
            calldata controlledContractDeploymentInit,
        OwnerContractDeploymentInit calldata ownerContractDeploymentInit
    )
        public
        payable
        returns (
            address controlledContractAddress,
            address ownerContractAddress
        )
    {
        // check that the msg.value is equal to the sum of the values of the controlled and owner contracts
        if (
            msg.value !=
            controlledContractDeploymentInit.value +
                ownerContractDeploymentInit.value
        ) {
            revert InvalidValueSum();
        }

        /* generate the salt for the controlled contract
         *  the salt is generated by hashing the following elements:
         *   - the salt
         *   - the owner implementation contract address
         *   - the owner contract addControlledContractAddress boolean
         *   - the owner contract initialization calldata
         *   - the owner contract extra initialization params (if any)
         *   - the postDeploymentModule address
         *   - the callda to the post deployment module
         *
         */
        bytes32 controlledContractGeneratedSalt = keccak256(
            abi.encode(
                salt,
                ownerContractDeploymentInit.implementationContract,
                ownerContractDeploymentInit.addControlledContractAddress,
                ownerContractDeploymentInit.initializationCalldata,
                ownerContractDeploymentInit.extraInitializationParams,
                postDeploymentModule,
                calldataToPostDeploymentModule
            )
        );

        // deploy the controlled contract proxy with the controlledContractGeneratedSalt
        controlledContractAddress = _deployAndInitializeControlledContractProxy(
            controlledContractDeploymentInit.implementationContract,
            controlledContractGeneratedSalt,
            controlledContractDeploymentInit.initializationCalldata
        );

        // deploy the owner contract proxy
        ownerContractAddress = _deployAndInitializeOwnerControlledProxy(
            ownerContractDeploymentInit.implementationContract,
            controlledContractAddress,
            ownerContractDeploymentInit.addControlledContractAddress,
            ownerContractDeploymentInit.initializationCalldata,
            ownerContractDeploymentInit.extraInitializationParams
        );

        emit DeployedERC1167Proxies(
            controlledContractAddress,
            ownerContractAddress,
            salt,
            controlledContractDeploymentInit,
            ownerContractDeploymentInit,
            postDeploymentModule,
            calldataToPostDeploymentModule
        );

        // execute the post deployment logic in the postDeploymentModule
        IPostDeploymentModule(postDeploymentModule).executePostDeployment(
            controlledContractAddress,
            ownerContractAddress,
            calldataToPostDeploymentModule
        );
    }

    function computeAddresses(
        bytes32 salt,
        bytes32 controlledContractByteCodeHash,
        bytes memory ownerByteCode,
        bool ownerAddControlledContractAddress,
        bytes memory ownerExtraConstructorParams,
        address postDeploymentModule,
        bytes memory calldataToPostDeploymentModule
    )
        public
        view
        returns (
            address controlledContractAddress,
            address ownerContractAddress
        )
    {
        bytes32 controlledContractGeneratedSalt = keccak256(
            abi.encode(
                salt,
                controlledContractByteCodeHash,
                ownerByteCode,
                ownerAddControlledContractAddress,
                ownerExtraConstructorParams,
                postDeploymentModule,
                calldataToPostDeploymentModule
            )
        );

        controlledContractAddress = Create2.computeAddress(
            controlledContractGeneratedSalt,
            controlledContractByteCodeHash
        );

        bytes memory ownerByteCodeWithAllParams;
        if (ownerAddControlledContractAddress) {
            ownerByteCodeWithAllParams = abi.encodePacked(
                ownerByteCode,
                abi.encode(controlledContractAddress),
                ownerExtraConstructorParams
            );
        } else {
            ownerByteCodeWithAllParams = ownerByteCode;
        }

        ownerContractAddress = Create2.computeAddress(
            keccak256(abi.encodePacked(controlledContractAddress)),
            keccak256(ownerByteCodeWithAllParams)
        );
    }

    function computeERC1167Addresses(
        bytes32 salt,
        address controlledContractImplementation,
        address ownerContractImplementation,
        address postDeploymentModule,
        bool ownerAddControlledContractAddress,
        bytes memory ownerInitializationCalldata,
        bytes memory ownerExtraInitializationParams,
        bytes memory calldataToPostDeploymentModule
    )
        public
        view
        returns (
            address controlledContractAddress,
            address ownerContractAddress
        )
    {
        bytes32 controlledContractGeneratedSalt = keccak256(
            abi.encode(
                salt,
                ownerContractImplementation,
                ownerAddControlledContractAddress,
                ownerInitializationCalldata,
                ownerExtraInitializationParams,
                postDeploymentModule,
                calldataToPostDeploymentModule
            )
        );

        controlledContractAddress = Clones.predictDeterministicAddress(
            controlledContractImplementation,
            controlledContractGeneratedSalt
        );

        ownerContractAddress = Clones.predictDeterministicAddress(
            ownerContractImplementation,
            keccak256(abi.encodePacked(controlledContractAddress))
        );
    }

    function _deployAndInitializeControlledContractProxy(
        address implementationContract,
        bytes32 generatedSalt,
        bytes calldata initializationCalldata
    ) internal returns (address controlledContractAddress) {
        // deploy the controlled contract proxy with the controlledContractGeneratedSalt
        controlledContractAddress = Clones.cloneDeterministic(
            implementationContract,
            generatedSalt
        );

        // initialize the controlled contract proxy
        (bool success, bytes memory returnedData) = controlledContractAddress
            .call{value: msg.value}(initializationCalldata);
        if (!success) {
            revert ControlledContractProxyInitFailureError(returnedData);
        }
    }

    function _deployAndInitializeOwnerControlledProxy(
        address implementationContract,
        address controlledContractAddress,
        bool addControlledContractAddress,
        bytes calldata initializationCalldata,
        bytes calldata extraInitializationParams
    ) internal returns (address ownerContractAddress) {
        // deploy the controlled contract proxy with the controlledContractGeneratedSalt
        ownerContractAddress = Clones.cloneDeterministic(
            implementationContract,
            keccak256(abi.encodePacked(controlledContractAddress))
        );

        // if addControlledContractAddress is true, the controlled contract address + extraInitialisationBytes will be appended to the initializationCalldata
        bytes memory ownerInitializationBytes;
        if (addControlledContractAddress) {
            ownerInitializationBytes = abi.encodePacked(
                initializationCalldata,
                abi.encode(controlledContractAddress),
                extraInitializationParams
            );
        } else {
            ownerInitializationBytes = initializationCalldata;
        }

        // initialize the controlled contract proxy
        (bool success, bytes memory returnedData) = ownerContractAddress.call{
            value: msg.value
        }(ownerInitializationBytes);
        if (!success) {
            revert OwnerProxyInitFailureError(returnedData);
        }
    }
}
