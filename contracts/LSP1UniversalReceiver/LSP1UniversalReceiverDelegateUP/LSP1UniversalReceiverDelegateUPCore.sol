// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

import "./Handling/TokenAndVaultHandling.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";

import "../ILSP1UniversalReceiverDelegate.sol";

/**
 * @title Core Implementation of contract writing the received Vaults and LSP7, LSP8 assets into your ERC725Account using
 *        the LSP5-ReceivedAsset and LSP10-ReceivedVaults standard and removing the sent vaults and assets.
 *
 * @author Fabian Vogelsteller, Yamen Merhi, Jean Cavallera
 * @dev Delegate contract of the initial universal receiver
 */
abstract contract LSP1UniversalReceiverDelegateUPCore is
    ILSP1UniversalReceiverDelegate,
    ERC165Storage,
    TokenAndVaultHandlingContract
{
    /**
     * @dev allows to register arrayKeys and Map of incoming vaults and assets and remove them on balance = 0
     * @param sender token/vault address
     * @param typeId token/vault hooks
     * @param data concatenated data about token/vault transfer
     * @return result the return value of keyManager's execute function
     */
    function universalReceiverDelegate(
        address sender,
        bytes32 typeId,
        bytes memory data
    ) public override returns (bytes memory result) {
        if (
            typeId == _LSP7TOKENSSENDER_TYPE_ID ||
            typeId == _LSP7TOKENSRECIPIENT_TYPE_ID ||
            typeId == _LSP8TOKENSSENDER_TYPE_ID ||
            typeId == _LSP8TOKENSRECIPIENT_TYPE_ID ||
            typeId == _LSP9_VAULT_SENDER_TYPE_ID_ ||
            typeId == _LSP9_VAULT_RECEPIENT_TYPE_ID_
        ) {
            result = _tokenAndVaultHandling(sender, typeId, data);
        }

        /* @TODO
          else if() {
            result = FollowerHandling(sender, typeId, data);
            }
        */
    }
}
