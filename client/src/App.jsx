import { useState, useEffect } from "react";
import { validateExpense } from "./validate";
import { getDaysUntil, getDdayLabel, isThisMonth } from "./dday";
// 배포 환경에서는 VITE_API_URL, 로컬에서는 localhost:3001 사용
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";


// ============================================================
// React 화면 전환 - 9개 화면 전체 연결 버전
//
// 화면 흐름:
//   계약입력 → 타임라인 → 갱신선택 ┬ 갱신 → 갱신결과
//                                  └ 퇴거 → 퇴거결과
//             타임라인 → 반환확인 ┬ 받음 → 타임라인
//                                └ 못받음 → 미반환대응
//             타임라인 → 보관함 / 설정
//
// 지금 단계: "화면 전환"만 (값 입력·저장·계산은 다음 단계)
// ============================================================

export default function App() {
  // 현재 화면을 기억하는 상태. 시작은 "contract"
  const [screen, setScreen] = useState("expenses");

  // ── 계약 정보 상태 (App으로 끌어올림 = 여러 화면이 공유) ──
  // 계약입력 화면에서 채우고, 타임라인 화면에서 꺼내 씀
  const [contract, setContract] = useState({
    startDate: "", // 계약 시작일
    endDate: "", // 계약 만료일
    deposit: "", // 보증금 (콤마 포함 문자열)
  });

  // ── 보관함 기록 상태 (배열) ──
  // 통보 완료 등이 일어날 때마다 여기에 기록이 쌓임
  const [records, setRecords] = useState([]);

  // 통보(갱신/퇴거)를 완료했는지 여부 → 타임라인 상태 표시에 사용
  const [notified, setNotified] = useState(false);

  // 새 기록을 맨 앞에 추가하는 함수
  const addRecord = (record) => {
    // 오늘 날짜를 "YYYY.MM.DD"로
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    setRecords([{ ...record, date: dateStr }, ...records]); // 새 기록 맨 앞
  };

  // go: 화면을 바꾸는 함수 하나로 통일 (모든 화면에 넘겨줌)
  const go = (name) => setScreen(name);

  // 타임라인은 자체 전체 화면 레이아웃(넓은 폭 + 자체 배경)을 씀
  if (screen === "timeline") {
    return (
      <Timeline
        go={go}
        contract={contract}
        notified={notified}
        records={records}
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {screen === "contract" && (
          <ContractInput
            go={go}
            contract={contract}
            setContract={setContract}
          />
        )}
        {screen === "decision" && <Decision go={go} />}
        {screen === "renew" && (
          <RenewResult
            go={go}
            addRecord={addRecord}
            setNotified={setNotified}
          />
        )}
        {screen === "leave" && (
          <LeaveResult
            go={go}
            addRecord={addRecord}
            setNotified={setNotified}
          />
        )}
        {screen === "returnCheck" && (
          <ReturnCheck go={go} addRecord={addRecord} />
        )}
        {screen === "unpaid" && <UnpaidAction go={go} addRecord={addRecord} />}
        {screen === "archive" && <Archive go={go} records={records} />}
        {screen === "settings" && <Settings go={go} />}
        {screen === "expenses" && <ExpenseSetup go={go} />}
      </div>
    </div>
  );
}

// ── 화면 1: 계약 입력 (제어 컴포넌트) ──
// contract(현재 값), setContract(값 바꾸는 도구)를 App에서 받아옴
function ContractInput({ go, contract, setContract }) {
  // 입력이 바뀔 때 contract 상태의 해당 항목만 업데이트하는 함수
  // 예: update("startDate", "2024-03-01")
  const update = (key, value) => {
    setContract({ ...contract, [key]: value }); // 기존 값 유지하고 하나만 교체
  };

  // 보증금 입력: 숫자만 남기고 천 단위 콤마 붙이기
  const onDepositChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    update("deposit", raw ? Number(raw).toLocaleString("ko-KR") : "");
  };

  // 타임라인 만들기 누를 때 간단 검증
  const handleSubmit = () => {
    if (!contract.startDate || !contract.endDate) {
      alert("계약 시작일과 만료일을 입력해주세요.");
      return;
    }
    if (new Date(contract.endDate) <= new Date(contract.startDate)) {
      alert("만료일은 시작일보다 나중이어야 해요.");
      return;
    }
    go("timeline");
  };

  return (
    <div>
      {/* 서비스 소개 (첫 화면이라 무엇을 하는 곳인지 알려줌) */}
      <div style={styles.introBrand}>
        <span style={styles.introLogo}>홈</span>
        <span style={styles.introBrandName}>홈키퍼</span>
      </div>
      <div style={styles.introEyebrow}>집 관련 돈 관리</div>
      <h1 style={styles.introHeadline}>
        집에 나가는 돈,
        <br />
        이제 신경 쓰지 마세요.
      </h1>
      <p style={styles.introDesc}>
        월세·관리비·공과금부터 보증금 반환까지, 홈키퍼가 챙겨드려요.
      </p>

      <div style={{ ...styles.header, marginTop: 28 }}>
        <span style={styles.title}>계약 정보 입력</span>
        <span style={styles.step}>1 / 1 단계</span>
      </div>
      <p style={styles.desc}>
        계약 날짜와 보증금을 입력하면 일정이 자동으로 만들어져요.
      </p>

      <label style={styles.label}>계약 시작일</label>
      <input
        type="date"
        style={styles.input}
        value={contract.startDate} /* 상태 → 화면 */
        onChange={(e) => update("startDate", e.target.value)} /* 화면 → 상태 */
      />

      <label style={styles.label}>계약 만료일</label>
      <input
        type="date"
        style={styles.input}
        value={contract.endDate}
        onChange={(e) => update("endDate", e.target.value)}
      />

      <label style={styles.label}>보증금 액수</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="150,000,000"
        style={styles.input}
        value={contract.deposit}
        onChange={onDepositChange}
      />
      {/* 입력한 금액을 '○○만원 / ○○억 ○○만원'으로 읽기 쉽게 표시 */}
      {contract.deposit && (
        <div style={styles.depositWord}>
          {formatKoreanMoney(contract.deposit)}
        </div>
      )}

      <button style={styles.primaryBtn} onClick={handleSubmit}>
        타임라인 만들기
      </button>
      {/* 지출 관리 화면으로 가는 진입 버튼 (홈키퍼 핵심 기능) */}
      <button
        style={{
          width: "100%",
          height: 48,
          marginTop: 12,
          background: "#fff",
          color: "#2d4030",
          border: "1.5px solid #2d4030",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
        }}
        onClick={() => go("expenses")}
      >
        💰 집에 나가는 돈 관리하기 →
      </button>
    </div>
  );
}

