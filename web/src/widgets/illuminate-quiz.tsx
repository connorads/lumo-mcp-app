import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useEffect, useRef } from "react";
import {
  useToolInfo,
  useSendFollowUpMessage,
  useWidgetState,
  useLayout,
  DataLLM,
} from "../helpers.js";

/* ── Types ────────────────────────────────────────────────── */

/* ── Component ───────────────────────────────────────────── */

function IlluminateQuiz() {
  const toolState = useToolInfo<"illuminate-quiz">();
  const sendFollowUp = useSendFollowUpMessage();
  const [state, setState] = useWidgetState<{ answeredId: string | null }>({
    answeredId: null,
  });
  const { theme } = useLayout();
  const followUpSent = useRef(false);

  const input = toolState.isSuccess ? toolState.input : null;
  const answeredId = state.answeredId;
  const isAnswered = answeredId != null;

  useEffect(() => {
    if (!isAnswered || !input || followUpSent.current) return;

    const isCorrect = answeredId === input.correctId;
    const chosenText =
      input.options.find((o) => o.id === answeredId)?.text ?? answeredId;

    const t = setTimeout(() => {
      followUpSent.current = true;
      if (isCorrect) {
        void sendFollowUp(
          `I got the quiz about "${input.topic}" correct! Continue teaching me — show me the next concept.`,
        );
      } else {
        void sendFollowUp(
          `I got the quiz about "${input.topic}" wrong (chose '${chosenText}'). Can you explain this concept differently, maybe with a different diagram or analogy?`,
        );
      }
    }, 1500);

    return () => clearTimeout(t);
  }, [isAnswered, answeredId, input, sendFollowUp]);

  if (!toolState.isSuccess || !input) {
    return (
      <div className="ill-loading">
        <div className="ill-spinner" />
      </div>
    );
  }

  const { question, options, correctId, explanation, topic } = input;

  const getOptionClass = (optionId: string): string => {
    if (!isAnswered) return "";
    if (optionId === answeredId && optionId === correctId) return "ill-correct";
    if (optionId === answeredId && optionId !== correctId) return "ill-wrong";
    if (optionId === correctId) return "ill-correct-highlight";
    return "";
  };

  const getMarkerSymbol = (optionId: string): string => {
    if (!isAnswered) return optionId;
    if (optionId === answeredId && optionId === correctId) return "✓";
    if (optionId === answeredId && optionId !== correctId) return "✗";
    if (optionId === correctId) return "✓";
    return optionId;
  };

  const isCorrect = isAnswered && answeredId === correctId;
  const dataContent = isAnswered
    ? `Quiz on "${topic}": answered ${isCorrect ? "correctly" : "incorrectly"} (chose option ${answeredId})`
    : `Quiz on "${topic}": awaiting answer`;

  return (
    <DataLLM content={dataContent}>
      <div className="ill-quiz-root" data-theme={theme}>
        <div className="ill-quiz-eyebrow">Quick check</div>

        <p className="ill-quiz-question">{question}</p>

        <div className="ill-quiz-options">
          {options.map((option) => (
            <button
              key={option.id}
              className={["ill-option", getOptionClass(option.id)].filter(Boolean).join(" ")}
              onClick={() => {
                if (!isAnswered) setState({ answeredId: option.id });
              }}
              disabled={isAnswered}
            >
              <span className="ill-option-marker">
                {getMarkerSymbol(option.id)}
              </span>
              {option.text}
            </button>
          ))}
        </div>

        {isAnswered && (
          <div className="ill-explanation-box">
            <div className="ill-explanation-label">
              {isCorrect ? "Correct!" : "Not quite —"}
            </div>
            {explanation}
          </div>
        )}

        {isAnswered && (
          <p className="ill-sending">Continuing the lesson…</p>
        )}
      </div>
    </DataLLM>
  );
}

export default IlluminateQuiz;
mountWidget(<IlluminateQuiz />);
