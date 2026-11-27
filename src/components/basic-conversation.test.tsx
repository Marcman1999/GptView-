import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseChatGptPage } from "@/lib/chatgpt/parser";
import { BasicConversation } from "./basic-conversation";

const ID = "6ae00cb5-a448-83e9-a9cf-0d69b0be5f32";
const html = readFileSync(path.join(__dirname, "../lib/chatgpt/fixtures/northbean-q3.html"), "utf8");

describe("BasicConversation", () => {
  it("renders every visible turn in order with role labels", () => {
    const conversation = parseChatGptPage(html, ID, `https://chatgpt.com/share/${ID}`);
    render(<BasicConversation conversation={conversation} />);

    const items = within(screen.getByTestId("conversation")).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-role"))).toEqual(["user", "assistant", "user", "assistant"]);
    expect(items[0].textContent).toContain("You");
    expect(items[1].textContent).toContain("ChatGPT");
    expect(items[1].textContent).toContain("| Region | Q2 Revenue");
  });
});
