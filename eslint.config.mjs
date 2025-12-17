import next from 'eslint-config-next';

const config = [
  ...next,
  {
    ignores: ['wordpress-proxy/worker-configuration.d.ts'],
  },
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

export default config;
