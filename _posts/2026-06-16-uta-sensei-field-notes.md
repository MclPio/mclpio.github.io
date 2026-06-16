---
title: "Uta Sensei Field Notes"
date: 2026-06-16
categories:
  - AI
  - Japanese
tags:
  - japanese
  - hackathon
  - local-llm
  - hugging-face
description: I built Uta Sensei, a small local model Japanese lyrics study app for the 2026 Build Small Hackathon.
---

> Field notes for the 2026 Build Small Hackathon.

![Decorative Uta Sensei artwork](https://raw.githubusercontent.com/MclPio/uta-sensei/main/assets/readme/ARC-26166-2342-3x4.png)

I built Uta Sensei because I listen to Japanese songs at the gym, usually in rotation with *southern hip hop* 🐬 In the car, doing normal life things, I kept thinking: repetition is already happening, so why not turn it into study?

That is the whole product idea. Take lyrics from a song I already enjoy, turn them into a compact Japanese lesson, and make every replay a little more understandable than the last one.

The app lets you paste lyrics or upload a saved lesson JSON. It keeps the original lyric lines, adds furigana, vocabulary, translations, grammar notes when useful, and gives you an English first tutor for follow up questions. You can export the lesson as Markdown, save the lesson JSON, or generate an Anki vocabulary deck.

Tiny Aya Global 3.35B runs locally through llama.cpp. No hosted model API is in the product path. The public Space is slow on CPU Basic, but that is also part of the point: this is a small model app you can actually download and run yourself.

[Tiny Aya's 2026 technical report](https://arxiv.org/abs/2603.11510) describes the model family as a 3.35B parameter multilingual release trained across 70 languages, with global and region specialized variants. That made it a good fit for a Japanese learning app where local inference and multilingual judgment both mattered.

## The Hardest Part Was Scope

The most annoying part was deciding what the product even was. The coding was manageable once the shape was clear.

I spent days in uncommitted work trying to optimize for the hackathon. Prize strategy, sponsor models, fine tuning, frontend polish, local inference, Anki, Notion, Gradio, React, Docker, Hugging Face Spaces. Yikes.

At some point I had to stop trying to win every possible angle and optimize the tool itself. Cohere's Tiny Aya was explicitly positioned around multilingual language ability, it was small enough for the spirit of the event, and it fit the Japanese learning use case better than forcing a model choice just because a prize category existed.

The app became:

- generate a structured lesson from lyrics;
- restore saved lessons instantly;
- ask a tutor questions about the lesson;
- export study material.

Nothing else was needed.

## The Main Architecture Choice

The biggest technical decision was not asking the small model to do everything.

Python is responsible for deterministic work: preserving lyric lines, tokenization, readings, furigana, validation, filenames, JSON loading, Markdown export, and Anki export.

Tiny Aya does language judgment: translation, concise vocabulary meanings, optional grammar notes, and tutor responses.

That split is important. Because, when the model tried to produce readings or align vocabulary by array position, bad things happened. Definitions shifted. Romaji appeared where it did not belong. Furigana boundaries got suspicious.

So the pipeline became more deterministic. A Python package Janome handles Japanese tokenization. The model receives exact token IDs. Vocabulary meanings come back keyed by those IDs instead of by fragile array order. The model is explicitly told not to output romaji or Japanese text inside English definitions. Repeated lyric lines are preserved, but identical context windows can reuse the same annotation.

The lesson generator (via Tiny Aya Global) also uses a three line sliding window: previous line, target line, next line. Lyrics often rely on omitted subjects and emotional continuity, so one isolated line can be misleading. The context helps, but the source line remains the source line. The model is not allowed to rewrite it.

## Fine Tuning Was Attempted

I wanted to fine tune. Or more like, I wanted the fine tuning story to be stronger.

I used Modal to build a small supervised dataset, run a BF16 LoRA training job, merge the model, convert to GGUF, and benchmark the result. The pipeline worked. The artifacts exist. The training loss improved.

But the final benchmark did not justify shipping the tuned model.

My hope was that GPT-5.5, as a SOTA model, would make it easy to distill excellent synthetic data. But Uta Sensei needed Tiny Aya to do two different jobs: return strict structured JSON for lessons and behave naturally as a tutor in chat. Fine tuning that without damaging the stock model's behavior turned out to be trickier than I expected.

So, the stock Tiny Aya Q4_K_M model passed 24 out of 24 strict lesson contract cases. The tuned Q4_K_M model passed 21 out of 24. The merged BF16 and LoRA adapter were better than the tuned GGUF, but the deployed runtime needed to be the thing that worked best in the app.

So I shipped stock Tiny Aya.

That was disappointing. Better looking training logs are not the same thing as a better learner experience. Fine tuning small language models for structured language education is a huge problem: dataset design, validation, benchmark construction, human review, and regression testing all matter. I wanted to go deeper there, but I did not leave enough time for it.

## Working With Codex

Codex was the engineering collaborator for this project, but my workflow only worked when I frontloaded decisions.

If you use Codex this may help: do not throw a vague product blob at the agent and hope it becomes good software. Frontload the research. Read the framework docs yourself. Decide the milestones. Decide what good looks like. Then let Codex execute against those decisions.

Codex helped research current Gradio, React, llama.cpp, Modal, TRL, PEFT, and Tiny Aya behavior. It implemented the pipeline milestones, wrote tests, caught stale assumptions, helped debug Hugging Face Space deployment, built the React over Gradio frontend, and kept the repo moving when I was deep in double coffees and RATE LIMIT RESET energy.

But the important product calls still had to be explicit. I had to decide when we were overcomplicating things, when to stop chasing a prize angle, when to keep the frontend simple, when to ship stock instead of tuned, and when the app was good enough for the hackathon deadline.

That feels close to the OpenAI "harness engineering" advice: the human builds the harness, defines the direction, and checks the work. Codex is very good at executing once the path is clear.

## What Shipped

Uta Sensei now has:

- a custom React interface served by a Gradio/FastAPI backend;
- local Tiny Aya inference through llama.cpp;
- lesson generation from pasted lyrics;
- saved lesson JSON upload and download;
- line by line lesson viewing with furigana, vocabulary, and grammar;
- tutor chat with context budget handling and clear chat support;
- Markdown export for Notion style notes;
- Anki deck export for vocabulary review;
- a synthetic sample lesson for fast review on CPU Basic.

The Space is not fast on free CPU hardware. So my demo video mattered because it shows the intended flow without making judges wait through every model call. But the app works, the model runs locally, and the exported study material is good.

I wish I had spent less time prize optimizing at the start and more time refining the fine tuning dataset. Still, I am happy with the result. This has been an app I wanted to build for a while now, and the build-small-hackathon gave me a good excuse.

## Links

- Hugging Face Space: <https://huggingface.co/spaces/mclpio/uta-sensei>
- Demo video: <https://youtu.be/tjf4PxIw_G0>
- Social post: <https://x.com/odincode/status/2066244542605521032?s=20>
