---
title: "Building a React Memory Game: Why Hands-On Learning Wins"
date: 2025-05-08
categories:
  - React
  - JavaScript
description: Implementing react concepts learned so far including state management, side effects, using data from an external API
---

# Intro
I will be discussing the benefits of having diverse, hands-on knowledge of a technology, how it helped me with a previous project, and why it convinced me to tackle a few React projects via [TheOdinProject](https://www.theodinproject.com).

## Background
I have been working with React professionally for the last few months, managing to get my tasks done by searching the docs when needed. It was manageable since I had some basic knowledge of the framework from an introductory [tutorial](https://react.dev/learn).

Recently, I worked with CSS to design a homepage for one of my client's sites. I found it quite easy since I already had knowledge from [TheOdinProject](https://www.theodinproject.com)'s advanced CSS courses and projects I had completed. Given this revelation, I decided to open the React course on [TheOdinProject](https://www.theodinproject.com).

I believe that understanding a technology with diverse knowledge of its capabilities boosts development because I know what I am capable of doing, just like in the CSS example I described.

## The Project
My latest project was a memory card game. For details on how it works, check out my [game](https://anime-memory.netlify.app/). The goal was to recap what was taught so far in the course: state management, managing side effects, and using data from an external API.

### Managing State
I have been working extensively with the [useState](https://react.dev/reference/react/useState) hook in my client's work. It’s a common hook, and I used it to store data like anime ID, cards, anime title, and more.

### External API Data, Jikan
I found a free API called [Jikan](https://jikan.moe/), which uses MyAnimeList to get anime info. It’s well-documented and doesn’t require authentication. Below are two files showing its use case. I call the API, get JSON data, and map out the data needed for rendering.

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
* Having hands-on experience with a technology that covers it broadly is helpful when deciding on solution implementation. Instead of asking an LLM, "How do I center this div in my element?", you can ask, "Is using flexbox the best option here?" This is the difference between knowing nothing about a technology and having broad knowledge.
* Be careful about wasting time. For example, don’t get overworked about how your project looks. Conclude that you’re not a designer, you didn’t make the designs, and the goal here is to learn React.
* `useEffect` is critical for detecting and updating state.

## To End
Studying docs and building small projects like this memory game builds the context to solve problems efficiently. I’m continuing [TheOdinProject](https://www.theodinproject.com)'s React course to sharpen my web development skills. Whatever tech you use, learn it hands-on instead of leaning on Large Language Models—it sets you up for success. Try the [game](https://anime-memory.netlify.app/), share your React tips below, or check my [github](https://your-portfolio-link). Need a React developer? Reach out on LinkedIn.