import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
  ],
  declaration: true,
  clean: true,
  replace: {
    'import.meta.vitest': 'false',
  },
  rollup: {
    emitCJS: true,
  },
})
