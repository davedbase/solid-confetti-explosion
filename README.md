# Solid Confetti Explosion

[![size](https://img.shields.io/bundlephobia/minzip/solid-confetti-explosion?style=for-the-badge)](https://bundlephobia.com/package/solid-confetti-explosion)
[![size](https://img.shields.io/npm/v/solid-confetti-explosion?style=for-the-badge)](https://www.npmjs.com/package/solid-confetti-explosion)
![npm](https://img.shields.io/npm/dw/solid-confetti-explosion?style=for-the-badge)

Get the party started with Solid! This package allows you to display a super lightweight confetti explsoion on screen. It doesn't use canvas, only CSS animations. It also doesn't ship a particle generator (lol). A pretty grain solution for all your partying needs.

> This library is the Solid port of the amazing [herrethan/react-confetti-explosion](https://github.com/herrethan/react-confetti-explosion#readme) and [https://github.com/PuruVJ/svelte-confetti-explosion](svelte-confetti-explosion) packages. All the logic is from their packages only, optimisation and Solid code are mine 😉

## Features

- 🤏 Tiny - Less than 2.5KB min+gzip.
- 🐇 Simple - Quite simple to use, and effectively no-config required!
- 🧙‍♀️ Elegant - Use a Solid component rather than setting things up in `onMount` hook.
- 🗃️ Highly customizable - Offers tons of options that you can modify to get different behaviors.
- 🖥️ SSR friendly - Works seamlessly in Sveltekit and other Server Side Rendering environments!

[Try it in Solid REPL](https://playground.solidjs.com)

## Installing

```bash
# pnpm
pnpm add solid-confetti-explosion

# npm
npm install solid-confetti-explosion

# yarn
yarn add solid-confetti-explosion
```

## How to use it

```tsx
import ConfettiExplosion from 'solid-confetti-explosion';

const App () => (
  <ConfettiExplosion />
);
```

Customizing behavior with options:

```tsx
const App () => (
  <ConfettiExplosion particleCount={200} force={0.3} />
);
```

## Props

There's tons of options available for this package. All of them are already documented within the code itself, so you'll never have to leave the code editor.

### particleCount

Number of confetti particles to create.

**type:** `number`

**Default value:** 150

**Example:**

```tsx
<ConfettiExplosion particleCount={200} />
```

### particleSize

Size of the confetti particles in pixels

**type:** `number`

**Default value:** 12

**Example:**

```tsx
<ConfettiExplosion particleSize={20} />
```

### duration

Duration of the animation in milliseconds

**type:** `number`

**Default value:** 3500

**Example:**

```tsx
<ConfettiExplosion duration={5000} />
```

### colors

Colors to use for the confetti particles. Pass string array of colors. Can use hex colors, named colors, CSS Variables, literally anything valid in plain CSS.

**type:** `Array<string>`

**Default value:** `['#FFC700', '#FF0000', '#2E3191', '#41BBC7']`

**Example:**

```svelte
<ConfettiExplosion colors={['var(--yellow)', 'var(--red)', '#2E3191', '#41BBC7']} />
```

### particlesShape

Shape of particles to use. Can be `mix`, `circles` or `rectangles`

`mix` will use both circles and rectangles
`circles` will use only circles
`rectangles` will use only rectangles

**type:** `'mix' | 'circles' | 'rectangles'`

**Default value:** `'mix'`

**Example:**

```tsx
<ConfettiExplosion particlesShape="circles" />
```

### force

Force of the confetti particles. Between 0 and 1. 0 is no force, 1 is maximum force. Will error out if you pass a value outside of this range.

**type:** `number`

**Default value:** 0.5

**Example:**

```tsx
<ConfettiExplosion force={0.3} />
```

### stageHeight

Height of the stage in pixels. Confetti will only fall within this height.

**type:** `number`

**Default value:** 800

**Example:**

```tsx
<ConfettiExplosion stageHeight={500} />
```

### stageWidth

Width of the stage in pixels. Confetti will only fall within this width.

**type:** `number`

**Default value:** 1600

**Example:**

```tsx
<ConfettiExplosion stageWidth={500} />
```

### shouldDestroyAfterDone

Whether or not destroy all confetti nodes after the `duration` period has passed. By default it destroys all nodes, to free up memory.

**type:** `boolean`

**Default value:** `true`

**Example:**

```tsx
<ConfettiExplosion shouldDestroyAfterDone={false} />
```

## Performance

This library functions by creating 2 DOM nodes for every single confetti. By default, if the `particlesCount` is set to 150, it will create 300 nodes. This is a lot of nodes. For most devices, these many nodes are not a big issue, but I recommend checking your target devices' performance if you choose to go with a higher number, like 400 or 500.

Also, after the specified `duration`, all the confetti DOM nodes will be destroyed. This is to free up memory. If you wish to keep them around, set `shouldDestroyAfterDone` to `false`.

## License

MIT License
