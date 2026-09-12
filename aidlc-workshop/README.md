# 👻 Flappy Kiro — Soul Harvest

**Flappy Kiro** is a fast-paced, atmospheric arcade flying game where you guide **Ghosty** through a mysterious graveyard environment. Dodge incoming gates, collect glowing souls, build your score multiplier, and use golden souls to gain a temporary protection against obstacles.

The game is built using **HTML5 Canvas, JavaScript, and Web Audio API**, with the visuals and sound effects generated directly in the browser without requiring external game assets.

---

## ✨ Game Features

* 👻 **Ghosty Character** — Control a cute ghost character flying through the graveyard.
* 🧱 **Dynamic Gates** — Navigate through randomly generated gaps between walls.
* ✧ **Soul Collection** — Collect floating souls positioned around the gate openings.
* ⭐ **Soul Multiplier** — Consecutive soul collection increases the multiplier up to **5×**.
* 🌟 **Golden Souls** — Golden souls provide a special **Phase** ability that allows Ghosty to survive one wall collision.
* 💥 **Game Over System** — Collision with an obstacle or the ground ends the game.
* 🏆 **Best Score** — The highest score is maintained during the game session.
* 🔊 **Procedural Sound Effects** — Flapping, scoring, collecting souls, phase activation, multiplier increases, and crashes use Web Audio API tones.
* 🔇 **Mute Control** — Sound can be enabled or disabled using the sound button.
* ✨ **Particle Effects** — Flap particles, score popups, glowing souls, fireflies, and screen shake provide visual feedback.
* 🌙 **Atmospheric Background** — The game includes stars, a moon, fireflies, hills, and a stylized graveyard environment.
* 📱 **Multiple Input Methods** — The game supports keyboard, mouse, and touch controls.

---

## 🎮 Controls

| Input           | Action                 |
| --------------- | ---------------------- |
| **Spacebar**    | Make Ghosty fly upward |
| **Mouse Click** | Make Ghosty fly upward |
| **Touch/Tap**   | Make Ghosty fly upward |
| **🔊 Button**   | Toggle game sound      |

The HTML interface defines the Canvas game area, score HUD, soul counter, multiplier display, phase indicator, start/game-over overlay, and mute button.

---

## ✧ Soul & Multiplier System

Collecting souls is an important part of the gameplay.

Each collected soul:

* Increases the soul streak.
* Adds points based on the current multiplier.
* Displays a score popup.
* Produces a collection sound.

The multiplier increases after consecutive soul collections and has a maximum value of **5×**. Missing available souls resets the streak and multiplier back to **1×**.

### Multiplier Progression

```text
Soul Streak
     ↓
Collect Souls
     ↓
Build Streak
     ↓
Increase Multiplier
     ↓
Maximum 5×
```

---

## 🌟 Golden Soul / Phase System

Some soul groups contain a special **golden soul**.

Collecting a golden soul activates the **Phase Ready** ability. If Ghosty subsequently collides with a wall, the phase charge is consumed and Ghosty survives the collision instead of immediately ending the game.

## The phase protection lasts for a short invulnerability period after activation.

## 🕹️ Gameplay Mechanics

### Ghost Movement

Ghosty is affected by gravity continuously. Pressing Space, clicking, or tapping applies an upward velocity.

The game also limits the maximum falling speed and automatically adjusts Ghosty's rotation according to its vertical velocity.

### Dynamic Walls

Walls are generated at regular intervals with randomly positioned gaps. Their movement speed gradually increases as the player's score increases, making the game progressively more challenging.

### Collision Detection

The game uses:

* Circle-to-rectangle collision detection for Ghosty versus walls.
* Circle-to-circle collision detection for Ghosty versus souls.

These calculations are handled inside the game update logic.

---

## 🔊 Audio System

Flappy Kiro generates its sound effects using the **Web Audio API**, so no external audio files are required.

Implemented sound effects include:

* 🪽 Flap sound
* 🏆 Score sound
* 💥 Crash sound
* ✧ Soul collection sound
* 🌟 Golden soul sound
* 👻 Phase activation sound
* ⬆️ Multiplier increase sound

The audio system creates oscillators and gain nodes dynamically to produce the sounds.

---

## 🎨 Visual Design

The game uses HTML5 Canvas for rendering.

The visual environment includes:

* 🌌 Gradient night sky
* ⭐ Animated stars
* 🌙 Moon
* 🌫️ Dark background hills
* ✨ Animated fireflies
* 🧱 Stone-style walls
* ✧ Glowing blue souls
* 🌟 Glowing golden souls
* 👻 Animated Ghosty
* 💫 Particle effects
* 💬 Floating score popups
* 📳 Screen-shake effect after collisions

## All major gameplay visuals are drawn directly through Canvas rendering functions.

## 🏗️ Architecture

The game follows a clear separation between game state updates and rendering.

### 1. Game State

The game maintains state variables for:

* Ghosty position and velocity
* Walls
* Score
* Best score
* Wall speed
* Souls
* Soul streak
* Soul multiplier
* Phase status
* Particles
* Popups
* Game state

The game can be in states such as:

```text
START
  ↓
PLAYING
  ↓
GAME OVER
  ↓
RESTART
```

### 2. Update System

The `update()` function handles the game's changing state, including:

* Gravity
* Ghost movement
* Wall movement
* Wall generation
* Collision detection
* Soul collection
* Score updates
* Particle updates
* Popup updates
* Phase protection

The implementation keeps Canvas drawing separate from these gameplay calculations.

### 3. Rendering System

The `render()` function draws the current game state onto the Canvas.

The rendering pipeline includes:

```text
Background
    ↓
Fireflies
    ↓
Walls + Souls
    ↓
Particles
    ↓
Score Popups
    ↓
Ghosty
    ↓
Ground
    ↓
Phase Effect
```

---

## 📁 Project Structure

```text
Flappy-Kiro/
│
├── index.html
├── game.js
└── style.css
```

### `index.html`

Contains the main game structure, including the Canvas, HUD, score display, soul counter, multiplier, phase indicator, game overlay, and mute button.

### `game.js`

Contains the main game logic, including:

* Game state
* Physics
* Input handling
* Wall generation
* Soul collection
* Collision detection
* Audio
* Particles
* Canvas rendering
* Game loop

### `style.css`

Used to style the game interface and presentation.

---

## 🚀 How to Run

### Method 1 — Open Directly

1. Download or clone the project.
2. Make sure `index.html`, `game.js`, and `style.css` are in the correct project directory.
3. Open `index.html` in a modern web browser.
4. Press **Space** or click/tap the game to start.

---

## 🏁 How to Play

1. Start the game using **Space**, mouse click, or touch.
2. Control Ghosty's vertical movement.
3. Avoid hitting the walls and ground.
4. Pass through the gaps between the walls.
5. Collect as many souls as possible.
6. Maintain your collection streak to increase the multiplier.
7. Collect golden souls to obtain a Phase charge.
8. Try to achieve the highest possible score.

---

## 🎯 Objective

The primary objective of **Flappy Kiro** is to survive for as long as possible while maximizing your score and collecting souls.

**Survive → Dodge → Collect → Build Multiplier → Score Higher**

Can you master Ghosty's flight and achieve the highest score? 👻✨

---

## 🛠️ Technologies Used

* **HTML5**
* **CSS3**
* **JavaScript**
* **HTML5 Canvas API**
* **Web Audio API**
* **Browser Animation API**
* **DOM Events**

---

## 👻 Credits

**Flappy Kiro — Soul Harvest**

A browser-based arcade flying game created using HTML5 Canvas and JavaScript.

**Guide Ghosty. Collect souls. Survive the gates. Beat your best score.** ✧👻
