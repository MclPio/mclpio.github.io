---
title: "Restaurant Page"
date: 2024-06-28
categories:
  - The Odin Project
tags: JavaScript Webpack Bulma Design Figma Modules
---

# Restaurant Page

I went above and beyond on what was supposed to be a simple project to learn about Webpack and ES6 modules. Hint: I learned Figma, implemented a responsive site utilizing Bulma CSS framework and used Sass for the first time.

## Original Scope of Project

The [project](https://www.theodinproject.com/lessons/javascript-restaurant-page) required a dynamically rendered restaurant homepage with tabs to switch between home, menu, and about.

First generated package.json, then install webpack and make the appropriate files and directories.

```bash
# Initialize a new Node.js project
npm init

# Install Webpack and Webpack CLI as development dependencies
npm install webpack webpack-cli --save-dev

# Create source and distribution directories
mkdir src dist
```

![folder directories in vs code](/assets/img/2024-06-28-file-structure.png)

## Learning Figma

I have signed up for Figma before but I never could get the hang of it, so I decided to watch a [Youtube](https://youtu.be/HZuk6Wkx_Eg?si=qkFE1FjTAlaAHNSI) video, it was helpful to learn the basics.

I decided to copy the design from the youtube video, in hindsight a bad idea, I should have gotten inspiration from other restaurant sites not a crypto page. I also took advice from chatGPT on what color schemes to use, since my project was Frozen Pizza, GPT suggested an array of colors relating to fresh and cold.

My color schemes options:

![figma color scheme](/assets/img/2024-06-28-figma-color-schemes.png)

My final design:

![figma final design](/assets/img/2024-06-28-figma-design.png)

Overall, figma was easy to use, and gave me a good idea on what I wanted to do in my site.

## Bulma CSS and Sass

I decided to use [Bulma CSS](https://bulma.io/) hoping it would give me benefits like responsiveness out of the box. But since I wanted my own color scheme and my own fonts, it was challenging working with it. I often had to overwrite default bulma classes our make my own via a custom sass

### Code Splitting

As I was implementing the design, my single JavaScript file was not sufficient for code readability so I decided to code split via ES6 module `import` and `export`.

![src file structure](/assets/img/2024-06-28-src-file-structure.png)

Since I decided to create a more complex home page, I had to utilize code splitting with javascript in which I made a file called `fixed-grid.js` and imported all the grid cells from the `grid-cells` folder.

This is what `fixed-grid.js` looked like by the end of it:
![fixed grid js file](/assets/img/2024-06-28-fixed-grids-js.png)

## End

Overall, I decided to challenge myself and make a decent looking page, design wise. In the hope that this would make a worthy addition to my portfolio.

I still need time to reflect and get feedback on the design and also on the methods I used to split my code.

You can view the [live deployment](https://www.michaelpious.com/restaurant-js/) and [code](https://github.com/MclPio/restaurant-js) for the end result.
