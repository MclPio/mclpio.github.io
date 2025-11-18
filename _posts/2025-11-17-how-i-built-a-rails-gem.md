---
title: "I Built a Rails Gem to Stop Burning Through LLM API Credits"
date: 2025-11-17
categories:
  - Software Development
tags:
  - ruby
  - rails
  - ai
  - cost-tracking
description: How I prevented my AI app from maxing out my OpenRouter API key by building a production ready cost tracking gem
---

I built [stencil-ai.xyz](https://stencil-ai.xyz) *(currently sunset but still live)*, a Rails app that processes multiple AI prompts in parallel to generate custom outputs. The goal: eliminate the daily chore of professionals repeatedly rewriting similar prompts.

But there was a problem I saw coming: uncontrolled API costs.

Running parallel prompts with no limits would quickly max out my API key. I needed proper usage tracking and rate limiting before launching to users.

I didn't find a gem that handled this problem. So I built one.

## The Solution: open_router_usage_tracker

[![Gem Version](https://badge.fury.io/rb/open_router_usage_tracker.svg)](https://badge.fury.io/rb/open_router_usage_tracker)  [![CI](https://github.com/MclPio/open_router_usage_tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/MclPio/open_router_usage_tracker/actions/workflows/ci.yml)

A plug and play Rails engine that:
- Logs every API call with token counts and costs
- Aggregates daily usage per user/model/provider
- Makes rate limit checks
- Supports OpenRouter, OpenAI, Anthropic, Google, and xAI

Here's how it works in your app:
```ruby
# After calling your LLM API
OpenRouterUsageTracker.log(
  response: api_response,
  user: current_user,
  provider: "open_router"
)

# Check daily cost for a specific provider
summary = current_user.daily_usage_summary_for(
  day: Date.current,
  provider: "open_router",
  model: "openai/gpt-4o"
)

if summary && summary.cost > 5.00
  return "Daily limit reached"
end
```

That's it. The gem handles the rest.

## How I Built It

### 1. The Database Schema: Why Two Tables?

Initially I had one `usage_logs` table and I would sum it every time to check total usage. However that was a bad idea because SUM is O(n) time operation.

I split it into two tables:
```ruby
# usage_logs: Raw data, every API call
create_table :open_router_usage_logs do |t|
  t.string :model, null: false
  t.integer :total_tokens, null: false
  t.decimal :cost, null: false
  t.references :user, polymorphic: true
  t.string :request_id, null: false
  t.string :provider, null: false
  t.json :raw_usage_response
end

# daily_summaries: Aggregated data, indexed for speed
create_table :open_router_daily_summaries do |t|
  t.references :user, polymorphic: true
  t.date :day, null: false
  t.integer :total_tokens, null: false
  t.decimal :cost, null: false
  t.string :provider, null: false
  t.string :model, null: false
end

add_index :open_router_daily_summaries,
  [:user_type, :user_id, :day, :provider, :model],
  unique: true
```

Rate limit checks are now O(1) lookups instead of O(n) sums. When you're checking limits on every API request, this matters.

### 2. Preventing Race Conditions

When multiple background jobs log usage simultaneously, you get race conditions.

I wrapped everything in transactions:
```ruby
ApplicationRecord.transaction do
  usage_log = UsageLog.create!(attributes)
  update_daily_summary(usage_log)
  usage_log
end
```

The `daily_summaries` table uses a composite unique index on `[:user_type, :user_id, :day, :provider, :model]`. This ensures atomic updates even under concurrent writes.

### 3. Supporting Multiple Providers Without If/Else Spaghetti

Each LLM provider returns different response formats. I could have written:
```ruby
if provider == "openai"
  prompt_tokens = response.dig("usage", "input_tokens")
elsif provider == "anthropic"
  prompt_tokens = response.dig("usage", "input_tokens")
elsif provider == "google"
  prompt_tokens = response.dig("usageMetadata", "promptTokenCount")
# ... 50 more lines
```

Instead, I built modular parsers:
```ruby
module OpenRouterUsageTracker
  module Parsers
    class OpenAi
      def self.parse(response)
        {
          model: response.dig("model"),
          prompt_tokens: response.dig("usage", "input_tokens").to_i,
          completion_tokens: response.dig("usage", "output_tokens").to_i,
          total_tokens: response.dig("usage", "total_tokens").to_i,
          cost: response.dig("usage", "cost").to_f,
          request_id: response["id"]
        }
      end
    end
  end
end
```

The main adapter selects the right parser dynamically:
```ruby
parser_class = "OpenRouterUsageTracker::Parsers::#{provider.camelize}".constantize
attributes = parser_class.parse(response)
```

Adding a new provider = create one new parser class. No touching existing code.

### 4. Testing

**Polymorphic associations** - Works with any user model (User, Account, Organization):
```ruby
class Account < ApplicationRecord
  include OpenRouterUsageTracker::Trackable
end

account = Account.create!
OpenRouterUsageTracker.log(response: response, user: account)
```

**Concurrent writes** - No race conditions:
```ruby
threads = []
threads << Thread.new { OpenRouterUsageTracker.log(response: response_1, user: user) }
threads << Thread.new { OpenRouterUsageTracker.log(response: response_2, user: user) }
threads.each(&:join)

summary = user.daily_summaries.find_by(day: Date.current)
assert_equal 1, user.daily_summaries.count # Only one summary, not two
```

**Data retention** - Proper handling when users are deleted:
```ruby
# Default: usage data persists after user deletion
class User < ApplicationRecord
  include OpenRouterUsageTracker::Trackable
end

# Optional: delete usage data with user
class User < ApplicationRecord
  include OpenRouterUsageTracker::Trackable

  has_many :usage_logs, as: :user, class_name: "OpenRouterUsageTracker::UsageLog", dependent: :destroy
  has_many :daily_summaries, as: :user, class_name: "OpenRouterUsageTracker::DailySummary", dependent: :destroy
end
```

These tests gave me confidence the gem would work in production with any new changes/features.

## What I'd Considered

**1. Add async logging:** Currently synchronous. Should offer `log_usage_async` that enqueues a background job. Right now I call the gem from inside a background job in my app, but a general purpose gem should handle this internally.

**2. Redis caching for high traffic apps:** Querying the database for every rate check works fine for most apps. For 1000+ requests/second, caching `daily_summaries` in Redis would help. This one is interesting to write testing for, right now I kept the gem's scope simple.

**3. Better handling of missing cost data:** Some providers (OpenAI, Google) don't return cost in their API responses. You have to calculate it yourself. The gem should optionally accept pricing config and calculate costs automatically. The tricky part: pricing can change unpredictably, so you'd need either manual config updates or an API to fetch current rates.

## The Result

Solved my problem and can now re use this logic on other AI apps to track usage and control costs.

Total build time: ~1 month of scattered work (a few hours here and there).

More importantly, I can now confidently offer free tiers and paid plans on any app because I know exactly what each user costs me.

---

**Repo:** [github.com/MclPio/open_router_usage_tracker](https://github.com/MclPio/open_router_usage_tracker)
**RubyGems:** [rubygems.org/gems/open_router_usage_tracker](https://rubygems.org/gems/open_router_usage_tracker)

Built something similar? I'd love to see it