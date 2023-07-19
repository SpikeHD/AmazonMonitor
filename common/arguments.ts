interface ParsedArguments {
  [key: string]: string | number;
}

interface ArgumentDefinition {
  name: string
  aliases: string[]
  type: string
}


interface Definitions {
  [key: string]: ArgumentDefinition;
}

function getArgDef(defs: Definitions, arg: string): ArgumentDefinition | undefined {
  for (const key in defs) {
    if (defs[key].aliases.includes(arg) || arg === key) return defs[key]
  }
}

function parseVal(value: string, type: string): string | number {
  if (type === 'number') {
    return parseFloat(value)
  }

  return value
}

export function parseArgs(args: string[], defs: Definitions): ParsedArguments {
  const parsedArgs: ParsedArguments = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg.startsWith('-')) {
      const argName = arg.replace(/^-+/, '')
      const argDef = getArgDef(defs, argName)

      if (!argDef) {
        throw new Error(`Invalid argument: ${arg}`)
      }

      const value = parseVal(args[i + 1], argDef.type)

      // Get the full name of an alias if it is one, or just use the full name
      parsedArgs[argDef.name] = value

      // Skip to the next value
      i++
    }
  }

  return parsedArgs
}