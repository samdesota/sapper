'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var path__default = _interopDefault(path);
var fs = require('fs');
var create_manifest_data = require('./create_manifest_data.js');
var fs_utils = require('./fs_utils.js');

function inject_resources(build_json_file, asset_dir) {
    const file_contents = fs.readFileSync(build_json_file, 'utf8');
    const build = JSON.parse(file_contents);
    const deps = {};
    for (const [key, value] of Object.entries(build.dependencies)) {
        deps[key] = value.filter(dep => dep.endsWith('.css'));
    }
    fs.readdirSync(asset_dir).forEach(file => {
        const file_path = path.resolve(asset_dir, file);
        if (!file.endsWith('.js') || fs.statSync(file_path).isDirectory())
            return;
        const source = fs.readFileSync(file_path, 'utf-8');
        const replaced = source.replace(/(\\?["'])__SAPPER_CSS_PLACEHOLDER:([^"']+?)__\1/g, (m, quotes, route) => {
            const route_deps = process.env.SAPPER_LEGACY_BUILD && deps[route] ?
                deps[route].map(_ => `legacy/${_}`) :
                deps[route];
            let replacement = JSON.stringify(route_deps || []);
            // If the quotation marks are escaped, then
            // the source code is in a string literal
            // (e.g., source maps) rather than raw
            // JavaScript source. We need to stringify
            // again and then remove the extra quotation
            // marks so that replacement is correct.
            if (quotes[0] === '\\') {
                replacement = JSON.stringify(replacement);
                replacement = replacement.substring(1, replacement.length - 1);
            }
            return replacement;
        });
        fs.writeFileSync(file_path, replaced);
    });
}

function validate_bundler(bundler) {
    if (!bundler) {
        bundler = (fs.existsSync('rollup.config.js') || fs.existsSync('rollup.config.ts') ? 'rollup' :
            fs.existsSync('webpack.config.js') || fs.existsSync('webpack.config.ts') ? 'webpack' : null);
        if (!bundler) {
            // TODO remove in a future version
            deprecate_dir('rollup');
            deprecate_dir('webpack');
            throw new Error(`Could not find a configuration file for rollup or webpack`);
        }
    }
    if (bundler !== 'rollup' && bundler !== 'webpack') {
        throw new Error(`'${bundler}' is not a valid option for --bundler — must be either 'rollup' or 'webpack'`);
    }
    return bundler;
}
function deprecate_dir(bundler) {
    try {
        const stats = fs.statSync(bundler);
        if (!stats.isDirectory())
            return;
    }
    catch (err) {
        // do nothing
        return;
    }
    // TODO link to docs, once those docs exist
    throw new Error(`As of Sapper 0.21, build configuration should be placed in a single ${bundler}.config.js file`);
}

function copy_shimport(dest) {
    fs.writeFileSync(`${dest}/client/shimport@${create_manifest_data.version}.js`, fs.readFileSync(require.resolve('shimport/index.js')));
}

const runtime = [
    'index.d.ts',
    'app.mjs',
    'server.mjs',
    'internal/shared.mjs',
    'internal/layout.svelte',
    'internal/error.svelte'
].map(file => ({
    file,
    source: fs.readFileSync(path.join(__dirname, `../runtime/${file}`), 'utf-8')
}));
function copy_runtime(output) {
    runtime.forEach(({ file, source }) => {
        fs_utils.mkdirp(path.dirname(`${output}/${file}`));
        fs.writeFileSync(`${output}/${file}`, source);
    });
}

exports.copy_runtime = copy_runtime;
exports.copy_shimport = copy_shimport;
exports.inject_resources = inject_resources;
exports.validate_bundler = validate_bundler;
//# sourceMappingURL=copy_runtime.js.map
