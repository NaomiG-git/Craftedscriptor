import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'build-html-to-docx-umd.js',
  output: {
    file: 'html-to-docx.umd.js',
    format: 'umd',
    name: 'htmlToDocx'
  },
  plugins: [resolve()]
};