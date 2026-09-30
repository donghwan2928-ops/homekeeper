// ── 지출 항목 입력 검증 ──
// 입력: { name, amount, due_day }
// 출력: 에러 메시지 객체. 문제가 없으면 빈 객체 {}

export function validateExpense({ name, amount, due_day }) {
  const errors = {};

  // 이름: 비어있거나 공백뿐이면 안 됨
  if (!name || name.trim() === "") {
    errors.name = "항목 이름을 입력해주세요.";
  }

  // 금액: 0보다 커야 함
  if (!Number.isInteger(amount) || amount <= 0) {
    errors.amount = "금액은 0원보다 커야 해요.";
  }

  // 납부일: 1~31 사이의 정수여야 함
  if (!Number.isInteger(due_day) || due_day < 1 || due_day > 31) {
    errors.due_day = "납부일은 1일부터 31일 사이여야 해요.";
  }

  return errors;
}