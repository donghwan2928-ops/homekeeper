import { describe, it, expect } from "vitest";
import { getDaysUntil, getDdayLabel, isThisMonth } from "./dday";

// new Date(연, 월-1, 일) : 자바스크립트의 월은 0부터 시작한다 (0 = 1월)
const day = (y, m, d) => new Date(y, m - 1, d);

describe("getDaysUntil: 납부일까지 남은 일수", () => {
  it("오늘이 납부일이면 0을 반환한다", () => {
    expect(getDaysUntil(25, day(2026, 9, 25))).toBe(0);
  });

  it("이번 달 납부일이 남아 있으면 이번 달 기준으로 센다", () => {
    expect(getDaysUntil(25, day(2026, 9, 20))).toBe(5);
  });

  it("이번 달 납부일이 지났으면 다음 달 납부일로 센다", () => {
    // 9월 26일 → 10월 25일 = 29일
    expect(getDaysUntil(25, day(2026, 9, 26))).toBe(29);
  });

  it("그 달에 없는 날(31일)은 말일로 당긴다", () => {
    // 2026년 4월은 30일까지 → 4월 30일이 납부일
    expect(getDaysUntil(31, day(2026, 4, 28))).toBe(2);
  });

  it("평년 2월에는 31일 납부일이 2월 28일이 된다", () => {
    expect(getDaysUntil(31, day(2026, 2, 28))).toBe(0);
  });

  it("윤년 2월에는 31일 납부일이 2월 29일이 된다", () => {
    // 2028년은 윤년
    expect(getDaysUntil(31, day(2028, 2, 28))).toBe(1);
  });

  it("12월 납부일이 지났으면 다음 해 1월로 넘어간다", () => {
    // 2026년 12월 26일 → 2027년 1월 5일 = 10일
    expect(getDaysUntil(5, day(2026, 12, 26))).toBe(10);
  });

  it("시각이 달라도 날짜만 비교한다 (오후 11시 59분도 같은 날)", () => {
    const lateNight = new Date(2026, 8, 20, 23, 59);
    expect(getDaysUntil(25, lateNight)).toBe(5);
  });
});

describe("getDdayLabel: 화면에 보여줄 글자", () => {
  it("0일이면 '오늘'", () => {
    expect(getDdayLabel(0)).toBe("오늘");
  });

  it("1일이면 '내일'", () => {
    expect(getDdayLabel(1)).toBe("내일");
  });

  it("그 외에는 'D-숫자'", () => {
    expect(getDdayLabel(5)).toBe("D-5");
  });
});

describe("isThisMonth: 이번 달에 낼 항목인지", () => {
  it("납부일이 오늘 이후면 이번 달 항목이다", () => {
    expect(isThisMonth(25, day(2026, 9, 20))).toBe(true);
  });

  it("납부일이 오늘이면 이번 달 항목이다", () => {
    expect(isThisMonth(20, day(2026, 9, 20))).toBe(true);
  });

  it("납부일이 이미 지났으면 이번 달 항목이 아니다", () => {
    expect(isThisMonth(10, day(2026, 9, 20))).toBe(false);
  });
});