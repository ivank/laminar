import { ansiRegex } from '../src/helpers';

describe('Helper Tests', () => {
  it.each`
    text
    ${'foo\u001B[4mcake\u001B[0m'}
    ${'\u001B[4mcake\u001B[0m'}
    ${'\u001B[0m\u001B[4m\u001B[42m\u001B[31mfoo\u001B[39m\u001B[49m\u001B[24mfoo\u001B[0m'}
    ${'foo\u001B[mfoo'}
  `('Test %s matches %s', async ({ text }) => {
    expect(text).toMatch(ansiRegex);
  });
});
