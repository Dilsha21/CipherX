// Jest only. The source is native ES modules (served as-is by Vite); Jest
// runs CommonJS, so tests need just the module syntax converted.
module.exports = {
  env: {
    test: {
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  },
};
