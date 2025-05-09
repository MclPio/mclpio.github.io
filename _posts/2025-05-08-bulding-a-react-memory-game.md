---
title: "Building a React Memory Game: Why Hands-On Learning Wins"
date: 2025-05-08
categories:
  - React
description: Implementing React concepts learned so far, including state management, side effects, and using data from an external API.
---

# Introduction
I will be discussing the benefits of having diverse, hands-on knowledge of a technology, how it helped me with a previous project, and why it convinced me to work on a few React projects via [The Odin Project](https://www.theodinproject.com). If you just want to play the game, [Click Here](https://anime-memory.netlify.app/).

## Background
I have been working with React for the last few months, completing my milestones by relying on the [React documentation](https://react.dev/learn) or large language models when needed. This was manageable because I had basic knowledge of the framework from an introductory tutorial and a strong foundation in JavaScript. Check out my JavaScript battleship [game](https://www.michaelpious.com/battleship/)!

Recently, I worked with CSS to design a homepage for one of my client's sites. I found it quite easy since I already had knowledge from [The Odin Project](https://www.theodinproject.com)'s advanced CSS courses and projects I had completed. Given this realization, I decided to work on the React course on [The Odin Project](https://www.theodinproject.com).

I believe that understanding a technology’s capabilities through diverse knowledge accelerates development. Knowing what you’re capable of, as demonstrated in my CSS experience, boosts confidence and efficiency.

## The Project
My latest project was a memory card game. For details on how it works, check out my [game](https://anime-memory.netlify.app/). The goal was to recap what was taught so far in the course: state management, managing side effects, and using data from an external API.

### Managing State
I’ve extensively used the [useState](https://react.dev/reference/react/useState) hook in my work. It’s a fundamental hook, and I have applied it to store data like anime ID, cards, anime title, and more.

### External API Data: Jikan
I found a free API called [Jikan](https://jikan.moe/), which uses MyAnimeList to get anime info. It’s well documented and doesn’t require authentication. Below are two files showing its use case. I call the API, get JSON data, and map out the data needed for rendering.

```javascript
// src/utils/getCharacters.js
export default async function getCharacters(id) {
  const url = `https://api.jikan.moe/v4/anime/${id}/characters`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error(error.message);
    return null;
  }
}
```

```javascript
// src/utils/getCards.js
import getCharacters from "./getCharacters";

export default async function getCards(animeId, cardAmount) {
  const data = await getCharacters(animeId);
  const topCards = data.slice(0, cardAmount);
  const filterNameAndImageUrl = topCards.map((item) => ({
    id: item.character.mal_id,
    name: item.character.name,
    png: item.character.images.jpg.image_url,
  }));
  return filterNameAndImageUrl;
}
```

Below is how [useEffect](https://react.dev/reference/react/useEffect) is helpful. I use it for the initial card fetch. Additionally, in its dependency array, I include state variables that trigger it to run again. For example, if `animeId` changes, we need to fetch cards again, and the same applies to `cardAmount` and `gameStarted`.

```javascript
// src/Components/Game.jsx
// ...
useEffect(() => {
  async function fetchCards() {
    try {
      let fetchedCards = await getCards(animeId, cardAmount);
      fetchedCards = shuffle(fetchedCards);
      setCards(fetchedCards);
    } catch (error) {
      console.error("Failed to fetch cards:", error);
      setCards([]);
    }
  }
  if (gameStarted) {
    fetchCards();
  }
}, [animeId, cardAmount, gameStarted]);
// ...
```

### Lessons Learned
* Hands-on experience with a technology informs better solution implementation. Instead of asking a large language model, "How do I center this div in my element?", you can ask, "Is using flexbox the best option here?" This is the difference between knowing nothing about a technology and having broad knowledge.
* Time management is critical. For this project, I focused on a basic CSS skeleton and used a large language model to style the project in about an hour, avoiding hours of manual styling.
* `useEffect` is critical for detecting and updating state.

### Extra: Interesting Algorithm
The modern, Fisher–Yates shuffle did well to shuffle the cards on each click in linear time.

```javascript
// src/utils/shuffle.js
export default function shuffle(arr) {
  for (let i = arr.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr
}
```

I copied this line by line from [Wikipedia](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#JavaScript_implementation). It’s a concise and elegant algorithm.

## Conclusion
Studying documentation and building small projects like this memory card game builds the context to solve problems efficiently. I’m continuing [The Odin Project](https://www.theodinproject.com)'s React course to sharpen my web development skills. Whatever tech you use, learn it hands-on instead of leaning on large language models, it sets you up for success. Try the [game](https://anime-memory.netlify.app/), share your React tips, or check my [github](https://github.com/MclPio). Need a React developer? Reach out on [LinkedIn](https://www.linkedin.com/in/michaelpious/).