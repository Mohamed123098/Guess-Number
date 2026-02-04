# Game Design Document (GDD) & Technical Specification
## Project: Multiplayer Number Guessing Game ("Digit Duel")

---

# 1. Game Overview
**Digit Duel** is an online multiplayer turn-based strategy game where players attempt to deduce their opponent's secret number. The game features real-time matchmaking, friend challenges via ID, and scalable AI opponents.

**Objective:** Correctly guess the opponent's secret number sequence before they guess yours.

---

# 2. Gameplay Mechanics

## 2.1 Core Rules
*   **Secret Number Generation:**
    *   At the start of a match, each player selects a secret number consisting of **N digits** (where N is 3 to 10).
    *   Digits can be 0-9. Duplicates allowed/disallowed (Configurable, default: Allowed).
*   **Turn-Based System:**
    *   Players alternate turns.
    *   Player A guesses -> Feedback Received -> Player B guesses.
    *   **Restriction:** A player cannot make a new guess until the opponent has completed their turn.
*   **Guess Limit:** Maximum **10 guesses** per player. If both fail after 10 turns, the match is a Draw.

## 2.2 Gameplay Flow
1.  **Lobby/Matchmaking:** Player selects mode (PvP Random, PvAI, Vs Friend).
2.  **Setup Phase:** Players choose their secret number (validated for length and digit constraints).
3.  **Game Loop:**
    *   Player Active enters a guess.
    *   Server validates guess (length, format).
    *   **Feedback Logic** runs (see 2.3).
    *   Turn passes to opponent.
4.  **End Game:** Verification of Win/Loss/Draw. Score update.

## 2.3 Feedback Logic
The system provides restricted information to maintain difficulty. It does **not** indicate which specific position is correct (unlike Wordle).
**Logic:**
1.  Compare the *Guess* against the *Secret*.
2.  Calculate **Intersection Count** (number of digits in Guess that exist in Secret, accounting for frequency).
3.  **Responses:**
    *   **Case 1: Exact Match** (Value & Position) for all digits -> **WIN**.
    *   **Case 2: All Digits Correct Value, Wrong Arrangement** -> Return string: *"All digits correct but wrong arrangement."*
    *   **Case 3: Some Digits Correct (Intersection > 0)** -> Return string: *"[X] digits correct."*
    *   **Case 4: No Intersection (Intersection == 0)** -> Return string: *"No correct digits."*

## 2.4 Difficulty & Time Scaling
The game balances constraints using both a preset Difficulty Level and a formula for Time Limits.

*   **Difficulty Presets:**
    *   **Easy:** Small digit count (3-4), Low AI intelligence. (Target ~5 min duration).
    *   **Medium:** Medium digit count (5-7), Medium AI. (Target ~10 min duration).
    *   **Hard:** Large digit count (8-10), Strategic AI. (Target ~15 min duration).

*   **Game Time Formula:**
    *   To Ensure fairness and scalability, the **Total Match Time Bank** (per player) is calculated as:
        > **Time (Minutes) = Number of Digits × 2**
    *   *Example:* 4 Digits = 8 Minutes. 10 Digits = 20 Minutes.
    *   *Adjustment:* Difficulty Selection can apply a multiplier (e.g., Hard Mode = 0.8x Time).

## 2.5 Scoring System
*   **Win:** +1 Point.
*   **Loss:** +0 Points.
*   **History:** User profile tracks Wins, Losses, and Win Rate.

---

# 3. Features & Systems

## 3.1 Game Modes
1.  **PvP (Random Matchmaking):**
    *   Queue system matches players with similar ratings/settings.
2.  **PvP (Friend):**
    *   Generate a unique **Room Code/Player ID**.
    *   Friend joins via ID.
3.  **PvE (vs AI):**
    *   **AI Levels:**
        *   *Random:* Guesses randomly from valid pool.
        *   *Strategic:* Uses constraint satisfaction (knocks out impossible numbers based on previous feedback) to optimize guesses.

## 3.2 Chat System
*   Real-time text chat available during the match.
*   "System Messages" (e.g., "Player A guessed...") appear in the same feed.
*   Profanity filter (Server-side).

## 3.3 UI/UX Requirements
*   **HUD:** Remaining Time, Remaining Guesses (Count/10).
*   **History Log:** Scrollable list of previous guesses and their feedback.
*   **Notepad (Optional):** Area for player to jot down deductions.

