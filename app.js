const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storeKey = "asset-appraiser-wrong-quiz-v2";
const today = () => new Date().toLocaleDateString("sv-SE");

const emptyData = () => ({
  answered: 0,
  correct: 0,
  favorites: [],
  mastered: [],
  history: {},
});

let data;
try {
  data = { ...emptyData(), ...JSON.parse(localStorage.getItem(storeKey) || "{}") };
} catch {
  data = emptyData();
}

let filter = { subject: "全部", chapter: "全部", count: 10 };
let session = [];
let index = 0;
let selected = new Set();
let submitted = false;
let score = 0;
let startTime = 0;
let sessionWrong = [];

const normalize = (letters) => [...letters].sort().join("");
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const isMastered = (id) => data.mastered.includes(id);
const isDue = (question) => !isMastered(question.id) && question.reviewDate <= today();

function save() {
  localStorage.setItem(storeKey, JSON.stringify(data));
  refreshHome();
}

function show(id) {
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function filteredQuestions({ includeMastered = false } = {}) {
  return QUESTION_BANK.filter((question) => {
    const subjectMatch = filter.subject === "全部" || question.subject === filter.subject;
    const chapterMatch = filter.chapter === "全部" || question.chapter === filter.chapter;
    return subjectMatch && chapterMatch && (includeMastered || !isMastered(question.id));
  });
}

function chapters() {
  const list = [...new Set(
    QUESTION_BANK
      .filter((question) => filter.subject === "全部" || question.subject === filter.subject)
      .map((question) => question.chapter),
  )];
  $("#chapterSelect").innerHTML = '<option value="全部">全部章节</option>' +
    list.map((chapter) => `<option value="${chapter}">${chapter}</option>`).join("");
  filter.chapter = "全部";
  updatePool();
}

function updatePool() {
  $("#poolCount").textContent = `${filteredQuestions().length} 题可用`;
}

function refreshHome() {
  const remaining = QUESTION_BANK.filter((question) => !isMastered(question.id)).length;
  const due = QUESTION_BANK.filter(isDue).length;
  $("#answeredStat").textContent = data.answered;
  $("#accuracyStat").textContent = data.answered ? `${Math.round(data.correct / data.answered * 100)}%` : "—";
  $("#wrongStat").textContent = remaining;
  $("#wrongBadge").textContent = remaining;
  $("#dueBadge").textContent = due;
  $("#favoriteBadge").textContent = data.favorites.length;
  updatePool();
}

function begin(items) {
  if (!items.length) {
    alert("这一组暂时没有题目。已掌握的题目不会重复出现。");
    return;
  }
  session = items;
  index = 0;
  score = 0;
  sessionWrong = [];
  startTime = Date.now();
  show("#quizView");
  renderQuestion();
}

function renderQuestion() {
  const question = session[index];
  selected = new Set();
  submitted = false;
  $("#progressText").textContent = `${index + 1}/${session.length}`;
  $("#progressBar").style.width = `${(index + 1) / session.length * 100}%`;
  $("#questionMeta").textContent = `${question.subject} · ${question.chapter} · ${question.id}`;
  $("#questionType").textContent = question.type;
  $("#questionText").textContent = question.text;
  $("#multipleHint").classList.toggle("hidden", question.type !== "多选题");
  $("#starBtn").textContent = data.favorites.includes(question.id) ? "★" : "☆";
  $("#options").innerHTML = question.options.map((option) => `
    <button class="option" data-letter="${option.letter}">
      <span class="letter">${option.letter}</span><span>${option.text}</span>
    </button>`).join("");
  $$(".option").forEach((button) => button.addEventListener("click", () => selectOption(button)));
  $("#submitBtn").disabled = true;
  $("#submitBtn").classList.remove("hidden");
  $("#answerPanel").classList.add("hidden");
}

function selectOption(button) {
  if (submitted) return;
  const question = session[index];
  const letter = button.dataset.letter;
  if (question.type === "多选题") {
    selected.has(letter) ? selected.delete(letter) : selected.add(letter);
  } else {
    selected = new Set([letter]);
  }
  $$(".option").forEach((option) => option.classList.toggle("selected", selected.has(option.dataset.letter)));
  $("#submitBtn").disabled = selected.size === 0;
}

function submit() {
  if (!selected.size || submitted) return;
  submitted = true;
  const question = session[index];
  const correctSet = new Set(question.answer);
  const ok = normalize(selected) === normalize(correctSet);
  data.answered += 1;
  data.history[question.id] = {
    attempts: (data.history[question.id]?.attempts || 0) + 1,
    lastAnswer: normalize(selected),
    lastCorrect: ok,
    lastAnswered: new Date().toISOString(),
  };
  if (ok) {
    data.correct += 1;
    score += 1;
  } else if (!sessionWrong.includes(question.id)) {
    sessionWrong.push(question.id);
  }

  $$(".option").forEach((button) => {
    const letter = button.dataset.letter;
    if (correctSet.has(letter)) button.classList.add("correct");
    if (selected.has(letter) && !correctSet.has(letter)) button.classList.add("wrong");
    button.disabled = true;
  });

  $("#resultLine").textContent = ok ? "答对了，这个点更稳了。" : "答错了，先看清这次错在哪里。";
  $("#resultLine").className = `result-line ${ok ? "good" : "bad"}`;
  $("#correctAnswer").textContent = question.answer.join("、");
  $("#originalAnswer").textContent = question.originalAnswer || "未记录";
  $("#explanation").textContent = question.explanation;
  $("#memory").textContent = question.memory ? `记忆提示：${question.memory}` : "";
  $("#memory").classList.toggle("hidden", !question.memory);
  $("#source").textContent = `来源：${question.source}`;
  $("#masterBtn").textContent = isMastered(question.id) ? "取消已掌握" : "标记已掌握";
  $("#masterBtn").classList.remove("hidden");
  $("#nextBtn").textContent = index === session.length - 1 ? "查看本组结果" : "下一题";
  $("#submitBtn").classList.add("hidden");
  $("#answerPanel").classList.remove("hidden");
  save();
}

function next() {
  if (index < session.length - 1) {
    index += 1;
    renderQuestion();
  } else {
    finish();
  }
}

function finish() {
  const minutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));
  $("#resultScore").textContent = `${score} / ${session.length}`;
  $("#timeUsed").textContent = `${minutes}分`;
  $("#newWrong").textContent = sessionWrong.length;
  const rate = score / session.length;
  $("#resultEmoji").textContent = rate === 1 ? "✨" : rate >= 0.6 ? "🌿" : "🌱";
  $("#resultMessage").textContent = rate === 1
    ? "这一组全部拿下。"
    : rate >= 0.6
      ? "大部分已经稳住，错题再刷一次。"
      : "已经找到薄弱点，下一轮只盯这些题。";
  $("#retryWrongBtn").classList.toggle("hidden", !sessionWrong.length);
  show("#resultView");
}