// ── 날짜 계산 도우미 함수 ──
// 만료일(YYYY-MM-DD)을 기준으로 n개월 전 날짜를 구해서 "YYYY.MM.DD"로 반환
function monthsBefore(dateStr, n) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - n); // n개월 빼기
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// 시작일(YYYY-MM-DD)로부터 n개월 후 날짜를 "YYYY.MM.DD"로 반환
// (보증보험 가입은 보통 계약 초반에 하므로 시작+1개월로 안내)
function monthsAfter(dateStr, n) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// 오늘부터 목표일(YYYY.MM.DD 또는 YYYY-MM-DD)까지 남은 일수 계산
// 지난 날짜면 음수. 오늘이면 0.
function daysUntil(dateStr) {
  if (!dateStr || dateStr === "-") return null;
  const target = new Date(dateStr.replaceAll(".", "-"));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// 남은 일수를 "D-45 / D-DAY / 지남" 같은 라벨로
function ddayLabel(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return "";
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-DAY";
  return "지남";
}

// "YYYY-MM-DD" → "YYYY.MM" (연월만, 칩 표시용)
function shortDate(dateStr) {
  if (!dateStr) return "-";
  const [y, m] = dateStr.split("-");
  return `${y}.${m}`;
}

// "YYYY-MM-DD" → "YYYY.MM.DD" 표시용 변환
function dotDate(dateStr) {
  if (!dateStr) return "-";
  return dateStr.replaceAll("-", ".");
}

// 원 단위 금액(콤마 포함 문자열)을 "○억 ○만원"으로 변환
// 예: "150,000,000" → "1억 5,000만원",  "15,000,000" → "1,500만원"
function formatKoreanMoney(depositStr) {
  const won = Number(depositStr.replace(/[^0-9]/g, ""));
  if (!won) return "";
  const man = Math.floor(won / 10000); // 만원 단위로
  if (man === 0) return `${won.toLocaleString("ko-KR")}원`;
  const eok = Math.floor(man / 10000); // 억 단위
  const restMan = man % 10000; // 나머지 만원
  if (eok > 0) {
    return restMan > 0
      ? `${eok}억 ${restMan.toLocaleString("ko-KR")}만원`
      : `${eok}억원`;
  }
  return `${man.toLocaleString("ko-KR")}만원`;
}

// ── 화면 2: 타임라인 (홈) - 여러 곳으로 가는 허브 ──
// App에서 contract(계약 정보)를 받아서, 계산된 날짜를 표시
function Timeline({ go, contract, notified, records }) {
  // 각 시점 날짜를 계산 (보증보험은 시작+1개월, 나머지는 만료일 기준)
  const insuranceDate = monthsAfter(contract.startDate, 1);
  const renewDate = monthsBefore(contract.endDate, 6);
  const noticeDate = monthsBefore(contract.endDate, 2);
  const endDate = dotDate(contract.endDate);

  // 각 시점 기본 정보 (상태는 아래에서 오늘 기준으로 자동 계산)
  const rawPoints = [
    {
      name: "보증보험 마감",
      date: insuranceDate,
      desc: "가입은 계약 초기에 해두는 게 좋아요",
    },
    {
      name: "갱신 결정",
      date: renewDate,
      desc: "계속 살지, 나갈지 정하는 시점",
    },
    {
      name: "통보 마지노선",
      date: noticeDate,
      desc: "이때까진 집주인에게 알려야 해요",
    },
    { name: "계약 만료", date: endDate, desc: "보증금을 돌려받는 날" },
  ];

  // 오늘 기준으로 각 시점 상태를 자동 판단
  // - 지난 시점: "past"(지남)
  // - 아직 안 지난 것 중 첫 번째: "active"(지금 여기)
  // - 그 뒤: "" (예정)
  let activeAssigned = false;
  const points = rawPoints.map((p) => {
    const remain = daysUntil(p.date);
    if (remain === null) return { ...p, state: "", remain: null };
    if (remain < 0) return { ...p, state: "past", remain }; // 이미 지남
    if (!activeAssigned) {
      activeAssigned = true;
      return { ...p, state: "active", remain }; // 다음 할 일 = 지금 여기
    }
    return { ...p, state: "", remain }; // 예정
  });

  // 통보 완료했으면 갱신 결정은 완료로 표시
  if (notified) {
    const renewIdx = points.findIndex((p) => p.name === "갱신 결정");
    if (renewIdx >= 0) points[renewIdx].state = "done";
  }

  // "다음 할 일" = active 상태인 시점 찾기 (없으면 계약 종료된 상태)
  const nextPoint = points.find((p) => p.state === "active");
  const isExpired = daysUntil(endDate) !== null && daysUntil(endDate) < 0; // 계약 만료 지남

  const depositText = formatKoreanMoney(contract.deposit) || "-";

  return (
    <div style={t.wrap}>
      {/* 상단 네비게이션 바 */}
      <nav style={t.nav}>
        <div style={t.brand}>
          <span style={t.logo}>홈</span>
          <span style={t.brandName}>홈키퍼</span>
        </div>
        <div style={t.navMenu}>
          <span style={t.navActive}>타임라인</span>
          <span style={t.navItem} onClick={() => go("archive")}>
            보관함
          </span>
        </div>
        <div style={t.avatar} onClick={() => go("settings")} title="설정">
          ⚙️
        </div>
      </nav>

      <div style={t.divider} />

      {/* 헤드라인 - 상황에 따라 문구가 바뀜 */}
      <div style={t.hero}>
        <div style={t.eyebrow}>YOUR LEASE, WELL KEPT</div>
        {isExpired ? (
          <h1 style={t.headline}>
            계약 만료일이 지났어요.
            <br />
            보증금 반환을 <span style={t.accent}>확인</span>해 주세요.
          </h1>
        ) : nextPoint ? (
          <h1 style={t.headline}>
            챙겨야 할 일정을 확인하세요.
            <br />
            다음 할 일까지 <span style={t.accent}>
              {nextPoint.remain}일
            </span>{" "}
            남았어요.
          </h1>
        ) : (
          <h1 style={t.headline}>
            계약 정보를 먼저
            <br />
            <span style={t.accent}>입력</span>해 주세요.
          </h1>
        )}
        <div style={t.chips}>
          {contract.startDate && contract.endDate ? (
            <>
              <span style={isExpired ? t.chipGray : t.chipGreen}>
                ● {isExpired ? "만료됨" : "진행 중"}
              </span>
              <span style={t.chip}>
                {shortDate(contract.startDate)} ~ {shortDate(contract.endDate)}
              </span>
              <span style={t.chip}>보증금 {depositText}</span>
            </>
          ) : (
            <span style={t.chip}>계약 정보를 입력해 주세요</span>
          )}
        </div>
      </div>

      {/* 2단 카드 그리드 */}
      <div style={t.grid}>
        {/* 다음 할 일 (깊은 초록 카드) - 상황별로 내용이 바뀜 */}
        <div style={t.greenCard}>
          {isExpired ? (
            <>
              <div style={t.greenLabel}>계약 종료</div>
              <div style={t.greenTitle}>보증금 반환 확인하기</div>
              <div style={t.greenDesc}>
                계약이 만료됐어요. 보증금을 잘 돌려받았는지 확인해요.
              </div>
              <button style={t.ctaBtn} onClick={() => go("returnCheck")}>
                반환 확인하기 →
              </button>
            </>
          ) : nextPoint ? (
            <>
              <div style={t.greenLabel}>다음에 할 일</div>
              <div style={t.dRow}>
                <span style={t.dPrefix}>D-</span>
                <span style={t.dNum}>{nextPoint.remain}</span>
              </div>
              <div style={t.greenTitle}>{nextPoint.name}하기</div>
              <div style={t.greenDesc}>
                {nextPoint.date}까지 · {nextPoint.desc}
              </div>
              <button style={t.ctaBtn} onClick={() => go("decision")}>
                결정하러 가기 →
              </button>
            </>
          ) : (
            <>
              <div style={t.greenLabel}>안내</div>
              <div style={t.greenTitle}>계약 정보가 필요해요</div>
              <div style={t.greenDesc}>
                계약 날짜와 보증금을 입력하면 일정이 만들어져요.
              </div>
              <button style={t.ctaBtn} onClick={() => window.location.reload()}>
                입력하러 가기 →
              </button>
            </>
          )}
        </div>

        {/* 계약 여정 (세로 타임라인) */}
        <div style={t.journeyCard}>
          <div style={t.journeyTitle}>계약 여정</div>
          <div style={t.journeyList}>
            {points.map((p, i) => (
              <div key={i} style={t.jItem}>
                <div style={t.jLeft}>
                  <div
                    style={{
                      ...t.jDot,
                      ...(p.state === "done" ? t.jDotDone : {}),
                      ...(p.state === "active" ? t.jDotActive : {}),
                      ...(p.state === "past" ? t.jDotPast : {}),
                    }}
                  />
                  {i < points.length - 1 && <div style={t.jLine} />}
                </div>
                <div style={t.jBody}>
                  <div style={t.jNameRow}>
                    <span
                      style={{
                        ...t.jName,
                        ...(p.state === "active" ? { color: "#c17a4a" } : {}),
                        ...(p.state === "past" ? { color: "#a29a8a" } : {}),
                      }}
                    >
                      {p.name}
                    </span>
                    {p.state === "done" && (
                      <span style={t.jBadgeDone}>완료</span>
                    )}
                    {p.state === "active" && (
                      <span style={t.jBadgeNow}>지금 여기</span>
                    )}
                    {p.state === "past" && (
                      <span style={t.jBadgePast}>지남</span>
                    )}
                  </div>
                  <div style={t.jDate}>
                    {p.date}
                    {p.state === "active" && p.remain >= 0
                      ? ` · D-${p.remain}`
                      : ""}
                  </div>
                  <div style={t.jDesc}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 보조 카드 2개: 최근 활동 + 오늘의 팁 */}
      <div style={t.grid}>
        {/* 최근 활동 (보관함 최신 기록과 연결) */}
        <div style={t.recentCard}>
          <div style={t.recentLabel}>최근 활동</div>
          {records.length > 0 ? (
            <div style={t.recentRow}>
              <span style={t.recentIcon}>{records[0].icon}</span>
              <div>
                <div style={t.recentTitle}>{records[0].title}</div>
                <div style={t.recentSub}>
                  {records[0].date}
                  {records[0].sub ? ` · ${records[0].sub}` : ""}
                </div>
              </div>
            </div>
          ) : (
            <div style={t.recentEmpty}>
              아직 활동이 없어요. 통보를 완료하면 여기에 표시돼요.
            </div>
          )}
          <button style={t.recentBtn} onClick={() => go("archive")}>
            보관함 보기 →
          </button>
        </div>

        {/* 오늘의 팁 */}
        <div style={t.tipCard}>
          <div style={t.tipLabel}>💡 알아두면 좋아요</div>
          <div style={t.tipText}>
            전입신고와 확정일자는 <b>이사 당일 바로</b> 받는 게 안전해요. 하루만
            늦어도 보증금 보호 순위가 밀릴 수 있어요.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 화면 3: 갱신 선택 (갱신/퇴거로 분기) ──
function Decision({ go }) {
  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("timeline")}>
          ← 타임라인으로
        </button>
      </div>
      <div style={styles.center}>
        <div style={styles.qIcon}>📅</div>
        <div style={styles.qTitle}>계약 만료가 6개월 남았어요</div>
        <div style={styles.qDesc}>
          이 집에서 계속 사실 건가요, 나가실 건가요?
        </div>
      </div>
      <div style={styles.choices}>
        {/* 갱신 → renew, 퇴거 → leave 로 분기 */}
        <button style={styles.choice} onClick={() => go("renew")}>
          <div style={styles.choiceIcon}>🏠</div>
          <div style={styles.choiceTitle}>갱신할래요</div>
          <div style={styles.choiceSub}>계속 살고 싶어요</div>
        </button>
        <button style={styles.choice} onClick={() => go("leave")}>
          <div style={styles.choiceIcon}>🚪</div>
          <div style={styles.choiceTitle}>나갈래요</div>
          <div style={styles.choiceSub}>이사 나갈 거예요</div>
        </button>
      </div>
    </div>
  );
}

// ── 화면 4: 갱신 결과 ──
function RenewResult({ go, addRecord, setNotified }) {
  // 선택한 통보 방법들(여러 개 가능 → 배열)
  const [methods, setMethods] = useState([]);
  const [done, setDone] = useState(false);

  // 방법을 하나 이상 골라야 하고, 완료 체크도 해야 저장 가능
  const canSave = methods.length > 0 && done;

  // 버튼 토글: 이미 있으면 빼고, 없으면 넣기
  const toggleMethod = (m) => {
    if (methods.includes(m)) {
      setMethods(methods.filter((x) => x !== m)); // 빼기
    } else {
      setMethods([...methods, m]); // 넣기
    }
  };

  const handleSave = () => {
    // 선택한 방법들을 쉼표로 이어서 기록에 저장
    addRecord({
      icon: "🏠",
      title: "갱신 통보 완료",
      sub: `${methods.join(", ")}으로 통보`,
    });
    setNotified(true); // 타임라인의 '갱신 결정'을 완료로 바꿈
    go("timeline");
  };

  const methodOptions = ["문자·카톡", "내용증명", "직접 얘기"];

  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("decision")}>
          ← 선택 다시 하기
        </button>
      </div>
      <div style={styles.titleRow}>
        <span style={{ fontSize: 22 }}>🏠</span>
        <span style={styles.title}>갱신하기로 하셨네요</span>
      </div>
      <div style={styles.stepsGuide}>
        <div style={styles.sgTitle}>이렇게 진행하면 돼요</div>
        <div style={styles.sgItem}>
          <span style={styles.sgNum}>1</span> 집주인에게 "갱신하겠다"고 통보해요
        </div>
        <div style={styles.sgItem}>
          <span style={styles.sgNum}>2</span> 문자·카톡이면 캡처, 내용증명이면
          영수증 보관
        </div>
        <div style={styles.sgItem}>
          <span style={styles.sgNum}>3</span> 아래에서 통보 완료 표시를 남겨요
        </div>
      </div>
      <a
        href="https://www.easylaw.go.kr"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        정확한 문구·양식 확인하기 · 생활법령정보 ↗
      </a>

      {/* 통보 방법 선택 - 여러 개 선택 가능 */}
      <div style={styles.sectionLabel}>
        어떤 방법으로 통보하셨나요?{" "}
        <span style={styles.multiHint}>(여러 개 선택 가능)</span>
      </div>
      <div style={styles.methodRow}>
        {methodOptions.map((m) => (
          <button
            key={m}
            style={
              methods.includes(m)
                ? { ...styles.methodBtn, ...styles.methodPicked }
                : styles.methodBtn
            }
            onClick={() => toggleMethod(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 완료 체크 */}
      <label style={styles.doneCheck}>
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => setDone(e.target.checked)}
        />
        <span>통보 완료했어요</span>
      </label>

      <button
        style={
          canSave
            ? styles.primaryBtn
            : { ...styles.primaryBtn, ...styles.btnDisabled }
        }
        onClick={handleSave}
        disabled={!canSave}
      >
        저장하고 타임라인으로
      </button>
    </div>
  );
}

// ── 화면 5: 퇴거 결과 ──
function LeaveResult({ go, addRecord, setNotified }) {
  const [methods, setMethods] = useState([]);
  const [done, setDone] = useState(false);
  const canSave = methods.length > 0 && done;

  const toggleMethod = (m) => {
    if (methods.includes(m)) {
      setMethods(methods.filter((x) => x !== m));
    } else {
      setMethods([...methods, m]);
    }
  };

  const handleSave = () => {
    addRecord({
      icon: "🚪",
      title: "퇴거 통보 완료",
      sub: `${methods.join(", ")}으로 통보`,
    });
    setNotified(true); // 타임라인의 '갱신 결정'을 완료로 바꿈
    go("timeline");
  };

  const methodOptions = ["문자·카톡", "내용증명", "직접 얘기"];

  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("decision")}>
          ← 선택 다시 하기
        </button>
      </div>
      <div style={styles.titleRow}>
        <span style={{ fontSize: 22 }}>🚪</span>
        <span style={styles.title}>나가기로 하셨네요</span>
      </div>
      <div style={styles.warnBox}>
        <b>만료 2개월 전까지</b> 나가겠다는 의사를 꼭 알려야 해요. 안 그러면
        계약이 자동 연장될 수 있어요.
      </div>
      <div style={styles.sectionLabel}>나갈 때 꼭 확인하세요</div>
      <div style={styles.noticeGroup}>
        <div style={styles.noticeItem}>
          <span style={styles.noticeDot} />
          <div>
            <div style={styles.noticeTitleDanger}>
              보증금 받기 전엔 전입신고 옮기지 않기
            </div>
            <div style={styles.noticeDesc}>
              미리 옮기면 보증금 지킬 권리(대항력)를 잃을 수 있어요
            </div>
          </div>
        </div>
        <div style={styles.noticeItem}>
          <span style={styles.noticeDot} />
          <div>
            <div style={styles.noticeTitle}>
              새 집 잔금일과 보증금 받는 날 맞추기
            </div>
            <div style={styles.noticeDesc}>
              두 날짜가 어긋나면 목돈이 잠깐 비어버릴 수 있어요
            </div>
          </div>
        </div>
        <div style={styles.noticeItem}>
          <span style={styles.noticeDot} />
          <div>
            <div style={styles.noticeTitle}>등기부등본 다시 확인하기</div>
            <div style={styles.noticeDesc}>
              근저당 등이 새로 잡혔는지 이사 전에 점검해요
            </div>
          </div>
        </div>
      </div>

      {/* 통보 방법 선택 - 여러 개 선택 가능 */}
      <div style={{ ...styles.sectionLabel, marginTop: 20 }}>
        어떤 방법으로 통보하셨나요?{" "}
        <span style={styles.multiHint}>(여러 개 선택 가능)</span>
      </div>
      <div style={styles.methodRow}>
        {methodOptions.map((m) => (
          <button
            key={m}
            style={
              methods.includes(m)
                ? { ...styles.methodBtn, ...styles.methodPicked }
                : styles.methodBtn
            }
            onClick={() => toggleMethod(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 완료 체크 */}
      <label style={styles.doneCheck}>
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => setDone(e.target.checked)}
        />
        <span>통보 완료했어요</span>
      </label>

      <button
        style={
          canSave
            ? styles.primaryBtn
            : { ...styles.primaryBtn, ...styles.btnDisabled }
        }
        onClick={handleSave}
        disabled={!canSave}
      >
        저장하고 타임라인으로
      </button>
    </div>
  );
}

// ── 화면 6: 반환 확인 (받음/못받음 분기) ──
function ReturnCheck({ go, addRecord }) {
  // 받았어요 → 반환 완료 기록 남기고 타임라인으로
  const handleReceived = () => {
    addRecord({
      icon: "💰",
      title: "보증금 반환 완료",
      sub: "만료일에 보증금 수령",
    });
    go("timeline");
  };
  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("timeline")}>
          ← 타임라인으로
        </button>
      </div>
      <div style={styles.center}>
        <div style={styles.qIcon}>💵</div>
        <div style={styles.qTitle}>오늘은 계약 만료일이에요</div>
        <div style={styles.qDesc}>집주인에게 보증금을 돌려받으셨나요?</div>
      </div>
      <div style={styles.choices}>
        <button style={styles.choice} onClick={handleReceived}>
          <div style={styles.choiceIcon}>✅</div>
          <div style={styles.choiceTitle}>받았어요</div>
          <div style={styles.choiceSub}>보증금을 돌려받았어요</div>
        </button>
        <button style={styles.choice} onClick={() => go("unpaid")}>
          <div style={styles.choiceIcon}>⚠️</div>
          <div style={styles.choiceTitle}>아직이에요</div>
          <div style={styles.choiceSub}>아직 못 받았어요</div>
        </button>
      </div>
    </div>
  );
}

// ── 화면 7: 미반환 대응 ──
function UnpaidAction({ go, addRecord }) {
  const handleSave = () => {
    addRecord({
      icon: "🛡️",
      title: "미반환 대응 확인",
      sub: "임차권등기명령 안내 확인",
    });
    go("archive");
  };
  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("returnCheck")}>
          ← 이전으로
        </button>
      </div>
      <div style={styles.titleRow}>
        <span style={{ fontSize: 22 }}>🛡️</span>
        <span style={styles.title}>보증금을 아직 못 받으셨군요</span>
      </div>
      <div style={styles.keyWarn}>
        <div style={styles.keyWarnTitle}>
          ⚠️ 이사보다 '임차권등기명령'이 먼저예요
        </div>
        <p
          style={{ fontSize: 12, color: "#6b6558", lineHeight: 1.6, margin: 0 }}
        >
          등기가 끝나기 전에 이사하면 보증금 받을 권리(대항력)를 잃을 수 있어요.
        </p>
      </div>
      <a
        href="https://ecfs.scourt.go.kr"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        1. 임차권등기명령 신청 · 대법원 전자소송 ↗
      </a>
      <a
        href="https://www.klac.or.kr"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        2. 무료 법률상담 · 대한법률구조공단 ↗
      </a>
      <a
        href="https://www.khug.or.kr/jeonse"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        3. 전세사기 피해자 지원 · HUG ↗
      </a>
      <button
        style={{ ...styles.primaryBtn, marginTop: 8 }}
        onClick={handleSave}
      >
        확인했어요, 보관함에 기록
      </button>
    </div>
  );
}

// ── 화면 8: 보관함 ──
// App에서 records(기록 배열)를 받아서 표시
function Archive({ go, records }) {
  return (
    <div>
      <div style={styles.header}>
        <span style={styles.title}>보관함</span>
        <button style={styles.ghostBtn} onClick={() => go("timeline")}>
          ← 타임라인으로
        </button>
      </div>

      {records.length === 0 ? (
        // 기록이 하나도 없을 때: 빈 화면 안내
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
            아직 보관된 게 없어요
          </div>
          <div style={{ fontSize: 13, color: "#6b6558", lineHeight: 1.7 }}>
            갱신·퇴거 통보를 완료하면 여기에 자동으로 기록돼요.
          </div>
        </div>
      ) : (
        // 기록이 있을 때: 목록으로 표시
        <>
          {records.map((r, i) => (
            <div key={i} style={styles.record}>
              <div style={styles.recordIcon}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "#6b6558", marginTop: 2 }}>
                  {r.sub}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#999" }}>{r.date}</div>
            </div>
          ))}
          <div style={styles.disclaimer}>
            ℹ️ 이 기록은 참고용 메모예요. 법적 증빙 효력을 보장하지는 않아요.
          </div>
        </>
      )}
    </div>
  );
}

