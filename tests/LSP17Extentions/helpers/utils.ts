import { ethers } from 'hardhat';
import { Create2Factory } from './Create2Factory';
import { EntryPoint__factory, EntryPoint } from '@account-abstraction/contracts';

export const AddressZero = ethers.constants.AddressZero;

export function callDataCost(data: string): number {
  return ethers.utils
    .arrayify(data)
    .map((x) => (x === 0 ? 4 : 16))
    .reduce((sum, x) => sum + x);
}

export async function deployEntryPoint(provider = ethers.provider): Promise<EntryPoint> {
  const create2factory = new Create2Factory(provider);
  const addr = await create2factory.deploy(
    EntryPoint__factory.bytecode,
    0,
    process.env.COVERAGE != null ? 20e6 : 8e6,
  );
  return EntryPoint__factory.connect(addr, provider.getSigner());
}

export async function getBalance(address: string): Promise<number> {
  const balance = await ethers.provider.getBalance(address);
  return parseInt(balance.toString());
}

export async function isDeployed(addr: string): Promise<boolean> {
  const code = await ethers.provider.getCode(addr);
  return code.length > 2;
}

const panicCodes: { [key: number]: string } = {
  // from https://docs.soliditylang.org/en/v0.8.0/control-structures.html
  0x01: 'assert(false)',
  0x11: 'arithmetic overflow/underflow',
  0x12: 'divide by zero',
  0x21: 'invalid enum value',
  0x22: 'storage byte array that is incorrectly encoded',
  0x31: '.pop() on an empty array.',
  0x32: 'array sout-of-bounds or negative index',
  0x41: 'memory overflow',
  0x51: 'zero-initialized variable of internal function type',
};

// rethrow "cleaned up" exception.
// - stack trace goes back to method (or catch) line, not inner provider
// - attempt to parse revert data (needed for geth)
// use with ".catch(rethrow())", so that current source file/line is meaningful.
export function rethrow(): (e: Error) => void {
  const callerStack = new Error()
    .stack!.replace(/Error.*\n.*at.*\n/, '')
    .replace(/.*at.* \(internal[\s\S]*/, '');

  if (arguments[0] != null) {
    throw new Error('must use .catch(rethrow()), and NOT .catch(rethrow)');
  }
  return function (e: Error) {
    const solstack = e.stack!.match(/((?:.* at .*\.sol.*\n)+)/);
    const stack = (solstack != null ? solstack[1] : '') + callerStack;
    // const regex = new RegExp('error=.*"data":"(.*?)"').compile()
    const found = /error=.*?"data":"(.*?)"/.exec(e.message);
    let message: string;
    if (found != null) {
      const data = found[1];
      message = decodeRevertReason(data) ?? e.message + ' - ' + data.slice(0, 100);
    } else {
      message = e.message;
    }
    const err = new Error(message);
    err.stack = 'Error: ' + message + '\n' + stack;
    throw err;
  };
}

export function decodeRevertReason(data: string, nullIfNoMatch = true): string | null {
  const methodSig = data.slice(0, 10);
  const dataParams = '0x' + data.slice(10);

  if (methodSig === '0x08c379a0') {
    const [err] = ethers.utils.defaultAbiCoder.decode(['string'], dataParams);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `Error(${err})`;
  } else if (methodSig === '0x00fa072b') {
    const [opindex, paymaster, msg] = ethers.utils.defaultAbiCoder.decode(
      ['uint256', 'address', 'string'],
      dataParams,
    );
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `FailedOp(${opindex}, ${paymaster !== AddressZero ? paymaster : 'none'}, ${msg})`;
  } else if (methodSig === '0x4e487b71') {
    const [code] = ethers.utils.defaultAbiCoder.decode(['uint256'], dataParams);
    return `Panic(${panicCodes[code] ?? code} + ')`;
  }
  if (!nullIfNoMatch) {
    return data;
  }
  return null;
}
