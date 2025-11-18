declare module "fs" {
  const fs: any;
  export default fs;
}

declare module "path" {
  const path: any;
  export default path;
}

declare module "crypto" {
  const crypto: any;
  export default crypto;
}

declare const __dirname: string;

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
  argv: string[];
  exit(code?: number): never;
};
