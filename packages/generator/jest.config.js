const base = require('../../jest.config.base');
const packageJson = require('./package');

module.exports = {
  ...base,
  roots: [...base.roots, '<rootDir>/test'],
  name: packageJson.name,
  displayName: packageJson.name,
};