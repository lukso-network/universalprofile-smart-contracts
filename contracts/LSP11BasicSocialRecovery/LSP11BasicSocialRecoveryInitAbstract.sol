// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// modules
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./LSP11BasicSocialRecoveryCore.sol";

/**
 * @title Inheritable Proxy Implementation of LSP11-BasicSocialRecovery standard
 * @author Fabian Vogelsteller, Yamen Merhi, Jean Cavallera
 * @notice Recovers the permission of a key to control an ERC725 contract through LSP6KeyManager
 */
contract LSP11BasicSocialRecoveryInitAbstract is Initializable, LSP11BasicSocialRecoveryCore {
    function _initialize(address _account) internal virtual onlyInitializing {
        account = ERC725(_account);
        OwnableUnset._setOwner(_account);
    }
}
