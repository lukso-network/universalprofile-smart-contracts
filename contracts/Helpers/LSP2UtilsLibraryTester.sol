// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {LSP2Utils} from "../LSP2ERC725YJSONSchema/LSP2Utils.sol";

contract LSP2UtilsLibraryTester {
    using LSP2Utils for *;

    function isEncodedArray(bytes memory _data) public pure returns (bool) {
        return _data.isEncodedArray();
    }
}
