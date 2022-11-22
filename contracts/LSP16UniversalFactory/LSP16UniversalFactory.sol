// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// libraries
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

// errors

/**
 * @dev reverts with this error when there is no revert reason bubbled up by the target contract when initializing
 */
error CannotInitializeContract();

/**
 * @dev reverts when msg.value sent to {deployCreate2Init} function is not equal to the sum of the
 * `initializeCalldataMsgValue` and `constructorMsgValue`
 */
error InvalidMsgValueDistribution();

/**
 * @dev reverts when not passing any initializeCalldata to the {deployCreate2Init} function
 */
error InitializeCalldataRequired();

/**
 * @dev reverts when sending value to the {deployCreate2Proxy} function if the contract being created
 * is an uninitializable clone.
 */
error ValueNotAllowedWithNonInitializableProxies();

/**
 * @dev UniversalFactory contract can be used to deploy CREATE2 contracts; normal contracts and minimal
 * proxies (EIP-1167) with the ability to deploy the same contract at the same address on different chains.
 * If the contract has a constructor, the arguments will be part of the byteCode
 * If the contract has an `initialize` function, the parameters of this function will be included in
 * the salt to ensure that the parameters of the contract should be the same on each chain.
 *
 * This contract should be deployed using Nick's Method.
 * More information: https://weka.medium.com/how-to-send-ether-to-11-440-people-187e332566b7
 */
