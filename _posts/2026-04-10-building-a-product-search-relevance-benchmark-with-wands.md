---
title: "Building a Product Search Relevance Benchmark with WANDS"
date: 2026-04-10
categories:
  - search
  - machine-learning
tags:
  - relevance
  - benchmarking
  - pandas
  - llm
  - information-retrieval
description: How I found, cleaned, and sampled the Wayfair WANDS dataset to build a validation benchmark for judgement-ai, my LLM based search relevance grading tool.
---

I've been building [judgement-ai](https://github.com/MclPio/judgement-ai), a tool that uses LLMs to grade search results for relevance. The idea is simple: give it a query and a list of results, and it returns a relevance score for each one. Useful for running automated relevance audits without paying human annotators for every experiment.

The obvious question is: how do you know if the LLM is actually grading well? You need human labeled data to compare against.

![wands](/assets/img/2026-04-10-wands.jpg)

## Finding the right dataset

My requirements were straightforward:

- human labeled, not derived from click logs or heuristics
- product search domain
- graded relevance, not binary
- publicly available

I found **WANDS**: the Wayfair Annotation Dataset, released alongside the paper [WANDS: Dataset for Product Search Relevance Assessment](https://dl.acm.org/doi/10.1007/978-3-030-99736-6_9) by Chen et al. at ECIR 2022. It has three clean labels: [`Irrelevant`, `Partial`, `Exact`] that map naturally to a 0/1/2 scale, 480 queries, ~43k products, and 233k human annotated query product pairs. MIT licensed, and available on [GitHub](https://github.com/wayfair/WANDS).

## Loading and understanding the data

WANDS ships as three tab separated CSV files:

- `query.csv`: 480 queries with a `query_id` and `query_class`
- `product.csv`: ~43k products with title, description, features, category
- `label.csv`: the join table: `(query_id, product_id, label)`

```python
import pandas as pd

WANDS_DIR = "./dataset"

queries  = pd.read_csv(f"{WANDS_DIR}/query.csv",  sep="\t")
products = pd.read_csv(f"{WANDS_DIR}/product.csv", sep="\t")
labels   = pd.read_csv(f"{WANDS_DIR}/label.csv",   sep="\t")
```

The first thing I checked was the overall label distribution:

```python
dist = labels["label"].value_counts()
print((dist / len(labels) * 100).round(1))
```

```
Partial       62.8
Irrelevant    26.2
Exact         11.0
```

`Partial` dominates heavily. A grader that assigns Partial to everything would score well on raw accuracy, which means naive metrics would make a lazy model look good. This is a problem a sampling strategy needs to solve.

## Stratified sampling

Each query has a wildly different number of annotated products, anywhere from 1 to 4,329. Just taking queries in order and using all their results gives you an unbalanced benchmark that's hard to reason about.

The solution is **stratified sampling**: for each query, take a fixed number of docs from each label bucket. I settled on 3 Exact + 3 Partial + 3 Irrelevant per query. This does three things:

1. Tests the grader to distinguish all three levels rather than defaulting to the majority class
2. Makes weighted kappa and Spearman more sensitive; they are less informative under heavy imbalance
3. Keeps the benchmark small and cheap to run (50 queries × 9 docs = 450 LLM calls per validation run)

```python
N = 3

sampled_labels = (
    labels
    .sample(frac=1, random_state=42)
    .groupby(["query_id", "label"])
    .head(N)
    .reset_index(drop=True)
)

# Attach query text and class
sampled = (
    sampled_labels
    .merge(queries, on="query_id")
    .merge(products[["product_id", "product_name", "product_class"]], on="product_id")
    [["query_id", "query", "product_id", "product_name", "product_class", "label"]]
    .sort_values(["query_id", "label"])
    .reset_index(drop=True)
)

```

## Checking coverage

Not every query has enough docs in every label bucket to fill 3-3-3:

```
exact      < 3: 169 queries
partial    < 3:  19 queries
irrelevant < 3: 113 queries
```

`Exact` is the bottleneck. 101 queries have zero Exact results at all. WANDS was constructed to include hard negatives and almost relevant products, so clean exact matches are naturally sparse.

243 out of 480 queries hit the full 3-3-3. Rather than using all of them, I narrowed to 50 by capping at 3 queries per `query_class` then sampling randomly (`random_state=42`). The reasons are practical and statistical: LLM calls are slow locally (about 4 seconds per call) and cost money on the API, 50 queries is enough to get stable metric estimates, and a stratified draw across furniture categories is likely more representative than exhaustively using all 243, which would be skewed toward whichever categories happen to have the most Exact labeled products.

```python
full_333_ids = sample_counts[
    (sample_counts["exact"] >= N) &
    (sample_counts["partial"] >= N) &
    (sample_counts["irrelevant"] >= N)
]["query_id"]
benchmark = sampled[sampled["query_id"].isin(full_333_ids)].reset_index(drop=True)

selected_queries = (
    full_333_ids
    .to_frame()
    .merge(queries[["query_id", "query_class"]], on="query_id")
    .groupby("query_class", group_keys=False)
    .apply(lambda x: x.sample(min(len(x), 3), random_state=42))
    .sample(50, random_state=42)
)

final = benchmark[benchmark["query_id"].isin(selected_queries["query_id"])]
# 50 queries, 450 docs
```

## Building the output files

judgement-ai expects a `results.json` file with product fields and a `queries.txt` file with one query per line. For validation I also need `human_labels.json` with the ground truth scores.

Label mapping:

```python
label_map = {"Exact": 2, "Partial": 1, "Irrelevant": 0}
```

For product fields I included everything that could be relevant to any query: title, category, category hierarchy, description, and features. I dropped `average_rating` and `review_count`, those are ranking signals, not relevance signals. A highly rated irrelevant product is still irrelevant.

```python
import json
import os

os.makedirs("validations", exist_ok=True)

product_lookup = products.set_index("product_id")
results = {}
human_labels = {}

for query, group in final.groupby("query"):
    results[query] = []
    human_labels[query] = []

    for rank, row in enumerate(group.itertuples(), start=1):
        p = product_lookup.loc[row.product_id]

        fields = {}
        if pd.notna(p["product_name"]):
            fields["title"] = p["product_name"]
        if pd.notna(p["product_class"]):
            fields["category"] = p["product_class"]
        if pd.notna(p["category hierarchy"]):
            fields["category_hierarchy"] = p["category hierarchy"]
        if pd.notna(p["product_description"]):
            fields["description"] = p["product_description"]
        if pd.notna(p["product_features"]):
            fields["features"] = p["product_features"].replace("|", ", ")

        results[query].append({
            "doc_id": str(row.product_id),
            "rank": rank,
            "fields": fields,
        })
        human_labels[query].append({
            "doc_id": str(row.product_id),
            "wands_label": row.label,
            "human_score": label_map[row.label],
        })

with open("validations/results.json", "w") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
with open("validations/human_labels.json", "w") as f:
    json.dump(human_labels, f, indent=2, ensure_ascii=False)
with open("validations/queries.txt", "w") as f:
    f.write("\n".join(results.keys()))
```

Final output: **50 queries, 450 docs**, reproducible with fixed random seeds.

Each query has an identical 3/3/3 label distribution, which removes class imbalance as a confounder in evaluation metrics.

## What's next

The benchmark is ready. The next step is running judgement-ai against `results.json` and comparing its scores to `human_labels.json`. Some metrics I thought of trying:

- **Weighted kappa**: the headline agreement metric, accounts for ordinal distance between scores
- **Spearman r and Kendall tau-b**: ordinal correlation with human labels
- **nDCG@3**: whether sorting by predicted score produces the correct ranking
- **Confusion matrix**: where exactly does it fail, and is `Partial` the hard case I expect it to be
- **Per category breakdown**: does the grader perform differently on `Beds` vs `Cabinet Hardware`

The balanced 3-3-3 label distribution was designed with these metrics in mind, weighted kappa and Spearman lose resolution under heavy class imbalance, and nDCG becomes less informative when one label dominates the ranking.

I also want to run the same benchmark across a few models, I am thinking locally with `qwen3.5:9b`, and API via `openai/gpt-5.4-mini` to see whether model choice matters more or less than prompt configuration.

[judgement-ai](https://github.com/MclPio/judgement-ai) allows you to deeply customize your LLM calls, it can be unclear which settings are optimal. You can swap models and providers, tune temperature, set domain context, write custom grading instructions, or take full ownership with a prompt file. The scale labels themselves are configurable: 

```yaml
scale_labels:
    0: "Irrelevant: I can say whatever I want here to let LLM know what to score as Irrelevant"
    1: "Partial: I can say anything here"
    2: "Exact: probably should just read the paper from WANDS to see human methodology and use it accordingly."
```

That is one interpretation, you can add a longer description and a different set of labels changes what the grader is even trying to decide. That's why the benchmark matters: without a fixed human labeled reference, you have no way to know whether a prompt change actually improved grading quality or just changed the output distribution.

I'll release a second blog with the findings.

---

*Chen, Y., Liu, S., Liu, Z., Sun, W., Baltrunas, L., & Schroeder, B. (2022). WANDS: Dataset for Product Search Relevance Assessment. In Advances in Information Retrieval, ECIR 2022.*