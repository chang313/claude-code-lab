import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatInput from "@/components/ChatInput";

describe("ChatInput", () => {
  it("renders input and send button", () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByPlaceholderText("무엇이 먹고 싶으세요?")).toBeTruthy();
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("calls onSend with trimmed input on submit", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByPlaceholderText("무엇이 먹고 싶으세요?");
    fireEvent.change(input, { target: { value: "  치킨 추천해줘  " } });
    fireEvent.submit(input.closest("form")!);

    expect(onSend).toHaveBeenCalledWith("치킨 추천해줘");
  });

  it("clears input after submit", () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />);
    const input = screen.getByPlaceholderText(
      "무엇이 먹고 싶으세요?",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "테스트" } });
    fireEvent.submit(input.closest("form")!);

    expect(input.value).toBe("");
  });

  it("disables send button when disabled prop is true", () => {
    render(<ChatInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onSend for empty input", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    fireEvent.submit(screen.getByPlaceholderText("무엇이 먹고 싶으세요?").closest("form")!);
    expect(onSend).not.toHaveBeenCalled();
  });
});
