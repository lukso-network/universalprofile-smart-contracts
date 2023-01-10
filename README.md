# LSP Smart Contracts &middot; [![npm version](https://img.shields.io/npm/v/@lukso/lsp-smart-contracts.svg?style=flat)](https://www.npmjs.com/package/@lukso/lsp-smart-contracts) [![Coverage Status](https://coveralls.io/repos/github/lukso-network/lsp-smart-contracts/badge.svg?branch=develop)](https://coveralls.io/github/lukso-network/lsp-smart-contracts?branch=develop)

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

The smart contracts reference implementation of the [LUKSO Standard Proposals (LSPs)](https://github.com/lukso-network/LIPs/tree/main/LSPs).

For more information see [Documentation](https://docs.lukso.tech/standards/smart-contracts/introduction) on _[docs.lukso.tech](https://docs.lukso.tech/standards/introduction)._

| :warning: | _This package is currently in early stages of development,<br/> use for testing or experimentation purposes only._ |
| :-------: | :----------------------------------------------------------------------------------------------------------------- |

## **Overview**

### Installation

#### npm

LSP smart contracts are available as a [npm package](https://www.npmjs.com/package/@lukso/lsp-smart-contracts).

```bash
npm install @lukso/lsp-smart-contracts
```

#### cloning the repository

Alternatively you can also clone the repository and install its dependencies to start using the smart contracts.

```bash
$ git clone https://github.com/lukso-network/lsp-smart-contracts.git
$ cd ./lsp-smart-contracts
$ npm install
```

## Usage

#### in Javascript

You can use the contracts JSON ABI by importing them as follow:

```javascript
import LSP0ERC725Account from "@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json";

const myContract = new web3.eth.Contract(
  LSP0ERC725Account.abi,
  "",
  defaultOptions
);
```

#### in Solidity

```sol
import "@lukso/lsp-smart-contracts/contracts/LSP0ERC725Account/LSP0ERC725Account.sol";

contract MyAccount is LSP0ERC725Account {
  constructor(address _newOwner) LSP0ERC725Account(_newOwner) {}
}

```

### Testing

Chai contract tests are defined under the tests directory. To run all the tests, run:

```bash
$ npm test
```

### Deployment via hardhat

You can find more infos on how to deploy the contracts via hardhat in the [DEPLOYMENT](./DEPLOYMENT.md) page.

### Available Constants

You can access interface IDs and other constants, using the [`constants.js` file](https://github.com/lukso-network/lsp-smart-contracts/blob/main/constants.js) file from the [lsp-smart-contracts package](https://www.npmjs.com/package/@lukso/lsp-smart-contracts).

```js
const {
  INTERFACE_IDS,
  ERC1271,
  OPERATIONS,
  SupportedStandards,
  ERC725YDataKeys,
  BasicUPSetup_Schema,
  PERMISSIONS,
  ALL_PERMISSIONS,
  Errors,
  EventSignatures,
} = require("@lukso/lsp-smart-contracts/constants.js");
```

It also includes constant values [Array data keys](https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-2-ERC725YJSONSchema.md#Array) to retrieve both the array length and for index access.

```js
'LSP5ReceivedAssets[]': {
    length: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
    index: '0x6460ee3c0aac563ccbf76d6e1d07bada',
},
```

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CJ42"><img src="https://avatars.githubusercontent.com/u/31145285?v=4?s=50" width="50px;" alt="Jean Cvllr"/><br /><sub><b>Jean Cvllr</b></sub></a><br /><a href="https://github.com/Fabian Vogelsteller/lsp-smart-contracts/commits?author=CJ42" title="Code">💻</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="7">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
