export const isMatchingType = (type: string, matchType: string): boolean => {
  const [major, sub] = type.split('/');
  const [matchMajor, matchSub] = matchType.split('/');
  return (major === '*' || major === matchMajor) && (sub === '*' || sub === matchSub);
};
