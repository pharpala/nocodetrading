"""FastAPI application for the no-code trading strategy sandbox.

Run from the backend directory:

  python -m venv .venv
  .venv/bin/pip install -r requirements.txt
  .venv/bin/uvicorn app:app --reload --host 127.0.0.1 --port 8000
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from repo root before anything else
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    ParseStrategyInput,
    ParseStrategyOutput,
    BacktestInput,
    BacktestOutput,
)
from llm_parse import parse_strategy, parse_strategy_with_llm, get_symbol_hint, LLMParseError
from engine import run_backtest

app = FastAPI(
    title="No-Code Trading Strategy Sandbox",
    description="Parse natural language strategies and run backtests.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _has_api_key() -> bool:
    return bool(os.environ.get("MARTIAN_API_KEY") or os.environ.get("OPENAI_API_KEY"))


@app.post("/parse_strategy", response_model=ParseStrategyOutput)
def parse_strategy_endpoint(body: ParseStrategyInput) -> ParseStrategyOutput:
    """
    Parse natural language into a validated strategy graph.
    Automatically uses the Martian AI router when MARTIAN_API_KEY is set;
    falls back to rule-based parsing if no key is configured.
    """
    # Use LLM whenever explicitly requested or a key is available
    if body.use_llm or _has_api_key():
        try:
            graph, symbol = parse_strategy_with_llm(body.text)
            return ParseStrategyOutput(graph=graph, symbol=symbol)
        except LLMParseError as e:
            raise HTTPException(
                status_code=400,
                detail={"message": e.message, "fallback_graph": e.fallback_graph.model_dump()},
            )

    # Rule-based fallback (no key configured)
    graph  = parse_strategy(body.text)
    symbol = get_symbol_hint(body.text)
    return ParseStrategyOutput(graph=graph, symbol=symbol)


@app.post("/backtest", response_model=BacktestOutput)
def backtest_endpoint(body: BacktestInput) -> BacktestOutput:
    """Run a backtest for the given strategy graph and parameters."""
    try:
        return run_backtest(body.graph, body.params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health() -> dict[str, str]:
    key_status = "martian" if os.environ.get("MARTIAN_API_KEY") else (
        "openai" if os.environ.get("OPENAI_API_KEY") else "none"
    )
    return {"status": "ok", "ai_backend": key_status}
