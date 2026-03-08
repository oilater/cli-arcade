export interface ParsedArgs {
  readonly command: string | null;
  readonly subArgs: ReadonlyArray<string>;
  readonly help: boolean;
}

export function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  const args = argv.slice(2);

  if (args.length === 0) {
    return { command: null, subArgs: [], help: false };
  }

  const first = args[0];

  if (first === "--help" || first === "-h" || first === "guide") {
    return { command: "guide", subArgs: [], help: false };
  }

  if (first && !first.startsWith("-")) {
    return { command: first, subArgs: args.slice(1), help: false };
  }

  return { command: null, subArgs: args, help: false };
}
