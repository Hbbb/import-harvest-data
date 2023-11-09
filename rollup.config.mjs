import { babel } from '@rollup/plugin-babel'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import fs from 'fs'

const secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf-8'))
const extensions = ['.ts', '.js']

const preventTreeShakingPlugin = () => {
	return {
		name: 'no-treeshaking',
		resolveId(id, importer) {
			if (!importer) {
				// let's not treeshake entry points, as we're not exporting anything in App Scripts
				return { id, moduleSideEffects: 'no-treeshake' }
			}
			return null
		},
	}
}

export default {
	input: './src/index.ts',
	output: {
		dir: 'build',
		format: 'cjs',
	},
	plugins: [
		preventTreeShakingPlugin(),
		replace({
			'process.env.HARVEST_ACCESS_TOKEN': JSON.stringify(
				secrets.HARVEST_ACCESS_TOKEN,
			),
			'process.env.HARVEST_ACCOUNT_ID': JSON.stringify(
				secrets.HARVEST_ACCOUNT_ID,
			),
			preventAssignment: true, // This option prevents replacing assignment to the keys
		}),
		nodeResolve({
			extensions,
			mainFields: ['jsnext:main', 'main'],
		}),
		babel({ extensions, babelHelpers: 'runtime' }),
	],
}
