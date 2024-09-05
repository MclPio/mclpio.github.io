---
title: "How To Make An LRU Cache Using Python"
date: 2024-09-05
categories:
  - Data Structures
  - Algorithms
  - Python
  - LeetCode Solutions
  - System Design
tags:
  - LRU Cache
  - Caching
  - Linked Lists
  - Hash Maps
  - OrderedDict
  - Doubly Linked List
  - O(1) Operations
  - Memory Optimization
  - Python Data Structures
  - LeetCode 146
---

# Intro

In this article I will be solving leetcode 146 LRU Cache. Using python `OrderedDict()` then implementing it via doubly linked list and python`Dict()`

## What is it?

A Least Recently Used (LRU) Cache is a method for caching key-value pair data. The idea is to keep the most recently accessed data in your cache while evicting the least recently used data when the cache reaches its capacity

## How does it work?

Efficient implementations use:

- Doubly linked List for O(1) insertion and removal
- Hash Map (dicionary) for O(1) lookup

The other implementation that I will go over involve using a Dictionary with indexing

# Algorithm

1. Initialize
    1. capacity, in our example it is 3
    1. cache, which is just an empty Dict {}
    1. left node(0,0) and right node(0,0)
        1. The left node will point to the least recently used item, and the right node will be used for new insertions

    ![init lru cache](/assets/img/2024-09-05-lru-cache-init.svg)

1. Adding new nodes
    1. When we enter a new key
        1. We can see that when a new node is added, we rely on the right pointer to select a previous node and insert the new node in the middle
        1. We also update the dictionary (cache) with a key that corresponds to the nodes we insert into the doubly linked list

    ![adding new nodes](/assets/img/2024-09-05-lru-cache-add-node.svg)

    1. When our key already exists
        1. We remove the key from our doubly linked list
        1. We update our cache with the new value of the key, basically making a new Node object and overwriting it
        1. We insert our new key to our doubly linked list, of course using the right pointer so it is the most recently used node in our cache

1. Adding nodes when we reach capacity
    1. We first insert the new node into our cache and doubly linked list, then we check if we are over capacity
    1. If we are over capacity, we need to remove the LRU node which we can easily get from our left pointer
    1. We use our left pointer to point to the value after the LRU node which leaves the LRU node out to be deleted later using the garbage collector
    1. Finally we remove the key that points to it from our cache

    ![adding node when we reach capacity](/assets/img/2024-09-05-lru-cache-add-node-full-capacity.svg)

1. Using get
    1. When value exists in the cache
        1. We first need to remove the value from our doubly linked list; we use the node itself to then create pointers to the next and previous and use them to point at each other
        1. Then we insert it again into the list so it is the latest used node. We use the right pointer to do that
        1. Finally we return the value from the node, the Dict has a pointer to the node so that is easy

    ![using get to return node value](/assets/img/2024-09-05-lru-cache-get.svg)

    1. When the value does not exist in the cache
        1. Our function would just return -1

# Implementation

### Python OrderedDict
Redis has a good [article](https://redis.io/glossary/lru-cache/
) which gave me the idea to try solving with [`OrderedDict`](https://docs.python.org/3/library/collections.html#collections.OrderedDict) first

```python
from collections import OrderedDict

class LRUCache:

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key, last=False)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache[key] = value
            self.cache.move_to_end(key, last=False)
        else:
            if self.capacity == len(self.cache):
                self.cache.popitem()
                self.cache[key] = value
                self.cache.move_to_end(key, last=False)
            else:
                self.cache[key] = value
                self.cache.move_to_end(key, last=False)
```

### Python Dictionary and doubly linked List
This solution is from [neetcode](https://neetcode.io/problems/lru-cache), I did not understand at first why we needed to initialize two node pointers and connect them to each other. But I learned it is necessary for remove, and insert operations. What `prev`, `next`, `nxt` and not to mention the `left` and `right` pointers was confusing for me at first. Studying the algorithm and drawing it our step by step helped, there are probably leetcode easies made for inserting and removing nodes from a linked list. But once you get the flow of interaction with linked lists, questions like this become easy

```python
class Node:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.next = None
        self.prev = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        self.left = Node(0, 0)
        self.right = Node(0, 0)
        self.left.next = self.right
        self.right.prev = self.left

    def remove(self, node):
        prev = node.prev
        nxt = node.next
        prev.next = nxt
        nxt.prev = prev

    def insert(self, node):
        prev = self.right.prev
        nxt = self.right
        prev.next = nxt.prev = node
        node.next = nxt
        node.prev = prev

    def get(self, key: int) -> int:
        if key in self.cache:
            self.remove(self.cache[key])
            self.insert(self.cache[key])
            return self.cache[key].value
        return -1

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.remove(self.cache[key])
        self.cache[key] = Node(key, value)
        self.insert(self.cache[key])

        if len(self.cache) > self.capacity:
            lru = self.left.next
            self.remove(lru)
            del self.cache[lru.key]
```

# Sources
[redis](https://redis.io/glossary/lru-cache/)

[python docs](https://docs.python.org/3/library/collections.html#collections.OrderedDict)

[neetcode](https://neetcode.io/problems/lru-cache)
