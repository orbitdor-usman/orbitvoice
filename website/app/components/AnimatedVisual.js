"use client";
import { useState } from "react";
import Icon from "./Icon";

export function HeroVisual() {
  const [paused, setPaused] = useState(false);
  return (
    <div className={`hero-visual ${paused ? "is-paused" : ""}`}>
      <div className="preview-label">
        <span>VOICE → TEXT</span>
        <span>PRODUCT PREVIEW</span>
      </div>
      <div className="recorder-window">
        <div className="recorder-title">
          <span className="window-controls" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Orbitvoice</span>
          <Icon name="wave" />
        </div>
        <div className="recorder-body">
          <div className="recorder-status">
            <span className="status-chip">
              <Icon name="mic" /> Listening
            </span>
            <span>Voice input</span>
          </div>
          <svg
            className="voice-visual"
            viewBox="0 0 480 132"
            role="img"
            aria-label="Illustrated audio waveform"
          >
            <path d="M0 66h480" stroke="currentColor" opacity=".12" />
            {Array.from({ length: 49 }, (_, i) => {
              const height = Math.round(
                6 +
                  Math.sin((Math.PI * i) / 48) ** 1.5 *
                    (24 + Math.sin(i * 1.8) ** 2 * 74),
              );
              return (
                <g key={i} transform={`translate(${12 + i * 9.5} 66)`}>
                  <rect
                    className="audio-bar"
                    x="-1.5"
                    y={-height / 2}
                    width="3"
                    height={height}
                    rx="1.5"
                    fill="currentColor"
                    style={{
                      animationDelay: `${-i * 0.13}s`,
                      animationDuration: `${1.4 + (i % 5) * 0.22}s`,
                    }}
                  />
                </g>
              );
            })}
          </svg>
          <div className="transcript-preview">
            <div className="transcript-heading">
              <Icon name="book" />
              <span>At your cursor</span>
              <Icon name="check" />
            </div>
            <p>
              Your next great idea
              <br />
              starts with your voice.
              <span className="typing-caret" aria-hidden="true" />
            </p>
          </div>
          <div className="recorder-bottom">
            <span>Speak naturally. Keep your flow.</span>
            <span className="preview-mic">
              <Icon name="mic" />
            </span>
          </div>
        </div>
      </div>
      <div className="preview-caption">
        <span>
          <Icon name="cursor" /> Listening at your cursor
        </span>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "Play animation" : "Pause animation"}
        </button>
      </div>
      <div className="shortcut-card">
        <span className="shortcut-icon">
          <Icon name="mic" />
        </span>
        <div>
          <strong>Your voice. One shortcut.</strong>
          <span>
            <kbd>Ctrl</kbd>
            <b>+</b>
            <kbd>Shift</kbd>
            <b>+</b>
            <kbd>Space</kbd>
          </span>
        </div>
        <span className="shortcut-ready">MIC READY</span>
      </div>
    </div>
  );
}
