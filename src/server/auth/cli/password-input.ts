const ESCAPE = "\u001b";
const BACKSPACE = "\u007f";
const BACKSPACE_ALT = "\b";
const ENTER = "\r";
const LINE_FEED = "\n";
const CTRL_C = "\u0003";

export class TerminalPasswordParser {
  #characters: string[] = [];
  #escapeSequence = "";
  #bracketedPaste = false;
  #completed = false;
  #cancelled = false;

  feed(chunk: string): void {
    if (this.#completed) return;
    for (const character of chunk) {
      this.#consume(character);
      if (this.#completed) return;
    }
  }

  get value(): string {
    return this.#characters.join("");
  }

  get completed(): boolean {
    return this.#completed;
  }

  get cancelled(): boolean {
    return this.#cancelled;
  }

  #consume(character: string): void {
    if (this.#escapeSequence) {
      if (this.#escapeSequence === ESCAPE) {
        if (character === "[" || character === "O") {
          this.#escapeSequence += character;
        } else {
          this.#escapeSequence = "";
        }
        return;
      }
      this.#escapeSequence += character;
      if (/[\x40-\x7e]$/.test(character)) {
        if (this.#escapeSequence === "\u001b[200~") {
          this.#bracketedPaste = true;
        } else if (this.#escapeSequence === "\u001b[201~") {
          this.#bracketedPaste = false;
        }
        this.#escapeSequence = "";
      } else if (this.#escapeSequence.length > 32) {
        this.#escapeSequence = "";
      }
      return;
    }

    if (character === ESCAPE) {
      this.#escapeSequence = ESCAPE;
      return;
    }

    if (character === CTRL_C) {
      this.#completed = true;
      this.#cancelled = true;
      return;
    }

    if (this.#bracketedPaste) {
      if (character === BACKSPACE || character === BACKSPACE_ALT) {
        this.#characters.pop();
      } else if (
        character !== ENTER &&
        character !== LINE_FEED &&
        character >= " "
      ) {
        this.#characters.push(character);
      }
      return;
    }

    if (character === ENTER || character === LINE_FEED) {
      this.#completed = true;
      return;
    }

    if (character === BACKSPACE || character === BACKSPACE_ALT) {
      this.#characters.pop();
      return;
    }

    if (character >= " ") {
      this.#characters.push(character);
    }
  }
}

export function passwordsMatch(first: string, second: string): boolean {
  return first === second;
}

export async function readHiddenPassword(
  prompt: string,
  input = process.stdin,
  output = process.stdout,
): Promise<string> {
  if (!input.isTTY || !input.setRawMode) {
    throw new Error(
      "This command must run in an interactive terminal to hide password input.",
    );
  }

  return new Promise((resolve, reject) => {
    const parser = new TerminalPasswordParser();
    const wasRaw = input.isRaw;
    output.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    const cleanup = () => {
      input.setRawMode(wasRaw);
      input.pause();
      input.removeListener("data", onData);
      output.write("\n");
    };

    const onData = (chunk: string) => {
      parser.feed(chunk);
      if (!parser.completed) return;
      cleanup();
      if (parser.cancelled) reject(new Error("Cancelled."));
      else resolve(parser.value);
    };

    input.on("data", onData);
  });
}
