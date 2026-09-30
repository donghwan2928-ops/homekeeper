import { describe, it, expect } from "vitest";
import { validateExpense } from "./validate";

describe("지출 항목 입력 검증", () => {
  it("이름이 비어있으면 에러를 반환한다", () => {
    const result = validateExpense({ name: "", amount: 1000, due_day: 25 });
    expect(result.name).toBe("항목 이름을 입력해주세요.");
  });

  it("금액이 0 이하면 에러를 반환한다", () => {
    const result = validateExpense({ name: "관리비", amount: 0, due_day: 25 });
    expect(result.amount).toBe("금액은 0원보다 커야 해요.");
  });

  it("납부일이 1~31 범위를 벗어나면 에러를 반환한다", () => {
    const result = validateExpense({ name: "관리비", amount: 1000, due_day: 32 });
    expect(result.due_day).toBe("납부일은 1일부터 31일 사이여야 해요.");
  });

  it("모든 값이 올바르면 에러가 없다", () => {
    const result = validateExpense({ name: "관리비", amount: 120000, due_day: 25 });
    expect(Object.keys(result).length).toBe(0);
  });

  it("금액이 숫자가 아니면 에러를 반환한다", () => {
    const result = validateExpense({ name: "관리비", amount: "abc", due_day: 25 });
    expect(result.amount).toBe("금액은 0원보다 커야 해요.");
  });

  it("금액이 소수면 에러를 반환한다", () => {
    const result = validateExpense({ name: "관리비", amount: 1.5, due_day: 25 });
    expect(result.amount).toBe("금액은 0원보다 커야 해요.");
  });

  it("납부일이 소수면 에러를 반환한다", () => {
    const result = validateExpense({ name: "관리비", amount: 1000, due_day: 2.5 });
    expect(result.due_day).toBe("납부일은 1일부터 31일 사이여야 해요.");
  });
});