contract LSP16UniversalFactory {
    /**
     * @dev Emitted whenever a contract is created
     * @param contractCreated The address of the contract created
     * @param providedSalt The bytes32 salt provided by the deployer
     * @param initializable The Boolean that specifies if the contract is a initializable or not
     * @param initializeCalldata The bytes provided as initializeCalldata
     */
    event ContractCreated(
        address contractCreated,
        bytes32 providedSalt,
        bool initializable,
        bytes initializeCalldata
    );

    /**
     * @dev Returns the address where a contract will be stored if deployed via `CREATE2`. The address is
     * constructed using the parameters below. Any change in one of them will result in a new destination address.
     */
    function calculateAddress(
        bytes32 byteCodeHash,
        bytes32 providedSalt,
        bytes calldata initializeCallData
    ) public view returns (address) {
        bytes32 generatedSalt = _generateSalt(initializeCallData, providedSalt);
        return Create2.computeAddress(generatedSalt, byteCodeHash);
    }

    /**
     * @dev Returns the address of an EIP1167 proxy contract. The address is constructed using
     *  the parameters below. Any change in one of them will result in a new destination address.
     */
    function calculateProxyAddress(
        address baseContract,
        bytes32 providedSalt,
        bytes calldata initializeCallData
    ) public view returns (address) {
        bytes32 generatedSalt = _generateSalt(initializeCallData, providedSalt);
        return Clones.predictDeterministicAddress(baseContract, generatedSalt);
    }

    /**
     * @dev Deploys a contract using `CREATE2`. The address where the contract will be deployed
     * can be known in advance via {calculateAddress}. The salt is a combination between an initializable
     * boolean, false in this case, and the providedSalt.
     *
     * This method allow users to have the same contracts at the same address across different
     * chains with the same parameters.
     *
     * Using the same `byteCode` and salt multiple time will revert, since
     * the contract cannot be deployed twice at the same address.
     */
    function deployCreate2(bytes calldata byteCode, bytes32 providedSalt)
        public
        payable
        returns (address contractCreated)
    {
        bytes32 generatedSalt = _generateSalt("", providedSalt);
        contractCreated = Create2.deploy(msg.value, generatedSalt, byteCode);
        emit ContractCreated(contractCreated, providedSalt, false, "");
    }

    /**
     * @dev Deploys a contract using `CREATE2`. The address where the contract will be deployed
     * can be known in advance via {calculateAddress}. The salt is a combination between an initializable
     * boolean, true in this case, `providedSalt` and the `initializeCallData`. This method allow users
     * to have the same contracts at the same address across different chains with the same parameters.
     *
     * The msg.value is split according to the parameters of the function
     *
     * The initialize calldata MUST NOT be empty
     * The msg.value sent to this contract MUST be the sum of the two parameters: `constructorMsgValue`
     * and `initializeCalldataMsgValue`
     *
     * Using the same `byteCode` and salt multiple time will revert, since
     * the contract cannot be deployed twice at the same address.
     */
    function deployCreate2Init(
        bytes calldata byteCode,
        bytes32 providedSalt,
        bytes calldata initializeCalldata,
        uint256 constructorMsgValue,
        uint256 initializeCalldataMsgValue
    ) public payable returns (address contractCreated) {
        if (initializeCalldata.length == 0) revert InitializeCalldataRequired();
        if (constructorMsgValue + initializeCalldataMsgValue != msg.value)
            revert InvalidMsgValueDistribution();

        bytes32 generatedSalt = _generateSalt(initializeCalldata, providedSalt);
        contractCreated = Create2.deploy(constructorMsgValue, generatedSalt, byteCode);
        emit ContractCreated(contractCreated, providedSalt, true, initializeCalldata);

        (bool success, bytes memory returndata) = contractCreated.call{
            value: initializeCalldataMsgValue
        }(initializeCalldata);
        _verifyCallResult(success, returndata);
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behaviour of `baseContract`.
     * The address where the contract will be deployed can be known in advance via {calculateProxyAddress}.
     *
     * This function uses the CREATE2 opcode and a salt to deterministically deploy
     * the clone. The salt is a combination between an initializable boolean, `providedSalt`
     * and the `initializeCallData` if the contract is initializable. This method allow users
     * to have the same contracts at the same address across different chains with the same parameters.
     *
     * Using the same `baseContract` and salt multiple time will revert, since
     * the clones cannot be deployed twice at the same address.
     */
    function deployCreate2Proxy(
        address baseContract,
        bytes32 providedSalt,
        bytes calldata initializeCalldata
    ) public payable returns (address proxy) {
        bool initializable = initializeCalldata.length > 0;
        bytes32 generatedSalt = _generateSalt(initializeCalldata, providedSalt);

        proxy = Clones.cloneDeterministic(baseContract, generatedSalt);
        emit ContractCreated(proxy, providedSalt, initializable, initializeCalldata);

        if (!initializable) {
            if (msg.value > 0) revert ValueNotAllowedWithNonInitializableProxies();
        } else {
            (bool success, bytes memory returndata) = proxy.call{value: msg.value}(
                initializeCalldata
            );
            _verifyCallResult(success, returndata);
        }
    }

    /**
     * @dev Calculates the salt used to deploy the contract by hashing (Keccak256) the following parameters
     * as packed encoded respectively: an initializable boolean, the initializeCallData if and only if
     * the contract is initializable, and the salt provided by the deployer.
     *
     * The initializable boolean was added before the provided arguments as if it was not used,
     * and we are deploying proxies on another chain, people can use the `deployCreate2(..)` function
     * to deploy the same bytecode + the same salt to get the same address of the contract on
     * another chain without applying the effect of initializing.
     */
    function _generateSalt(bytes memory initializeCallData, bytes32 providedSalt)
        internal
        pure
        returns (bytes32)
    {
        bool initializable = initializeCallData.length != 0;
        if (initializable) {
            return keccak256(abi.encodePacked(initializable, initializeCallData, providedSalt));
        } else {
            return keccak256(abi.encodePacked(initializable, providedSalt));
        }
    }

    /**
     * @dev Verifies that the contract created was initialized correctly
     * Bubble the revert reason if present, revert with `CannotInitializeContract` otherwise
     */
    function _verifyCallResult(bool success, bytes memory returndata) internal pure {
        if (!success) {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly
                // solhint-disable
                /// @solidity memory-safe-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert CannotInitializeContract();
            }
        }
    }
}
