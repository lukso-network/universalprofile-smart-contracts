// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

// modules
import "./UniversalReceiverDelegateCore.sol";

/**
 * @title Proxy Implementation of contract writing the received LSP7 and LSP8 assets into your ERC725Account using 
 *        the LSP5-ReceivedAsset standard and removing the sent assets.
 *
 * @author Yamen Merhi <YamenMerhi>
 * @dev Delegate contract of the initial universal receiver
 */
contract UniversalReceiverDelegateInit is Initializable, UniversalReceiverDelegateCore {
    
    function initialize() public initializer {
        _registerInterface(_LSP1_DELEGATE_INTERFACE_ID);
    }
}