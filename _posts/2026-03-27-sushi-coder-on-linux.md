---
title: "Sushi Coder on Linux: A Complete Setup Guide"
date: 2026-03-27
categories:
  - AI
  - Programming
tags:
  - ollama
  - opencode
  - qwen
  - local-ai
  - linux
  - gpu
  - amd
description: Run a locally fine-tuned coding AI with optional AMD GPU acceleration.
---

Most local AI coding tools feel like a compromise. This one doesn't — here's how to run a reinforcement-learning-trained coding model entirely on your own hardware, including older AMD GPUs that ROCm officially ignores.

## What Is Sushi Coder?

**Qwen3.5-9b-Sushi-Coder-RL** is a fine-tuned, reinforcement-learning-trained coding model built on top of Qwen 3.5 9B. It was trained on:

- Claude Opus 4.6 reasoning traces (`nohurry/Opus-4.6-Reasoning-3000x-filtered`)
- Competitive programming problems and solutions (`open-r1/codeforces-cots`)

After supervised fine-tuning, a reinforcement learning stage was run specifically for coding using NousResearch's Atropos pipeline. The result is a model that reasons through code problems rather than pattern-matching its way through them.

This guide covers the GGUF version, which runs on any Linux machine via Ollama — with optional AMD GPU acceleration for older unsupported cards.

---

## Prerequisites

- Linux (Ubuntu 22.04+ recommended)
- Python 3.10+
- At least 8GB RAM (16GB+ recommended)
- Optional: AMD GPU with RDNA2 architecture (RX 6000 series)

---

## Step 1 — Install Ollama

Ollama manages local model serving and exposes an OpenAI-compatible API endpoint.

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Verify it's running:

```bash
ollama --version
systemctl status ollama
```

---

## Step 2 — Download the Model

> **~5.6 GB download** — make sure you have enough space and a stable connection.

Install the Hugging Face CLI if you don't have it:

```bash
pip3 install huggingface_hub --user
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Download the Q4_K_M quant (5.63 GB — best balance of speed and quality):

```bash
hf download bigatuna/Qwen3.5-9b-Sushi-Coder-RL-GGUF \
  Qwen3.5-9b-Sushi-Coder-RL.Q4_K_M.gguf
```

---

## Step 3 — Register the Model with Ollama

Create a Modelfile pointing at your downloaded GGUF:

```bash
GGUF_PATH=$(find ~/.cache/huggingface/hub -name "Qwen3.5-9b-Sushi-Coder-RL.Q4_K_M.gguf" | head -1)
echo "FROM $GGUF_PATH" > ~/Modelfile

cat >> ~/Modelfile << 'EOF'

PARAMETER num_ctx 16384
{% raw %}
TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ range .Messages }}<|im_start|>{{ .Role }}
{{ .Content }}<|im_end|>
{{ end }}<|im_start|>assistant
"""
{% endraw %}
SYSTEM "You are a helpful coding assistant."
EOF
```

Register it with Ollama:

```bash
ollama create sushi-coder -f ~/Modelfile
```

Test it on CPU first to confirm it works:

```bash
ollama run sushi-coder "Write a Python hello world"
```

You should see a response generated. Once confirmed, move on.

---

## Step 4 — Enable AMD GPU Acceleration (Optional - for RX 6750XT 12GB users)

> **⚠️ Save your work before attempting this. This voids your warranty and could damage your system. I do not recommend it.**
>
> Skip this section if you don't have an AMD GPU, or if your GPU is officially ROCm-supported. Only follow this section for older RDNA2 cards like the RX 6700 XT that aren't on AMD's official support list. GPU driver issues can crash systems — test CPU mode works first and keep the revert command ready.

The trick is to override the GPU version so ROCm treats your card as a supported RDNA2 GPU, without installing the full ROCm stack system-wide (which is the common cause of crashes).

Create a systemd override file:

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
echo '[Service]
Environment="HSA_OVERRIDE_GFX_VERSION=10.3.0"' | sudo tee /etc/systemd/system/ollama.service.d/override.conf
```

Verify it saved correctly:

```bash
cat /etc/systemd/system/ollama.service.d/override.conf
```

Should show:
```ini
[Service]
Environment="HSA_OVERRIDE_GFX_VERSION=10.3.0"
```

Reload and restart Ollama:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

Test again — if it's noticeably faster, the GPU is working:

```bash
ollama run sushi-coder "Write a Python quicksort"
```

To monitor GPU activity while generating:

```bash
sudo apt install radeontop
radeontop
```

**To revert if anything goes wrong:**

```bash
sudo systemctl revert ollama
sudo systemctl restart ollama
```

---

## Step 5 — Install OpenCode

OpenCode is an open-source agentic coding tool — the closest open-source equivalent to Claude Code. It can read files, write files, run shell commands, and work through multi-step coding tasks.

```bash
curl -fsSL https://opencode.ai/install | bash
```

---

## Step 6 — Configure OpenCode for Sushi Coder

OpenCode needs to know about your local Ollama server. Create the config:

```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "local-ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Local Ollama",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "sushi-coder": {
          "name": "Sushi Coder",
          "options": {
            "num_ctx": 32768
          }
        }
      }
    }
  }
}
EOF
```

> **Why `local-ollama` and not `ollama`?** Using a custom provider ID prevents OpenCode from confusing your model with the built-in Ollama registry, which would trigger a tool support check and reject the model.

---

## Step 7 — Set Up a Project and Start Coding

Create an isolated directory for your project:

```bash
mkdir -p ~/projects/my-project
cd ~/projects/my-project
```

Launch OpenCode:

```bash
opencode
```

Inside OpenCode, select your model by typing `/models` and choosing **Sushi Coder** under the **Local Ollama** provider.

You're now running a locally fine-tuned coding AI with full agentic capabilities — file reading, file writing, shell access — entirely on your own hardware.

---

## Quant Comparison

| Quant | Size | VRAM | CPU RAM needed | Quality | Speed |
|-------|------|------|----------------|---------|-------|
| Q4_K_M | 5.63 GB | ~7 GB | ~8 GB | Good | Fast |
| Q8_0 | 9.53 GB | ~11 GB | ~12 GB | Better | Slower |

For most coding tasks Q4_K_M is the right choice. Use Q8_0 if you have 12GB+ VRAM and want higher quality responses.

---

## Troubleshooting

**`huggingface-cli: command not found`**
Use `hf` instead — it's the same tool with a shorter alias.

**Ollama not finding the model**
Run `ollama list` to confirm `sushi-coder` appears. If not, re-run `ollama create sushi-coder -f ~/Modelfile`.

**OpenCode says model doesn't support tools**
Make sure your provider ID in `opencode.json` is `local-ollama` (not `ollama`). The built-in `ollama` provider does a registry check that rejects custom models.

**GPU crashes system**
Run `sudo systemctl revert ollama && sudo systemctl restart ollama` to fall back to CPU. CPU mode works fine for interactive coding use.

**Slow generation**
First response is always slow (model load). Subsequent responses are faster. On CPU expect ~10-20 tokens/sec on a modern desktop CPU.

---

## Resources

- Model: https://huggingface.co/bigatuna/Qwen3.5-9b-Sushi-Coder-RL-GGUF
- Ollama: https://ollama.com
- OpenCode: https://opencode.ai
- Training pipeline: https://github.com/NousResearch/atropos
