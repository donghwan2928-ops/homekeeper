// ── 우리 서버의 시작 파일 ──

// 1. .env 파일의 값들을 불러오기 (제일 먼저!)
require("dotenv").config();

// 2. Express 불러오기
const express = require("express");
const app = express();
// CORS 허용: 프론트(5173)에서 오는 요청을 받아준다
const cors = require("cors");
app.use(cors());
const PORT = process.env.PORT || 3001;
// 요청 몸통(body)에 담긴 JSON을 읽을 수 있게 설정
app.use(express.json());

// 3. Supabase 연결
//    .env에서 URL과 키를 꺼내와 Supabase 클라이언트를 만든다
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,   // .env의 SUPABASE_URL 값
  process.env.SUPABASE_KEY    // .env의 SUPABASE_KEY 값
);
// ── 지출 항목 입력 검증 (서버 측 방어선) ──
function validateExpense({ name, amount, due_day }) {
  const errors = {};
  if (!name || String(name).trim() === "") {
    errors.name = "항목 이름을 입력해주세요.";
  }
  if (!amount || amount <= 0) {
    errors.amount = "금액은 0원보다 커야 해요.";
  }
  if (!due_day || due_day < 1 || due_day > 31) {
    errors.due_day = "납부일은 1일부터 31일 사이여야 해요.";
  }
  return errors;
}
// 4. 테스트용 응답
  app.get("/", (req, res) => {
  res.send("홈키퍼 서버가 살아있어요! 🏠");
});

// ── POST /api/expenses : 지출 항목 하나를 받아 DB에 저장 ──
  app.post("/api/expenses", async (req, res) => {
  // 1. 프론트가 보낸 데이터를 꺼낸다 (body에서)
  const { name, amount, due_day } = req.body;
// 검증: 잘못된 값이면 저장하지 않고 400으로 응답
  const errors = validateExpense({ name, amount, due_day });
  if (Object.keys(errors).length > 0) {
    return res.status(400).send({ 에러: errors });
  }
  // 2. Supabase의 expenses 테이블에 넣는다
  const { data, error } = await supabase
    .from("expenses")
    .insert([{ name, amount, due_day }])
    .select(); // 방금 넣은 걸 돌려받기

  // 3. 결과에 따라 응답
  if (error) {
    res.status(500).send({ 에러: error.message });
  } else {
    res.status(201).send({ 저장됨: data });
  }
});
// ── GET /api/expenses : 저장된 지출 항목 목록을 불러오기 ──
  app.get("/api/expenses", async (req, res) => {
  // expenses 테이블 전체를 최신순으로 조회
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false }); // 최신이 위로

  if (error) {
    res.status(500).send({ 에러: error.message });
  } else {
    res.send(data); // 목록을 그대로 응답
  }
});
// ── DELETE /api/expenses/:id : 지출 항목 하나 삭제 ──
app.delete("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) {
    res.status(500).send({ 에러: error.message });
  } else {
    res.send({ 삭제됨: id });
  }
});
// ── PUT /api/expenses/:id : 지출 항목 하나 수정 ──
app.put("/api/expenses/:id", async (req, res) => {
  // 1. 주소에서 "어느 것"인지 꺼낸다
  const { id } = req.params;

  // 2. 몸통에서 "뭘로 고칠지" 꺼낸다
  const { name, amount, due_day } = req.body;
  // 검증: 잘못된 값이면 저장하지 않고 400으로 응답
  const errors = validateExpense({ name, amount, due_day });
  if (Object.keys(errors).length > 0) {
    return res.status(400).send({ 에러: errors });
  }
  // 3. 해당 항목을 새 값으로 수정
  const { data, error } = await supabase
    .from("expenses")
    .update({ name, amount, due_day })
    .eq("id", id)
    .select(); // 수정된 결과를 돌려받기

  // 4. 결과 응답
  if (error) {
    res.status(500).send({ 에러: error.message });
  } else {
    res.send({ 수정됨: data });
  }
});
// 6. 서버 켜기
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});