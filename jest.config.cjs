// module.exports = {
//   testEnvironment: 'jsdom',
//   testEnvironmentOptions: {},   // évite le "reading 'html'"
//   testMatch: ['**/src/__tests__/**/*.js']
// };
console.log("ok")
module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {},
  testMatch: ['**/src/__tests__/**/*.js'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.cjs'],
  transform: { '^.+\\.js$': 'babel-jest' }
};