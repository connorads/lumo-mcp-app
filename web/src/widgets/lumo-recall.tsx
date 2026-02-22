import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useState } from "react";
import {
  useToolInfo,
  useSendFollowUpMessage,
  useWidgetState,
  useLayout,
  DataLLM,
} from "../helpers.js";

/* ── Types ────────────────────────────────────────────────── */

type BlankState = {
  value: string;
  correct: boolean | null; // null = not checked yet
};

type WidgetState = {
  answers: Record<string, BlankState>;
  allCorrect: boolean;
};

/* ── Parse prompt into segments ──────────────────────────── */

type Segment = { type: "text"; text: string } | { type: "blank"; id: string };

function parsePrompt(prompt: string): Segment[] {
  const parts = prompt.split(/\{\{([^}]+)\}\}/g);
  const segments: Segment[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      if (part) segments.push({ type: "text", text: part });
    } else {
      segments.push({ type: "blank", id: part });
    }
  });
  return segments;
}

/* ── Normalise answer for comparison ─────────────────────── */

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ── Component ───────────────────────────────────────────── */

function IlluminateFillBlank() {
  const toolState = useToolInfo<"illuminate-fill-blank">();
  const sendFollowUp = useSendFollowUpMessage();
  const [state, setState] = useWidgetState<WidgetState>({
    answers: {},
    allCorrect: false,
  });
  const { theme } = useLayout();
  const [followUpSent, setFollowUpSent] = useState(false);

  const input = toolState.isSuccess ? toolState.input : null;

  if (!toolState.isSuccess || !input) {
    return (
      <div className="ill-loading">
        <div className="ill-spinner" />
      </div>
    );
  }

  const { prompt, blanks, explanation, topic } = input;
  const segments = parsePrompt(prompt);
  const answers = state.answers ?? {};
  const allCorrect = state.allCorrect ?? false;

  const checkAnswer = (id: string, value: string) => {
    const blank = blanks.find((b) => b.id === id);
    if (!blank) return;
    const correct = normalise(value) === normalise(blank.answer);
    const nextAnswers = {
      ...answers,
      [id]: { value, correct },
    };
    const nextAllCorrect =
      blanks.every((b) => nextAnswers[b.id]?.correct === true);
    setState({ answers: nextAnswers, allCorrect: nextAllCorrect });
  };

  const sendContinue = () => {
    if (followUpSent) return;
    setFollowUpSent(true);
    void sendFollowUp(
      `I completed the fill-in-the-blank exercise about "${topic}" — continue teaching me.`,
    );
  };

  const dataContent = allCorrect
    ? `Fill-blank on "${topic}": all blanks correct`
    : `Fill-blank on "${topic}": in progress`;

  return (
    <DataLLM content={dataContent}>
      <div
        className={["ill-fill-root", allCorrect ? "ill-celebrate" : ""].filter(Boolean).join(" ")}
        data-theme={theme}
      >
        <div className="ill-quiz-eyebrow">Fill in the blank</div>
        <p className="ill-instruction">Press Enter to check each answer</p>

        <p className="ill-fill-prompt">
          {segments.map((seg, i) => {
            if (seg.type === "text") return <span key={i}>{seg.text}</span>;

            const blankDef = blanks.find((b) => b.id === seg.id);
            const blankState = answers[seg.id];
            const isCorrect = blankState?.correct === true;
            const isWrong = blankState?.correct === false;

            return (
              <span key={i} className="ill-fill-blank-wrap">
                <input
                  className={[
                    "ill-fill-input",
                    isCorrect ? "ill-correct" : "",
                    isWrong ? "ill-wrong" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="text"
                  aria-label={`blank ${seg.id}`}
                  readOnly={isCorrect}
                  defaultValue={blankState?.value ?? ""}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      checkAnswer(seg.id, e.currentTarget.value);
                    }
                  }}
                  onBlur={(e) => {
                    if (!isCorrect) checkAnswer(seg.id, e.currentTarget.value);
                  }}
                />
                {isWrong && blankDef?.hint && (
                  <span className="ill-fill-hint">{blankDef.hint}</span>
                )}
              </span>
            );
          })}
        </p>

        {allCorrect && (
          <div className="ill-explanation-box ill-success">
            <div className="ill-explanation-label">All correct!</div>
            {explanation}
          </div>
        )}

        {allCorrect && !followUpSent && (
          <button className="ill-continue-btn" onClick={sendContinue}>
            Continue →
          </button>
        )}

        {allCorrect && followUpSent && (
          <p className="ill-sending">Continuing the lesson…</p>
        )}
      </div>
    </DataLLM>
  );
}

export default IlluminateFillBlank;
mountWidget(<IlluminateFillBlank />);