$("#subjectChips").addEventListener("click", (event) => {
  const button = event.target.closest(".chip");
  if (!button) return;
  $$("#subjectChips .chip").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  filter.subject = button.dataset.subject;
  chapters();
});

$("#modeChips").addEventListener("click", (event) => {
  const button = event.target.closest(".mode");
  if (!button) return;
  $$("#modeChips .mode").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  filter.count = Number(button.dataset.count);
});

$("#chapterSelect").addEventListener("change", (event) => {
  filter.chapter = event.target.value;
  updatePool();
});

$("#startBtn").addEventListener("click", () => begin(shuffle(filteredQuestions()).slice(0, filter.count)));
$("#wrongBookBtn").addEventListener("click", () => begin(shuffle(QUESTION_BANK.filter((q) => !isMastered(q.id))).slice(0, filter.count)));
$("#dueBtn").addEventListener("click", () => begin(shuffle(QUESTION_BANK.filter(isDue)).slice(0, filter.count)));
$("#favoriteBtn").addEventListener("click", () => begin(shuffle(QUESTION_BANK.filter((q) => data.favorites.includes(q.id))).slice(0, filter.count)));
$("#submitBtn").addEventListener("click", submit);
$("#nextBtn").addEventListener("click", next);
$("#backBtn").addEventListener("click", () => {
  if (confirm("退出本组？已完成题目的记录会保留。")) show("#homeView");
});
$("#starBtn").addEventListener("click", () => {
  const id = session[index].id;
  const favoriteIndex = data.favorites.indexOf(id);
  favoriteIndex < 0 ? data.favorites.push(id) : data.favorites.splice(favoriteIndex, 1);
  $("#starBtn").textContent = favoriteIndex < 0 ? "★" : "☆";
  save();
});
$("#masterBtn").addEventListener("click", () => {
  const id = session[index].id;
  const masteredIndex = data.mastered.indexOf(id);
  masteredIndex < 0 ? data.mastered.push(id) : data.mastered.splice(masteredIndex, 1);
  $("#masterBtn").textContent = masteredIndex < 0 ? "取消已掌握" : "标记已掌握";
  save();
});
$("#retryWrongBtn").addEventListener("click", () => begin(shuffle(QUESTION_BANK.filter((q) => sessionWrong.includes(q.id)))));
$("#homeBtn").addEventListener("click", () => show("#homeView"));
$("#resetBtn").addEventListener("click", () => {
  if (confirm("确定清空答题、掌握状态和收藏记录吗？")) {
    data = emptyData();
    save();
  }
});

chapters();
refreshHome();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
