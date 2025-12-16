---
title: "Swift Concurrency: From Ruby on Rails to async/await"
date: 2025-12-15
categories:
  - Swift
  - Programming
tags:
  - swift
  - concurrency
  - async-await
  - actors
  - ios-development
description: Learning Swift's concurrency model coming from Ruby on Rails - understanding async/await, task groups, and actors without the documentation jargon.
---

## Introduction

Coming from Ruby on Rails where the server handles concurrency for you, Swift's async/await felt like learning a completely different language because IT IS. Those weird `from:` and `to:` labels, the `await` everywhere, task groups that look like a mess... it was confusing.

BTW my resources are the on the [developer.apple.com](https://developer.apple.com/swift/get-started/) => A Swift Tour (Article)

Turns out, once you understand the core concepts, it all clicks into place. Here's what I learned.

## The Weird Syntax First

Before anything else, let's clear up the confusing parts:

```swift
func fetchUserID(from server: String) async -> Int {
    //            ^^^^  ^^^^^^
    //       label      parameter name
}
```

That `from:` isn't concurrency related at all. It's just Swift's way of making function calls read like English. When you call it: `fetchUserID(from: "primary")`. Inside the function, you use `server`. Coming from Ruby where you'd just write `fetch_user_id("primary")`, this seems verbose. But you get used to it. Also it is optional, so apple having it included there is good because you get to know about it but bad because why use a different alias for your argument!

## What async/await Actually Does

Here's the key thing I got wrong initially: `await` doesn't start work and move on. It **stops and waits**.

```swift
let userID1 = await fetchUserID(from: "primary")      // Wait here (1 sec)
let userID2 = await fetchUserID(from: "secondary")    // Then wait here (1 sec)
let userID3 = await fetchUserID(from: "development")  // Then wait here (1 sec)
// Total: 3 seconds
```

This runs sequentially. Each `await` blocks until that operation finishes. It's basically like synchronous code, just with explicit markers showing where things might take time.

So if `await` blocks, how do you run things in parallel?

## Three Ways to Do Parallel Work

### 1. async let - For a Few Different Tasks

```swift
async let image = fetchProfilePicture()
async let friendList = fetchFriendList()
async let posts = fetchRecentPosts()
// All three start immediately and run in parallel

let profile = await (image, friendList, posts)  // Now we wait for all of them
```

The pattern: start all the work with `async let` (no blocking), then `await` when you actually need the results. You can even do other work in between while they run in the background.

### 2. Task Groups - For Many Tasks of the Same Type

When you have an unknown number of tasks that all return the same type, task groups are what you want:

```swift
let photos = await withTaskGroup(of: Image.self) { group in
  // Start all tasks (doesn't wait)
  for url in photoURLs {
    group.addTask {
      return await fetchPhoto(url)
    }
  }
  
  // Collect results as they finish
  var results: [Image] = []
  for await result in group {
    results.append(result)
  }
  return results
}
```

Key insight: `for await` doesn't iterate in order. It grabs whichever task finishes next. If the third photo loads before the first, it gets added first.

### 3. Sequential awaits - When Order Matters

Sometimes you actually want things to happen one after another:

```swift
let userID = await fetchUserID(from: server)
let username = await fetchUsername(userID: userID)
```

The second call needs data from the first, so sequential makes sense.

## The Task Thing

Here's something that confused me: why do you need `Task { }` sometimes?

```swift
func buttonTapped() {  // Regular synchronous function
    Task {
        await connectUser(to: "primary")
    }
}
```

The answer: you can only use `await` inside async functions. Regular functions can't suspend execution. If they could, your UI would freeze while waiting.

`Task` creates a new async context. It's your bridge from synchronous code (like button handlers) to async code. The work happens in the background while your function continues.

But honestly, if you need to wait for the result, just make your function async:

```swift
func buttonTapped() async {
    await connectUser(to: "primary")
}
```

Cleaner and simpler.

## Actors - Solving Race Conditions

The biggest "aha" moment was understanding actors. They solve a problem I rarely encounter in my Rails projects, at least not in this verbose manner.

Imagine multiple async tasks all trying to modify the same array at once:

```swift
class ServerConnection {
    var activeUsers: [Int] = []
    
    func connect() async -> Int {
        let userID = await fetchUserID(from: "primary")
        activeUsers.append(userID)  // Multiple tasks could hit this at once!
        return userID
    }
}
```

If two tasks call `connect()` simultaneously, they might both try to append at the same time. Arrays aren't designed for that, you could corrupt data or crash.

Actors fix this:

```swift
actor ServerConnection {
    var activeUsers: [Int] = []
    
    func connect() async -> Int {
        let userID = await fetchUserID(from: "primary")
        activeUsers.append(userID)  // Safe! Only one task at a time
        return userID
    }
}
```

The `await` when calling `server.connect()` ensures only one task at a time can access the actor's data. Swift automatically serializes access.

## The Subtle Part About Actors

Here's what tripped me up: `await` inside an actor method **releases the lock**.

```swift
actor BankAccount {
    private var balance: Double = 1000.0
    
    func withdraw(amount: Double) async -> Bool {
        guard balance >= amount else { return false }
        await Task.sleep(nanoseconds: 1_000_000_000)  // Lock released here!
        balance -= amount
        return true
    }
}
```

Two tasks withdrawing $800 each? Both check the balance ($1000), both pass the guard, both subtract... you end up with -$600.

The fix: do the critical work before any `await`:

```swift
func withdraw(amount: Double) async -> Bool {
    guard balance >= amount else { return false }
    balance -= amount  // Update first
    await notifyBankServer()  // Then do the slow stuff
    return true
}
```

## What I Actually Use

For most cases, I use:
- `async let` when I need 2-3 different things in parallel
- Task groups when I'm fetching many items of the same type
- Actors when multiple tasks might modify shared state

The real power is in progressive loading. Instead of waiting for all 50 photos to download, you can display them as they arrive:

```swift
for await image in group {
    loadedImages.append(image)  // UI updates immediately
}
```

Users see results as they load instead of staring at a blank screen.

## Conclusion

Swift concurrency felt overwhelming at first, but it boils down to a few patterns:
- `await` blocks and waits
- `async let` starts work you'll need later
- Task groups run many things in parallel
- Actors prevent race conditions
- `Task` bridges sync to async

The hard part is remembering that `await` inside an actor releases the lock.

But once you understand these pieces, you can build responsive apps that don't freeze the UI while fetching data. Coming from Rails where the server handles this, it's a different mental model. But it gives you control over exactly what runs when.