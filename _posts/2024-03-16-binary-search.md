---
title: "Binary Search"
date: 2024-03-16
categories:
  - Blog
tags:
  Algorithm
---
I would like to talk about Binary Search in my first post. I just read the first chapter of *Grokking Algorithms* by Aditya Y. Bhargava and wanted a fun way to write down what I learned to solidify my understanding. I plan to make an implementation with Ruby and talk about time complexity of the algorithm.

Lets write the code!
```ruby
def binary_search(array, value)
  low = 0
  high = array.length - 1

  while low <= high
    mid = (low + high) / 2
    guess = array[mid]

    if guess == value
      return mid
    elsif guess < value
      low = mid
    elsif guess > value
      high = mid
    end
  end

  nil
end

array = Array.new(100) { |index| index}
value = 22

puts("Looking up the index of value #{value}.") 
puts(" The index value is #{binary_search(array, value)}")
```

The code runs in O(log n) time complexity as it halves the array we have to search through each cycle.

## Common Big O run times I learned
sorted from fastest to slowest:
- O(log n): Represents algorithms that have logarithmic time complexity
- O(n): Denotes linear time complexity, where the runtime increases linearly with the size of the input
- O(n * log n): Indicates algorithms that have quasi-linear time complexity
- O(n^2): Represents quadratic time complexity, where the runtime grows quadratically with the size of the input 
- O(n!): Denotes factorial time complexity, where the runtime grows extremely fast with the size of the input