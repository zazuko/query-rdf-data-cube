import copy from 'rollup-plugin-copy'
import pkg from './package.json';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'es',
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    copy({
      targets: [
        { src: 'src/sparqljs.d.ts', dest: 'dist/node' },
        { src: 'src/sparqljs.d.ts', dest: 'dist/es' },
      ]
    }),
    typescript({
      objectHashIgnoreUnknownHack: true,
      typescript: require('typescript'),
    })
  ],
};
