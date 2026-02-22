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

/* ── Component ───────────────────────────────────────────── */

function LumoQuiz() {
  const toolState = useToolInfo<"lumo-quiz">();
  const sendFollowUp = useSendFollowUpMessage();
  const [state, setState] = useWidgetState<{ answeredId: string | null }>({
    answeredId: null,
  });
  const { theme } = useLayout();
  const [followUpSent, setFollowUpSent] = useState(false);

  const input = toolState.isSuccess ? toolState.input : null;
  const answeredId = state.answeredId;
  const isAnswered = answeredId != null;

  if (!toolState.isSuccess || !input) {
    return (
      <div className="lumo-loading">
        <div className="lumo-spinner" />
      </div>
    );
  }

  const { question, options, correctId, explanation, topic } = input;
  const isCorrect = isAnswered && answeredId === correctId;

  const sendContinue = () => {
    if (followUpSent || !answeredId) return;
    setFollowUpSent(true);
    const chosenText = options.find((o) => o.id === answeredId)?.text ?? answeredId;
    if (isCorrect) {
      void sendFollowUp(
        `I got the quiz about "${topic}" correct! Continue teaching me — show me the next concept.`,
      );
    } else {
      void sendFollowUp(
        `I got the quiz about "${topic}" wrong (chose '${chosenText}'). Can you explain this concept differently, maybe with a different diagram or analogy?`,
      );
    }
  };

  const getOptionClass = (optionId: string): string => {
    if (!isAnswered) return "";
    if (optionId === answeredId && optionId === correctId) return "lumo-correct";
    if (optionId === answeredId && optionId !== correctId) return "lumo-wrong";
    if (optionId === correctId) return "lumo-correct-highlight";
    return "";
  };

  const getMarkerSymbol = (optionId: string): string => {
    if (!isAnswered) return optionId;
    if (optionId === answeredId && optionId === correctId) return "✓";
    if (optionId === answeredId && optionId !== correctId) return "✗";
    if (optionId === correctId) return "✓";
    return optionId;
  };

  const dataContent = isAnswered
    ? `Quiz on "${topic}": answered ${isCorrect ? "correctly" : "incorrectly"} (chose option ${answeredId})`
    : `Quiz on "${topic}": awaiting answer`;

  return (
    <DataLLM content={dataContent}>
      <div className="lumo-quiz-root" data-theme={theme}>
        <div className="lumo-quiz-eyebrow">Quick check</div>

        <p className="lumo-quiz-question">{question}</p>

        <div className="lumo-quiz-options">
          {options.map((option) => (
            <button
              key={option.id}
              className={["lumo-option", getOptionClass(option.id)].filter(Boolean).join(" ")}
              onClick={() => {
                if (!isAnswered) setState({ answeredId: option.id });
              }}
              disabled={isAnswered}
            >
              <span className="lumo-option-marker">
                {getMarkerSymbol(option.id)}
              </span>
              {option.text}
            </button>
          ))}
        </div>

        {isAnswered && (
          <div className={["lumo-explanation-box", isCorrect ? "lumo-success" : "lumo-retry"].join(" ")}>
            <div className="lumo-explanation-label">
              {isCorrect ? "Correct!" : "Not quite —"}
            </div>
            {explanation}
          </div>
        )}

        {isAnswered && !followUpSent && (
          <button className="lumo-continue-btn" onClick={sendContinue}>
            Continue →
          </button>
        )}

        {isAnswered && followUpSent && (
          <p className="lumo-sending">Continuing the lesson…</p>
        )}
      </div>
    </DataLLM>
  );
}

export default LumoQuiz;
mountWidget(<LumoQuiz />);
