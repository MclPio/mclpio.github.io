---
title: "judgement-ai: grading search queries and more"
date: 2026-04-02
categories:
  - AI
  - Search
tags:
  - AI
  - Search
  - Tools
  - Python
description: I built an LLM judgement tool to grade query result pairs
---

After reading an article that used experts to judge the quality of search results, I realized I could build an LLM pipeline that can do that, well almost. In this post, I will introduce [`judgement-ai`](https://github.com/MclPio/judgement-ai), a tool I made in 2 days, and the challenge of validation.

## What Was the Problem?

When you search for a product on any ecommerce site, there are thousands of items that match, and multiple processes connect together in order to get the top N items back.

I will focus on one step: tuning the top N items that a user sees. For example, if I search for "lemons" in my favorite ecommerce store, I would get 30 items back on the first page, usually this is where the customer decides whether to buy.

Having the most relevant item at the top matters. Get this wrong and you lose credibility for having a bad search engine.

## How Search Quality is Measured

When a search query runs, two things matter: did we get back enough relevant results (recall), and are the right results at the top (precision). Getting those two things right is hard, and knowing whether you have gotten them right requires a way to measure it.

That is where NDCG (Normalized Discounted Cumulative Gain) comes in. It scores your ranked results by asking: are the most relevant items appearing first? A score of 1.0 means perfect ordering, and anything lower means relevant results are being buried. The catch is that to calculate NDCG, you need someone to first label how relevant each result is for a given query and that is traditionally done by human experts.

## What judgement-ai Does

[`judgement-ai`](https://github.com/MclPio/judgement-ai) is a grading pipeline for query result pairs. You give it queries and search results, point it at an LLM, and it assigns relevance scores that can be written to JSON or Quepid CSV for downstream evaluation and tuning. It also supports incremental writes, resume, and failure logging. But is it any good?

## Validation: Is It Any Good?

This is the hard part. It is easy to engineer a benchmark that "passes" if you manipulate your data hard enough, so I tried to be objective.

I used the [Amazon ESCI dataset](https://arxiv.org/abs/2206.06588) as ground truth: a large collection of search queries with human labeled relevance scores across four categories:

| Score | Label | Meaning |
|-------|-------|---------|
| 3 | Exact | Directly satisfies the search intent, including constraints like brand, size, and compatibility |
| 2 | Substitute | A different product that could plausibly satisfy the same need, but not an exact match |
| 1 | Complement | A related accessory or add on, but not what the shopper is actually trying to buy |
| 0 | Irrelevant | Does not satisfy the shopping intent at all |

I sampled 200 rows using a round robin approach to avoid query concentration, then measured how well the AI scores agreed with the human labels using two metrics:

- **Spearman correlation** measures whether the AI ranks results in the same relative order as humans. A score of 1.0 means perfect agreement in ordering, 0 means no relationship at all.
- **Exact agreement** measures how often the AI assigned the exact same label as the human, a stricter test.

| Model | Spearman | Exact Agreement |
|-------|----------|-----------------|
| Qwen3.5-9B-no_think | 0.31 | 42.5% |
| GPT-5.4 | 0.42 | 47% |

Looking at how each model distributed its scores tells an interesting story:

| Score | Human | Qwen3.5-9B-no_think | GPT-5.4 |
|-------|-------|-------|-------|
| 0 - Irrelevant | 50 | 72 | 56 |
| 1 - Complement | 50 | 54 | 44 |
| 2 - Substitute | 50 | 38 | 72 |
| 3 - Exact | 50 | 36 | 28 |

The human labels were evenly distributed by design: 50 per category, since I sampled using round robin. The local model (Qwen3.5-9B-no_think) skewed toward harsher judgements, overcalling Irrelevant and undercalling Exact. GPT-5.4 had the opposite problem, inflating Substitute scores at the expense of Exact. Neither model perfectly mirrors human distribution, which is worth investigating further.

One more thing worth calling out: using Spearman correlation here was probably a mistake. Spearman assumes the scores have a clean ordinal relationship, that 3 is strictly better than 2, which is better than 1, and so on. But ESCI labels are not really a relevance ladder: Substitute and Complement do not have an obvious ordering between them. Is a Substitute more relevant than a Complement? It depends entirely on context. So Spearman was likely penalizing the model for disagreements that do not actually matter. Exact agreement is probably best metric here and at 42.5% for local and 47% for GPT-5.4, there is clearly still work to do.

## What's Next

Three things I want to do next.

**Better validation**: the Amazon ESCI benchmark was a good starting point but I need a cleaner experiment. Better sampling, a metric that actually fits the label taxonomy, and ideally a dataset closer to a real search use case rather than an Amazon product catalog. On the metrics side, I want to move away from Spearman entirely and lean into metrics that respect the categorical nature of ESCI labels if I continue to use it.

**Improving the pipeline**: there are still rough edges to iron out. Prompt engineering, cleaner CLI input and output configuration, further testing, and better documentation.

**Finding a use case**: If you are working on improving your search engine results, it may be worth [trying the tool now](https://github.com/MclPio/judgement-ai). It is just a pipeline between your data and an LLM. I also want to explore whether this goes beyond search: can the same approach grade other kinds of text? Prompt effectiveness, content quality, recommendation relevance?

## Resources

- [Fullscript Builder Blog — Developing a Modern Search Stack](https://builders.fullscript.com/posts/developing-a-modern-search-stack-an-overview)
- Reddy et al. (2022). *Shopping Queries Dataset: A Large-Scale ESCI Benchmark for Improving Product Search.* [arXiv:2206.06588](https://arxiv.org/abs/2206.06588)