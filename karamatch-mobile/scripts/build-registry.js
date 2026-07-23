// Generates a shadcn-CLI-compatible registry (https://ui.shadcn.com/schema/registry-item.json)
// from the component shelf in src/, so it can be installed elsewhere with
// `npx shadcn@latest add <hosted-url>/r/<name>.json` — see README.md.
//
// Plain Node/CommonJS on purpose: this repo has no TS script runner (ts-node
// etc.) installed, and adding one just for this would be more than this one
// script needs. The `typescript` package (already a devDependency) is used
// directly for import parsing, which is more reliable than a regex.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "r");

// Every file below becomes one registry item. `type` follows shadcn's
// registry-item schema enum (registry:ui, registry:component, registry:lib,
// registry:theme, ...). Component directories are scanned wholesale;
// individual support files are listed explicitly since there's no single
// directory that's *only* shared infrastructure.
const COMPONENT_DIRS = [
    { dir: "src/components/primitives", type: "registry:ui" },
    { dir: "src/components/domain", type: "registry:component" },
    { dir: "src/components/scaffolding", type: "registry:component" }
];

const SUPPORT_FILES = [
    { file: "src/theme/colors.ts", type: "registry:theme" },
    { file: "src/theme/tokens.ts", type: "registry:theme" },
    { file: "src/theme/ThemeProvider.tsx", type: "registry:lib" },
    { file: "src/icons/Icon.tsx", type: "registry:ui" },
    { file: "src/icons/StarIcon.tsx", type: "registry:ui" },
    { file: "src/icons/types.ts", type: "registry:lib" },
    { file: "src/types.ts", type: "registry:lib" },
    { file: "src/utils/avatar.ts", type: "registry:lib" },
    { file: "src/utils/format.ts", type: "registry:lib" },
    { file: "src/utils/hooks.ts", type: "registry:lib" }
];

// react/react-native/expo are assumed already present in any consumer RN
// project, so they're not worth listing as registry `dependencies`.
const BASE_PACKAGES = new Set(["react", "react-native", "expo"]);

// shadcn CLI resolves a bare `registryDependencies` name (e.g. "button")
// against the *default* ui.shadcn.com registry, not this one — cross-item
// deps only resolve correctly when namespaced (see
// https://ui.shadcn.com/docs/registry/namespace), which also requires
// consumers to add `"registries": { "@karamatch": "<host>/r/{name}.json" }`
// to their components.json. Documented in README.md.
const NAMESPACE = "@karamatch";

function toSlug(baseName) {
    return baseName
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
}

function listComponentFiles(relDir) {
    const absDir = path.join(ROOT, relDir);
    return fs
        .readdirSync(absDir)
        .filter(name => name.endsWith(".tsx") && !name.endsWith(".stories.tsx"))
        .map(name => path.join(relDir, name));
}

function collectSourceFiles() {
    const files = COMPONENT_DIRS.flatMap(({ dir, type }) => listComponentFiles(dir).map(file => ({ file, type })));
    for (const support of SUPPORT_FILES) {
        files.push(support);
    }
    return files;
}

function packageNameOf(specifier) {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function parseImportSpecifiers(sourceText, absPath) {
    const sourceFile = ts.createSourceFile(
        absPath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        absPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const specifiers = [];
    sourceFile.forEachChild(node => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            specifiers.push(node.moduleSpecifier.text);
        }
    });
    return specifiers;
}

function resolveRelativeImport(fromAbsFile, specifier, filesByAbsPathNoExt) {
    // Map keys are stored without extension (see buildItems), matching how
    // these specifiers are written (no `.tsx`/`.ts` suffix), so no
    // extension needs adding back on here.
    const resolved = path.resolve(path.dirname(fromAbsFile), specifier);
    return filesByAbsPathNoExt.get(resolved) ?? null;
}

function buildItems() {
    const sourceFiles = collectSourceFiles();

    const rawItems = sourceFiles.map(({ file, type }) => {
        const absPath = path.join(ROOT, file);
        const baseName = path.basename(file).replace(/\.tsx?$/, "");
        const relDir = path.relative("src", path.dirname(file));
        return {
            baseSlug: toSlug(baseName),
            relDir,
            title: baseName,
            type,
            file,
            absPath,
            content: fs.readFileSync(absPath, "utf8")
        };
    });

    // Different directories can share a basename (icons/types.ts vs.
    // types.ts) — collapsing both to the same slug would make one
    // silently clobber the other's output file. Whichever sits directly
    // in src/ keeps the bare slug; everything else colliding gets
    // directory-qualified.
    const countByBaseSlug = new Map();
    for (const item of rawItems) {
        countByBaseSlug.set(item.baseSlug, (countByBaseSlug.get(item.baseSlug) ?? 0) + 1);
    }

    // Absolute path (no extension) -> item, so relative imports between
    // scanned files resolve to a registryDependency instead of a dangling
    // reference.
    const byAbsPath = new Map();
    const items = rawItems.map(raw => {
        const collides = countByBaseSlug.get(raw.baseSlug) > 1;
        const name = collides && raw.relDir !== "" ? `${toSlug(raw.relDir.split(path.sep).join("-"))}-${raw.baseSlug}` : raw.baseSlug;
        const item = { name, title: raw.title, type: raw.type, file: raw.file, absPath: raw.absPath, content: raw.content };
        byAbsPath.set(raw.absPath.replace(/\.tsx?$/, ""), item);
        return item;
    });

    for (const item of items) {
        const specifiers = parseImportSpecifiers(item.content, item.absPath);
        const registryDeps = new Set();
        const npmDeps = new Set();

        for (const specifier of specifiers) {
            if (specifier.startsWith(".")) {
                const match = resolveRelativeImport(item.absPath, specifier, byAbsPath);
                if (match) {
                    registryDeps.add(`${NAMESPACE}/${match.name}`);
                } else {
                    console.warn(`[build-registry] ${item.file}: unresolved local import "${specifier}" has no registry item`);
                }
            } else {
                const pkg = packageNameOf(specifier);
                if (!BASE_PACKAGES.has(pkg)) {
                    npmDeps.add(pkg);
                }
            }
        }

        item.registryDependencies = [...registryDeps].sort();
        item.dependencies = [...npmDeps].sort();
    }

    return items;
}

function writeRegistry(items) {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const item of items) {
        const registryItem = {
            $schema: "https://ui.shadcn.com/schema/registry-item.json",
            name: item.name,
            type: item.type,
            title: item.title,
            ...(item.dependencies.length ? { dependencies: item.dependencies } : {}),
            ...(item.registryDependencies.length ? { registryDependencies: item.registryDependencies } : {}),
            files: [{ path: item.file, type: item.type, target: item.file, content: item.content }]
        };
        fs.writeFileSync(path.join(OUT_DIR, `${item.name}.json`), JSON.stringify(registryItem, null, 2) + "\n");
    }

    const index = {
        $schema: "https://ui.shadcn.com/schema/registry.json",
        name: "karamatch-mobile",
        homepage: "https://github.com/similonap/karamatch",
        items: items.map(item => ({
            name: item.name,
            type: item.type,
            title: item.title,
            files: [{ path: item.file, type: item.type }]
        }))
    };
    fs.writeFileSync(path.join(OUT_DIR, "registry.json"), JSON.stringify(index, null, 2) + "\n");

    console.log(`[build-registry] wrote ${items.length} items + registry.json to ${path.relative(ROOT, OUT_DIR)}/`);
}

writeRegistry(buildItems());
