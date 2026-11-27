import { describe, expect, it } from "vitest";
import { decodeTurboStream, extractTurboStream } from "./turbo-stream";

describe("turbo-stream decoding", () => {
  it("concatenates every enqueue literal in order", () => {
    const html = 'a<script>streamController.enqueue("[{\\"a\\":1}]\\n")</script>b<script>streamController.enqueue("P1:[\\"x\\"]\\n")</script>';
    expect(extractTurboStream(html)).toBe('[{"a":1}]\nP1:["x"]\n');
  });

  it("hydrates object references and sentinel values", () => {
    // Property values that are integers point into the table; -5 is the null sentinel.
    const stream = '[{"title":1,"empty":-5},"Hello"]';
    expect(decodeTurboStream(stream)).toEqual({ title: "Hello", empty: null });
  });

  it("rejects streams whose root is not an array", () => {
    expect(() => decodeTurboStream('{"a":1}')).toThrow();
  });
});