// ── 화면 9: 설정 ──
function Settings({ go }) {
  return (
    <div>
      <div style={styles.header}>
        <span style={styles.title}>설정</span>
        <button style={styles.ghostBtn} onClick={() => go("timeline")}>
          ← 타임라인으로
        </button>
      </div>
      {["내 계약 관리", "알림 시점 조절", "개인정보 처리방침"].map((m, i) => (
        <div key={i} style={styles.menuItem}>
          <span>{m}</span>
          <span style={{ color: "#b4b2a9" }}>›</span>
        </div>
      ))}
      <div style={styles.disclaimerBox}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          ⚠️ 꼭 알아두세요
        </div>
        <p
          style={{ fontSize: 12, color: "#6b6558", lineHeight: 1.7, margin: 0 }}
        >
          이 앱은 법률 자문이 아닌 일정 안내 서비스입니다. 정확한 법적 판단은
          공식 기관이나 전문가를 통해 확인해주세요.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 스타일
// ============================================================
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f0e9",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    fontFamily: "-apple-system, 'Noto Sans KR', sans-serif",
    color: "#2a2724",
  },
  card: {
    width: "100%",
    maxWidth: 560,
    background: "#faf8f3",
    border: "1px solid #ebe6da",
    borderRadius: 18,
    padding: 32,
    boxSizing: "border-box",
  },
  debug: {
    marginTop: 16,
    fontSize: 12,
    color: "#8a8478",
    background: "#faf8f3",
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid #ebe6da",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #ebe6da",
    paddingBottom: 16,
    marginBottom: 20,
  },
  introBrand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  introLogo: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#2d4030",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
  },
  introBrandName: { fontSize: 16, fontWeight: 700, color: "#2d4030" },
  introEyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    color: "#c17a4a",
    fontWeight: 700,
    marginBottom: 12,
  },
  introHeadline: {
    fontSize: 25,
    fontWeight: 800,
    lineHeight: 1.4,
    margin: "0 0 12px",
    color: "#2d4030",
    fontFamily: "'Noto Serif KR', serif",
    letterSpacing: "-0.5px",
  },
  introDesc: { fontSize: 13, color: "#6b6558", lineHeight: 1.6, margin: 0 },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#2d4030",
    fontFamily: "'Noto Serif KR', serif",
  },
  sub: { fontSize: 12, color: "#8a8478", marginTop: 3 },
  step: { fontSize: 12, color: "#8a8478" },
  desc: { fontSize: 14, color: "#6b6558", lineHeight: 1.6, marginBottom: 20 },
  label: {
    display: "block",
    fontSize: 13,
    color: "#6b6558",
    margin: "12px 0 6px",
  },
  input: {
    width: "100%",
    height: 44,
    padding: "0 12px",
    border: "1px solid #d9d2c4",
    borderRadius: 10,
    fontSize: 15,
    boxSizing: "border-box",
    background: "#fff",
    color: "#2d2a24",
  },
  depositWord: {
    fontSize: 13,
    color: "#c17a4a",
    marginTop: 8,
    fontWeight: 600,
  },
  primaryBtn: {
    width: "100%",
    height: 48,
    marginTop: 24,
    background: "#2d4030",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  ghostBtn: {
    padding: "8px 14px",
    background: "#faf8f3",
    border: "1px solid #d9d2c4",
    borderRadius: 10,
    fontSize: 13,
    color: "#6b6558",
    cursor: "pointer",
  },
  banner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#e8ede2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 26,
  },
  bannerTitle: { fontSize: 14, fontWeight: 700, color: "#2d4030" },
  bannerDesc: { fontSize: 13, color: "#5c6b54", marginTop: 3 },
  bannerBtn: {
    marginLeft: "auto",
    height: 38,
    padding: "0 16px",
    background: "#c17a4a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  timelineRow: { display: "flex", justifyContent: "space-between" },
  point: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "22%",
    textAlign: "center",
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#fff",
    border: "2px solid #cfc9bb",
  },
  dotDone: { background: "#2d4030", border: "2px solid #2d4030" },
  dotActive: { background: "#c17a4a", border: "2px solid #c17a4a" },
  pointName: { fontSize: 12, fontWeight: 500, color: "#6b6558", marginTop: 10 },
  pointDate: { fontSize: 11, color: "#8a8478", marginTop: 2 },
  backRow: { marginBottom: 16 },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  center: { textAlign: "center", padding: "24px 0 28px" },
  qIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#e8ede2",
    fontSize: 28,
    marginBottom: 16,
  },
  qTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#2d4030",
    fontFamily: "'Noto Serif KR', serif",
  },
  qDesc: { fontSize: 14, color: "#6b6558", marginTop: 8 },
  choices: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  choice: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "28px 16px",
    background: "#fff",
    border: "1px solid #d9d2c4",
    borderRadius: 14,
    cursor: "pointer",
  },
  choiceIcon: { fontSize: 32 },
  choiceTitle: { fontSize: 16, fontWeight: 700, color: "#2d4030" },
  choiceSub: { fontSize: 12, color: "#6b6558" },
  stepsGuide: {
    background: "#e8ede2",
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 20,
  },
  sgTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#2d4030",
    marginBottom: 12,
  },
  sgItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "#3f5140",
    marginBottom: 10,
  },
  sgNum: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#2d4030",
    color: "#fff",
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    display: "block",
    padding: "12px 14px",
    background: "#e8ede2",
    borderRadius: 10,
    fontSize: 13,
    color: "#2d4030",
    textDecoration: "none",
    marginBottom: 10,
    fontWeight: 500,
  },
  warnBox: {
    background: "#f6ead9",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 12,
    color: "#9c6633",
    lineHeight: 1.6,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    color: "#2d4030",
  },
  checkItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 14,
    border: "1px solid #ebe6da",
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 8,
    cursor: "pointer",
  },
  checkDanger: {
    border: "1.5px solid #d99a9a",
    color: "#b83232",
    fontWeight: 500,
  },
  noticeGroup: {
    border: "1px solid #ebe6da",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "#fff",
  },
  noticeItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  noticeDot: {
    flexShrink: 0,
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#c17a4a",
    marginTop: 6,
  },
  noticeTitle: { fontSize: 13, fontWeight: 500, color: "#2a2724" },
  noticeTitleDanger: { fontSize: 13, fontWeight: 500, color: "#b83232" },
  noticeDesc: { fontSize: 12, color: "#6b6558", marginTop: 3, lineHeight: 1.5 },
  methodRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    marginBottom: 16,
  },
  multiHint: { fontSize: 12, fontWeight: 400, color: "#8a8478" },
  methodBtn: {
    padding: 10,
    background: "#fff",
    border: "1px solid #d9d2c4",
    borderRadius: 10,
    fontSize: 13,
    color: "#2a2724",
    cursor: "pointer",
  },
  methodPicked: {
    background: "#2d4030",
    color: "#fff",
    border: "1px solid #2d4030",
  },
  doneCheck: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 14,
    border: "1px solid #d9d2c4",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16,
    cursor: "pointer",
  },
  btnDisabled: { background: "#cfc9bb", cursor: "not-allowed", marginTop: 0 },
  keyWarn: {
    border: "1.5px solid #d99a9a",
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 20,
    background: "#fff",
  },
  keyWarnTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#b83232",
    marginBottom: 8,
  },
  record: {
    display: "flex",
    gap: 12,
    padding: 14,
    border: "1px solid #ebe6da",
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    background: "#fff",
  },
  recordIcon: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#e8ede2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  disclaimer: {
    display: "flex",
    gap: 8,
    padding: 12,
    background: "#e8ede2",
    borderRadius: 10,
    fontSize: 12,
    color: "#5c6b54",
    lineHeight: 1.6,
    marginTop: 12,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    border: "1px solid #ebe6da",
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 8,
    background: "#fff",
  },
  disclaimerBox: {
    border: "1px solid #ebe6da",
    borderRadius: 14,
    padding: "16px 18px",
    background: "#e8ede2",
    marginTop: 14,
  },
  errorText: {
    fontSize: 12,
    color: "#c0392b",
    marginTop: -8,
    marginBottom: 12,
    textAlign: "center",
  },
};

