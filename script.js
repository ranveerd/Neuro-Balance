// Point this at wherever your FastAPI server is running.
const API_URL = "http://127.0.0.1:8000/predict";

const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const btnSpinner = submitBtn.querySelector(".btn-spinner");
const errorBox = document.getElementById("form-error");

const resultEmpty = document.getElementById("result-empty");
const resultContent = document.getElementById("result-content");
const scoreNumberEl = document.getElementById("score-number");
const scoreTierEl = document.getElementById("score-tier");
const gaugeFillEl = document.getElementById("gauge-fill");

const NUMERIC_FIELDS = new Set([
  "age",
  "avg_daily_usage_hours",
  "daily_unlocks",
  "study_hours",
  "physical_activity_hours",
  "sleep_hours_per_night",
]);

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnSpinner.hidden = !isLoading;
  btnLabel.textContent = isLoading ? "Calculating…" : "Get my score";
}

function collectPayload() {
  const formData = new FormData(form);
  const payload = {};
  for (const [key, value] of formData.entries()) {
    payload[key] = NUMERIC_FIELDS.has(key) ? Number(value) : value;
  }
  return payload;
}

function scoreTier(score) {
  if (score >= 8) return { label: "Thriving", color: "#8FBF9F" };
  if (score >= 6) return { label: "Steady", color: "#C9D6A0" };
  if (score >= 4) return { label: "Strained", color: "#E0B968" };
  return { label: "At risk", color: "#E08F6F" };
}

function renderResult(score) {
  const clamped = Math.max(0, Math.min(10, score));
  const tier = scoreTier(clamped);

  resultEmpty.hidden = true;
  resultContent.hidden = false;

  scoreNumberEl.textContent = score.toFixed(1);
  scoreTierEl.textContent = tier.label;
  gaugeFillEl.style.width = `${(clamped / 10) * 100}%`;
  gaugeFillEl.style.background = tier.color;
}

async function extractErrorMessage(response) {
  try {
    const body = await response.json();
    if (Array.isArray(body.detail)) {
      const first = body.detail[0];
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "field";
      return `${field}: ${first.msg}`;
    }
    if (typeof body.detail === "string") return body.detail;
  } catch (_) {
    // fall through to generic message
  }
  return `Request failed (${response.status}).`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = collectPayload();
  setLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      showError(message);
      return;
    }

    const data = await response.json();
    renderResult(data.predicted_mental_health_score);
  } catch (err) {
    showError("Couldn't reach the prediction server. Is it running at " + API_URL + "?");
  } finally {
    setLoading(false);
  }
});
