import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engineRoot = resolve(projectRoot, "engine");
const manifestSchemaVersion = 1;
const expectedAbiVersion = 3;
const expectedModelVersion = 3;
const wasmMagic = Buffer.from([0x00, 0x61, 0x73, 0x6d]);

function fail(message) {
  throw new Error(message);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function collectRustSources(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await collectRustSources(path)));
    } else if (entry.isFile() && entry.name.endsWith(".rs")) {
      paths.push(path);
    }
  }
  return paths;
}

async function engineSourcePaths() {
  const required = [
    resolve(engineRoot, "Cargo.toml"),
    resolve(engineRoot, "Cargo.lock"),
    resolve(engineRoot, "ENGINE_ABI.md"),
  ];
  for (const path of required) {
    if (!(await exists(path))) fail(`Missing engine source input: ${path}`);
  }
  const rustSources = await collectRustSources(resolve(engineRoot, "src"));
  if (rustSources.length === 0) fail("engine/src contains no Rust source files");
  return [...required, ...rustSources].sort();
}

async function sourceDigest() {
  const digest = createHash("sha256");
  for (const path of await engineSourcePaths()) {
    const logicalPath = relative(projectRoot, path).replaceAll("\\", "/");
    digest.update(logicalPath, "utf8");
    digest.update(Buffer.from([0]));
    digest.update(await readFile(path));
    digest.update(Buffer.from([0]));
  }
  return digest.digest("hex");
}

function bytesDigest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertWasmBytes(bytes, label) {
  if (bytes.length < wasmMagic.length || !bytes.subarray(0, 4).equals(wasmMagic)) {
    fail(`${label} is not a WebAssembly binary`);
  }
}

async function inspectModule(bytes, label) {
  assertWasmBytes(bytes, label);
  const wasmModule = await WebAssembly.compile(bytes);
  const imports = WebAssembly.Module.imports(wasmModule);
  if (imports.length !== 0) {
    fail(`${label} must have zero imports; found ${imports.length}`);
  }
  const { exports } = await WebAssembly.instantiate(wasmModule, {});
  if (!(exports.memory instanceof WebAssembly.Memory)) {
    fail(`${label} must export linear memory`);
  }
  if (typeof exports.ms_abi_version !== "function") {
    fail(`${label} is missing ms_abi_version`);
  }
  if (typeof exports.ms_model_version !== "function") {
    fail(`${label} is missing ms_model_version`);
  }
  const abiVersion = exports.ms_abi_version();
  const modelVersion = exports.ms_model_version();
  if (abiVersion !== expectedAbiVersion || modelVersion !== expectedModelVersion) {
    fail(
      `${label} reports ABI/model ${abiVersion}/${modelVersion}; expected ${expectedAbiVersion}/${expectedModelVersion}`,
    );
  }
}

function stableManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = resolve(
    dirname(path),
    `.${basename(path)}.${process.pid}.tmp`,
  );
  try {
    await writeFile(temporary, bytes);
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

async function publish(builtPath, publicPath, manifestPath) {
  const bytes = await readFile(builtPath);
  await inspectModule(bytes, builtPath);
  const manifest = {
    schemaVersion: manifestSchemaVersion,
    abiVersion: expectedAbiVersion,
    modelVersion: expectedModelVersion,
    sourceSha256: await sourceDigest(),
    wasmSha256: bytesDigest(bytes),
    wasmBytes: bytes.length,
  };
  await atomicWrite(publicPath, bytes);
  await atomicWrite(manifestPath, stableManifest(manifest));
  console.log(
    `Published ${relative(projectRoot, publicPath)} (${manifest.wasmBytes} bytes, ${manifest.wasmSha256})`,
  );
}

async function readManifest(path) {
  let value;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`Cannot read engine manifest ${path}: ${error.message}`);
  }
  const keys = [
    "schemaVersion",
    "abiVersion",
    "modelVersion",
    "sourceSha256",
    "wasmSha256",
    "wasmBytes",
  ];
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join("\n") !== keys.sort().join("\n")
  ) {
    fail(`${path} does not match the engine manifest schema`);
  }
  if (
    value.schemaVersion !== manifestSchemaVersion ||
    value.abiVersion !== expectedAbiVersion ||
    value.modelVersion !== expectedModelVersion ||
    !/^[a-f0-9]{64}$/.test(value.sourceSha256) ||
    !/^[a-f0-9]{64}$/.test(value.wasmSha256) ||
    !Number.isSafeInteger(value.wasmBytes) ||
    value.wasmBytes <= 0
  ) {
    fail(`${path} contains invalid engine manifest values`);
  }
  return value;
}

async function verify(publicPath, manifestPath, packagedPath, packagedManifestPath) {
  const manifest = await readManifest(manifestPath);
  const actualSourceDigest = await sourceDigest();
  if (manifest.sourceSha256 !== actualSourceDigest) {
    fail(
      `Engine source/artifact skew: manifest has ${manifest.sourceSha256}, source is ${actualSourceDigest}. Run npm run engine:build.`,
    );
  }

  const bytes = await readFile(publicPath).catch((error) =>
    fail(`Cannot read engine artifact ${publicPath}: ${error.message}`),
  );
  const actualWasmDigest = bytesDigest(bytes);
  if (
    manifest.wasmSha256 !== actualWasmDigest ||
    manifest.wasmBytes !== bytes.length
  ) {
    fail(`Engine artifact hash/size does not match ${manifestPath}`);
  }
  await inspectModule(bytes, publicPath);

  if (packagedPath || packagedManifestPath) {
    if (!packagedPath || !packagedManifestPath) {
      fail("Both packaged Wasm and packaged manifest paths are required");
    }
    const packagedManifest = await readManifest(packagedManifestPath);
    if (stableManifest(packagedManifest) !== stableManifest(manifest)) {
      fail("Packaged engine manifest differs from the verified public manifest");
    }
    const packagedBytes = await readFile(packagedPath).catch((error) =>
      fail(`Cannot read packaged engine ${packagedPath}: ${error.message}`),
    );
    if (
      packagedBytes.length !== bytes.length ||
      bytesDigest(packagedBytes) !== manifest.wasmSha256
    ) {
      fail("Packaged engine bytes differ from the verified public artifact");
    }
    await inspectModule(packagedBytes, packagedPath);
  }

  console.log(
    `Verified engine ABI/model ${manifest.abiVersion}/${manifest.modelVersion}: ${manifest.wasmSha256}`,
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "publish" && args.length === 3) {
    await publish(...args.map((path) => resolve(path)));
  } else if (command === "verify" && (args.length === 2 || args.length === 4)) {
    await verify(...args.map((path) => resolve(path)));
  } else if (command === "source-hash" && args.length === 0) {
    console.log(await sourceDigest());
  } else {
    console.error(
      "usage: engine-artifact.mjs publish BUILT_WASM PUBLIC_WASM MANIFEST | verify PUBLIC_WASM MANIFEST [PACKAGED_WASM PACKAGED_MANIFEST] | source-hash",
    );
    process.exitCode = 64;
  }
}

try {
  await main();
} catch (error) {
  console.error(`Engine artifact verification failed: ${error.message}`);
  process.exitCode = 1;
}