// ============================================================
// 타임라인 화면 전용 스타일 (참고 이미지 디자인)
// 크림 배경 + 포레스트 그린 + 테라코타 주황
// ============================================================
const t = {
  wrap: {
    minHeight: "100vh",
    background: "#f3f0e9",
    padding: "28px 40px 48px",
    fontFamily: "-apple-system, 'Noto Sans KR', sans-serif",
    color: "#2a2724",
    boxSizing: "border-box",
  },
  // 상단 네비
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 1040,
    margin: "0 auto",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#2d4030",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 700,
  },
  brandName: { fontSize: 16, fontWeight: 700, whiteSpace: "nowrap" },
  navMenu: { display: "flex", gap: 28, fontSize: 14 },
  navActive: {
    color: "#2d4030",
    fontWeight: 700,
    borderBottom: "2px solid #c17a4a",
    paddingBottom: 4,
    cursor: "pointer",
  },
  navItem: { color: "#6b6558", cursor: "pointer", paddingBottom: 4 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#ece8de",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    cursor: "pointer",
  },
  divider: {
    maxWidth: 1040,
    margin: "20px auto 0",
    borderTop: "1px solid #e0dbcf",
  },

  // 헤드라인
  hero: { maxWidth: 1040, margin: "36px auto 0" },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 3,
    color: "#c17a4a",
    fontWeight: 600,
    marginBottom: 16,
  },
  headline: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1.35,
    margin: 0,
    fontFamily: "'Noto Serif KR', serif",
    letterSpacing: "-0.5px",
  },
  accent: { color: "#c17a4a" },
  chips: { display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" },
  chip: {
    fontSize: 13,
    color: "#6b6558",
    background: "#faf8f3",
    border: "1px solid #e0dbcf",
    borderRadius: 20,
    padding: "6px 14px",
  },
  chipGreen: {
    fontSize: 13,
    color: "#2d4030",
    background: "#e8ede2",
    borderRadius: 20,
    padding: "6px 14px",
    fontWeight: 500,
  },
  chipGray: {
    fontSize: 13,
    color: "#8a8478",
    background: "#ece8de",
    borderRadius: 20,
    padding: "6px 14px",
    fontWeight: 500,
  },

  // 2단 그리드
  grid: {
    maxWidth: 1040,
    margin: "18px auto 0",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
  },

  // 초록 카드
  greenCard: {
    background: "#2d4030",
    borderRadius: 18,
    padding: "28px 30px",
    color: "#e8e5dc",
  },
  greenLabel: { fontSize: 13, color: "#a6b3a0", marginBottom: 18 },
  dRow: { display: "flex", alignItems: "baseline", gap: 6 },
  dPrefix: { fontSize: 24, fontWeight: 300, color: "#c9d1c2" },
  dNum: {
    fontSize: 68,
    fontWeight: 800,
    color: "#fff",
    lineHeight: 1,
    fontFamily: "'Noto Serif KR', serif",
  },
  greenTitle: { fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 14 },
  greenDesc: { fontSize: 13, color: "#a6b3a0", marginTop: 8, lineHeight: 1.6 },
  ctaBtn: {
    marginTop: 22,
    background: "#c17a4a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "13px 22px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  // 계약 여정 카드
  journeyCard: {
    background: "#faf8f3",
    border: "1px solid #ebe6da",
    borderRadius: 18,
    padding: "26px 30px",
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#2d4030",
    marginBottom: 20,
  },
  journeyList: { display: "flex", flexDirection: "column" },
  jItem: { display: "flex", gap: 14, minHeight: 54 },
  jLeft: { display: "flex", flexDirection: "column", alignItems: "center" },
  jDot: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#fff",
    border: "2px solid #cfc9bb",
    flexShrink: 0,
    zIndex: 1,
  },
  jDotDone: { background: "#2d4030", border: "2px solid #2d4030" },
  jDotActive: { background: "#c17a4a", border: "2px solid #c17a4a" },
  jDotPast: { background: "#d4cdbd", border: "2px solid #d4cdbd" },
  jLine: {
    width: 2,
    flex: 1,
    background: "#e0dbcf",
    marginTop: 2,
    marginBottom: 2,
  },
  jBody: { paddingBottom: 20 },
  jNameRow: { display: "flex", alignItems: "center", gap: 8 },
  jName: { fontSize: 14, fontWeight: 600, color: "#2a2724" },
  jBadgeDone: {
    fontSize: 10,
    color: "#2d4030",
    background: "#e8ede2",
    borderRadius: 8,
    padding: "2px 7px",
    fontWeight: 600,
  },
  jBadgeNow: {
    fontSize: 10,
    color: "#fff",
    background: "#c17a4a",
    borderRadius: 8,
    padding: "2px 7px",
    fontWeight: 600,
  },
  jBadgePast: {
    fontSize: 10,
    color: "#8a8478",
    background: "#ece8de",
    borderRadius: 8,
    padding: "2px 7px",
    fontWeight: 600,
  },
  jDate: { fontSize: 12, color: "#8a8478", marginTop: 3 },
  jDesc: { fontSize: 12, color: "#a29a8a", marginTop: 4, lineHeight: 1.4 },

  // 하단 보조 카드: 최근 활동
  recentCard: {
    background: "#faf8f3",
    border: "1px solid #ebe6da",
    borderRadius: 16,
    padding: "20px 24px",
  },
  recentLabel: {
    fontSize: 13,
    color: "#6b6558",
    marginBottom: 14,
    fontWeight: 600,
  },
  recentRow: { display: "flex", alignItems: "center", gap: 12 },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#e8ede2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  recentTitle: { fontSize: 14, fontWeight: 600, color: "#2d4030" },
  recentSub: { fontSize: 12, color: "#8a8478", marginTop: 2 },
  recentEmpty: { fontSize: 13, color: "#a29a8a", lineHeight: 1.6 },
  recentBtn: {
    marginTop: 16,
    background: "none",
    border: "none",
    color: "#c17a4a",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },

  // 하단 보조 카드: 오늘의 팁
  tipCard: { background: "#e8ede2", borderRadius: 16, padding: "20px 24px" },
  tipLabel: {
    fontSize: 13,
    color: "#2d4030",
    fontWeight: 700,
    marginBottom: 10,
  },
  tipText: { fontSize: 13, color: "#3f5140", lineHeight: 1.7 },
};
// ── 화면 10: 지출 항목 설정 (홈키퍼 새 화면) ──
// mock 단계: 아직 서버 없이 화면 흐름만 확인한다
function ExpenseSetup({ go }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [expenses, setExpenses] = useState([]);
  // 수정 중인 항목의 id (null이면 등록 모드)
  const [editingId, setEditingId] = useState(null);
  // 입력 검증 에러 메시지 { name, amount, due_day }
  const [errors, setErrors] = useState({});
  // ── 서버에서 지출 목록을 불러오는 함수 ──
  const loadExpenses = async () => {
    try {
      const res = await fetch(`${API_URL}/api/expenses`);
      const data = await res.json(); // 응답을 객체로 변환
      setExpenses(data); // 목록 상태에 넣기
    } catch (err) {
      console.log("목록 불러오기 실패:", err);
    }
  };

  // ── 화면이 처음 뜰 때 목록을 자동으로 불러온다 ──
  useEffect(() => {
    loadExpenses();
  }, []); // [] = 처음 한 번만 실행
  // ── 항목 삭제: 서버로 DELETE 요청 ──
  const handleDelete = async (id) => {
    // 실수로 지우는 걸 막기 위해 한 번 확인
    if (!window.confirm("이 항목을 삭제할까요?")) return;

    try {
        const res = await fetch(`${API_URL}/api/expenses/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("삭제에 실패했어요.");
        return;
      }

      loadExpenses(); // 목록 새로고침
    } catch (err) {
      alert("서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해주세요.");
    }
  };
  // ── 수정 시작: 폼에 기존 값을 채운다 ──
  const startEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setAmount(String(item.amount));
    setDueDay(String(item.due_day));
  };

  // ── 수정 취소: 폼을 비우고 등록 모드로 ──
  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setDueDay("");
  };
  // ── 추가 버튼: 서버로 POST 요청을 보내 DB에 저장 ──
  // ── 입력 중 실시간 검증: 해당 항목만 검사해서 에러를 갱신 ──
  const validateField = (field, value) => {
    // 현재 입력값 전체를 모아서 검증
    const current = { name, amount: Number(amount), due_day: Number(dueDay) };
    current[field] = field === "name" ? value : Number(value);

    const result = validateExpense(current);
    // 해당 항목의 에러만 갱신 (다른 항목은 건드리지 않음)
    setErrors((prev) => ({ ...prev, [field]: result[field] }));
  };
  // ── 추가 또는 수정 (editingId에 따라 갈림) ──
  const handleAdd = async () => {
    // 입력 검증 — 문제가 있으면 여기서 멈춘다
    const validationErrors = validateExpense({
      name: name,
      amount: Number(amount),
      due_day: Number(dueDay),
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    // 수정 모드면 PUT, 등록 모드면 POST
    const isEdit = editingId !== null;
    const url = isEdit
      ? `${API_URL}/api/expenses/${editingId}`
      : `${API_URL}/api/expenses`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          amount: Number(amount),
          due_day: Number(dueDay),
        }),
      });

      if (!res.ok) {
        alert(isEdit ? "수정에 실패했어요." : "저장에 실패했어요.");
        return;
      }

      cancelEdit(); // 폼 비우고 등록 모드로 복귀
      loadExpenses(); // 목록 새로고침
    } catch (err) {
      alert("서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해주세요.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* 홈키퍼 브랜드 로고 (첫 화면과 통일) */}
        <div style={styles.introBrand}>
          <span style={styles.introLogo}>홈</span>
          <span style={styles.introBrandName}>홈키퍼</span>
        </div>
        <div style={styles.header}>
          <span style={styles.title}>지출 항목</span>
          <button
            style={styles.ghostBtn}
            onClick={() => window.location.reload()}
          >
            🔄 새로고침
          </button>
        </div>
        <p style={styles.desc}>
          집에 나가는 돈을 등록해두면, 홈키퍼가 챙겨드려요.
        </p>

        <label style={styles.label}>항목 이름</label>
        <input
          style={styles.input}
          placeholder="관리비"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            validateField("name", e.target.value);
          }}
        />
        {errors.name && <p style={styles.errorText}>{errors.name}</p>}
        <label style={styles.label}>금액 (원)</label>
        <input
          style={styles.input}
          type="number"
          placeholder="120000"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            validateField("amount", e.target.value);
          }}
        />
        {errors.amount && <p style={styles.errorText}>{errors.amount}</p>}

        <label style={styles.label}>납부일 (매월 며칠)</label>
        <input
          style={styles.input}
          type="number"
          placeholder="25"
          value={dueDay}
          onChange={(e) => {
            setDueDay(e.target.value);
            validateField("due_day", e.target.value);
          }}
        />
        {errors.due_day && <p style={styles.errorText}>{errors.due_day}</p>}
        <button style={styles.primaryBtn} onClick={handleAdd}>
          {editingId ? "수정하기" : "추가하기"}
        </button>

        {/* 수정 중일 때만 취소 버튼 표시 */}
        {editingId && (
          <button
            onClick={cancelEdit}
            style={{
              width: "100%",
              height: 44,
              marginTop: 8,
              background: "none",
              color: "#8a8478",
              border: "1px solid #d9d2c4",
              borderRadius: 10,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            수정 취소
          </button>
        )}
        {/* 이번 달 총 지출 (합계) */}
        {expenses.length > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: "18px 20px",
              background: "#2d4030",
              borderRadius: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ width: "100%" }}>
              <div style={{ fontSize: 13, color: "#a6b3a0", marginBottom: 6 }}>이번 달 고정 지출</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
                {expenses.reduce((sum, item) => sum + item.amount, 0).toLocaleString("ko-KR")}
                <span style={{ fontSize: 17, marginLeft: 2 }}>원</span>
              </div>
            </div>
          </div>
        )}
        {/* 이번 달 남은 지출 */}
        {expenses.length > 0 && (
          <div
            style={{
              marginTop: 10,
              padding: "12px 20px",
              background: "#fff",
              border: "1px solid #ebe6da",
              borderRadius: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "#8a8478" }}>
              이번 달 남은 금액
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#2d4030" }}>
              {expenses
                .filter((item) => isThisMonth(item.due_day))
                .reduce((sum, item) => sum + item.amount, 0)
                .toLocaleString("ko-KR")}
              원
            </span>
          </div>
        )}
        {/* 임박 알림 */}
        {(() => {
          const urgent = [...expenses]
            .filter((item) => getDaysUntil(item.due_day) <= 3)
            .sort((a, b) => getDaysUntil(a.due_day) - getDaysUntil(b.due_day));

          if (urgent.length === 0) return null;

          return (
            <div
              style={{
                marginTop: 10,
                padding: "14px 18px",
                background: "#fbe9e7",
                border: "1px solid #f5c6bd",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#c0392b",
                  marginBottom: 8,
                }}
              >
                🔔 곧 납부할 항목이 있어요
              </div>
              {urgent.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "#8a4038",
                    padding: "3px 0",
                  }}
                >
                  <span>
                    {item.name} · {getDdayLabel(getDaysUntil(item.due_day))}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {item.amount.toLocaleString("ko-KR")}원
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
        <div style={{ marginTop: 28 }}></div>
        <div style={{ marginTop: 28 }}>
          {expenses.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#a8a296",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#8a8478" }}>
                아직 등록된 지출이 없어요
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                위에서 첫 지출을 등록해보세요
              </div>
            </div>
          ) : (
            [...expenses]
              .sort((a, b) => getDaysUntil(a.due_day) - getDaysUntil(b.due_day))
              .map((item) => {
                const days = getDaysUntil(item.due_day);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 18px",
                      background: "#fff",
                      border: "1px solid #ebe6da",
                      borderRadius: 14,
                      marginBottom: 10,
                      boxShadow: "0 1px 6px rgba(45,64,48,0.04)",
                    }}
                  >
                    {/* 아이콘 */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#e8ede2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      🏠
                    </div>
                    {/* 이름 + 납부일 */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#2d4030",
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8a8478",
                          marginTop: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>매월 {item.due_day}일 납부</span>
                        <span
                          style={{
                            background: days <= 3 ? "#fbe9e7" : "#f0ede4",
                            color: days <= 3 ? "#c0392b" : "#8a8478",
                            borderRadius: 20,
                            padding: "2px 9px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {getDdayLabel(days)}
                        </span>
                      </div>
                    </div>
                    {/* 금액 */}
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#2d4030",
                      }}
                    >
                      {item.amount.toLocaleString("ko-KR")}원
                      <button
                        onClick={() => startEdit(item)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#a29a8a",
                          fontSize: 15,
                          cursor: "pointer",
                          padding: "0 4px",
                          flexShrink: 0,
                        }}
                        title="수정"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#a29a8a",
                          fontSize: 18,
                          cursor: "pointer",
                          padding: "0 4px",
                          flexShrink: 0,
                        }}
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
