import { JWTInternalError } from './JWTInternalError';

export const certToPEM = (cert: string): string => {
  const formatted = cert.match(/.{1,64}/g);
  if (!formatted) {
    throw new JWTInternalError('Cannot parse cert, not the correct format');
  }
  return `-----BEGIN CERTIFICATE-----\n${formatted.join('\n')}\n-----END CERTIFICATE-----\n`;
};

const prepadSigned = (hexStr: string): string => {
  const msb = hexStr[0];
  if (msb < '0' || msb > '7') {
    return `00${hexStr}`;
  }
  return hexStr;
};

const toHex = (number: number): string => {
  const nstr = number.toString(16);
  return nstr.length % 2 ? `0${nstr}` : nstr;
};

const encodeLengthHex = (n: number): string => {
  if (n <= 127) {
    return toHex(n);
  }
  const nHex = toHex(n);
  const lengthOfLengthByte = 128 + nHex.length / 2;
  return toHex(lengthOfLengthByte) + nHex;
};

/*
 * Source: http://stackoverflow.com/questions/18835132/xml-to-pem-in-node-js
 */
export const rsaPublicKeyToPEM = (modulusB64: string, exponentB64: string): string => {
  const modulus = Buffer.from(modulusB64, 'base64');
  const exponent = Buffer.from(exponentB64, 'base64');
  const modulusHex = prepadSigned(modulus.toString('hex'));
  const exponentHex = prepadSigned(exponent.toString('hex'));
  const modlen = modulusHex.length / 2;
  const explen = exponentHex.length / 2;

  const encodedModlen = encodeLengthHex(modlen);
  const encodedExplen = encodeLengthHex(explen);
  const encoded = encodeLengthHex(
    modlen + explen + encodedModlen.length / 2 + encodedExplen.length / 2 + 2,
  );
  const encodedPubkey = `30${encoded}02${encodedModlen}${modulusHex}02${encodedExplen}${exponentHex}`;

  const der = Buffer.from(encodedPubkey, 'hex').toString('base64');
  /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
  const formatted = der.match(/.{1,64}/g)!.join('\n');

  return `-----BEGIN RSA PUBLIC KEY-----\n${formatted}\n-----END RSA PUBLIC KEY-----\n`;
};
