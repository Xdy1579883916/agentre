import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function locateSource(): string {
  const found = [
    resolve(process.cwd(), "packages/agentre-wire/src"),
    resolve(process.cwd(), "src"),
  ].find((candidate) => existsSync(`${candidate}/index.ts`));

  if (!found) {
    throw new Error("agentre-wire source not found from either workspace root");
  }

  return found;
}

function locatePackage(): string {
  const found = [
    resolve(process.cwd(), "packages/agentre-wire"),
    process.cwd(),
  ].find((candidate) => existsSync(`${candidate}/package.json`));

  if (!found) {
    throw new Error(
      "agentre-wire package not found from either workspace root",
    );
  }

  return found;
}

const src = locateSource();
const packageRoot = locatePackage();

describe("agentre-wire public boundary", () => {
  // dist 那半条(65e8db67)钉错了对象,连同 prepare 的代价一起记在
  // agentre-ui/src/boundary.test.ts 的同名守卫里:本包发的是 src,消费方编译源码,
  // 没有任何解析路径会走到 dist;而 prepare 会让 pnpm 在消费方那边 fork npm。
  it("is independently buildable from a Git subdirectory", () => {
    const manifest = JSON.parse(
      readFileSync(`${packageRoot}/package.json`, "utf8"),
    ) as {
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string | undefined>;
      exports: Record<string, { default: string }>;
    };
    expect(manifest.devDependencies?.["@bufbuild/protobuf"]).toBe("2.14.0");
    expect(manifest.exports["."].default).toBe("./src/index.ts");
    expect(existsSync(`${packageRoot}/src/index.ts`)).toBe(true);
    expect(manifest.scripts?.prepare).toBeUndefined();
  });

  it("publishes only the typed Protobuf transport boundary", () => {
    expect(existsSync(`${src}/envelope.ts`)).toBe(false);
    expect(existsSync(`${src}/codec.ts`)).toBe(false);
    const barrel = readFileSync(`${src}/index.ts`, "utf8");
    expect(barrel).not.toContain('export * from "./envelope"');
    expect(barrel).not.toContain('export * from "./codec"');
    expect(barrel).toContain('export * from "./rpc"');
  });

  it("generates from the protocol module's one unversioned schema", () => {
    // schema 的主人是 Go 协议 module github.com/agentre-hub/agentre/pkg/wire：生成的
    // Go 和产出它的 .proto 住在一起，本包只是同一份 schema 的 TS 消费方，不再自带
    // 一份 proto/ 拷贝。
    const protocolModule = `${packageRoot}/../../../pkg/wire`;
    const protoPath = `${protocolModule}/proto/agentre/wire/wire.proto`;
    expect(existsSync(protoPath)).toBe(true);
    expect(existsSync(`${protocolModule}/proto/agentre/wire/v1`)).toBe(false);
    expect(existsSync(`${packageRoot}/proto`)).toBe(false);

    const proto = readFileSync(protoPath, "utf8");
    expect(proto).toContain("package agentre.wire;");
    expect(proto).toContain(
      'option go_package = "github.com/agentre-hub/agentre/pkg/wire/agentrewire;agentrewire";',
    );
    expect(proto).not.toMatch(/agentre\.wire\.v\d+|agentrewire\/v\d+/);

    expect(existsSync(`${src}/gen/agentre/wire/wire_pb.ts`)).toBe(true);
    expect(existsSync(`${src}/gen/agentre/wire/v1`)).toBe(false);
    // 生成的 Go 不再在本包里留一份拷贝：它直接落进独立 module
    // github.com/agentre-hub/agentre/pkg/wire，由桌面仓与 agentre-server 共同 import。
    expect(existsSync(`${packageRoot}/gen`)).toBe(false);
    expect(existsSync(`${protocolModule}/agentrewire/wire.pb.go`)).toBe(true);
  });
});