---

# 4. Technical Specification

## 4.1 System Architecture
*   **Pattern:** Client-Server with Real-time Event Driven communication.
*   **Frontend:** React.js / Next.js (SPA).
*   **Backend:** Node.js with Socket.io (for low-latency turns/chat).
*   **Database:** MongoDB (Flexible schema for match history and chat logs).

```mermaid
graph TD
    Client[Web Client (React)] <-->|WebSocket| LB[Load Balancer]
    LB <-->|Socket.io| Server[Node.js Game Server]
    Server <-->|Mongoose| DB[(MongoDB)]
    Server <-->|Redis| Cache[(Redis Session/Queue)]
```

## 4.2 Database Schema

### `User` Collection
```json
{
  "_id": "ObjectId",
  "username": "String",
  "public_id": "String (Unique Friend Code)",
  "stats": {
    "wins": "Number",
    "losses": "Number",
    "games_played": "Number"
  },
  "created_at": "ISODate"
}
```

### `Match` Collection
```json
{
  "_id": "ObjectId",
  "status": "Enum ['WAITING', 'IN_PROGRESS', 'COMPLETED']",
  "mode": "Enum ['PVP', 'AI']",
  "settings": {
    "digits": "Number (3-10)",
    "difficulty": "String"
  },
  "players": [
    {
      "user_id": "ObjectId",
      "socket_id": "String",
      "secret_number": "String (Hashed/Encrypted until end)",
      "remaining_time": "Number",
      "guesses_used": "Number"
    }
  ],
  "turn_index": "Number (0 or 1)",
  "winner_id": "ObjectId (Null if ongoing)",
  "history": [
    {
      "player_index": "Number",
      "guess": "String",
      "feedback": "String",
      "timestamp": "ISODate"
    }
  ]
}
```

## 4.3 AI Logic (The "Solver")
*   **State:** The AI maintains a set of "Possible Candidates" $S$. Initially $10^N$.
*   **Move:**
    *   **Easy:** Pick random $g \in S$.
    *   **Hard:** Minimax / Entropy approach. Pick guess $g$ that maximizes the expected information gain (minimizes the size of $S$ in the worst-case feedback scenario).
    *   *Optimization:* For N > 5, full entropy calculation is slow. Use "Knuth's Algorithm" heuristic or simpler "Consistent Candidate" random sampling.

## 4.4 API & Events (Socket.io)

### Client -> Server Events
*   `join_queue({ difficulty, digits })`
*   `create_private_match({ settings })`
*   `join_private_match({ room_id })`
*   `set_secret({ number })`
*   `submit_guess({ number })`
*   `chat_message({ text })`

### Server -> Client Events
*   `match_found({ match_id, opponent_name })`
*   `game_start({ settings })`
*   `turn_update({ active_player_index, last_guess_info, remaining_time })`
*   `chat_broadcast({ sender, text })`
*   `game_over({ winner_id, all_secrets })`
*   `error({ message })`

## 4.5 Anti-Cheat & Security
1.  **Secret Hiding:** Opponent's secret number is **never** sent to the client until the game ends.
2.  **Server-Side Validation:** All guesses validated against game rules (length, chars) on the server.
3.  **Timer Sync:** Server maintains the "Master Clock". Client timer is visual only.
4.  **Rate Limiting:** Chat messages throttled to prevent spam.

## 4.6 Edge Cases
*   **Disconnection:**
    *   If player disconnects, 30s reconnection window.
    *   If timeout -> Auto-forfeit (Opponent wins).
*   **Time Out:**
    *   If turn timer expires -> Turn skipped or Auto-loss?
    *   *Decision:* Auto-Loss (Chess Clock style) or Random Guess made for them. (Standard: Loss on time).
*   **Draw:**
    *   If both players reach 10 guesses without success -> Draw (0 pts).

---

# 5. Implementation Roadmap
1.  **Phase 1:** Backend Setup (Node/Express), Socket.io basic connection.
2.  **Phase 2:** Game Logic Engine (Secret validation, Feedback algorithm).
3.  **Phase 3:** Frontend UI (Lobby, Game Board, Input).
4.  **Phase 4:** Multiplayer Sync & Chat.
5.  **Phase 5:** AI Implementation.
6.  **Phase 6:** Polish (Timers, Friend Invite, Styling).
