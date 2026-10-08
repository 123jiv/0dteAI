# Everyday content (8 Oct 2026)

How the 14–22 task and line library was written. The brief below is what every writer, judge and editor worked from. Each chapter went: tasks writer + lines rewriter → two independent panels (a youth panel reading as Jay 15, Maya 18 and Andre 21; and a coach / school counselor / young founder panel checking safety, usefulness and feasibility) → an editor who applied the flags, paired 1–2 lines with every task and passed the content checker.

To add tasks later, follow the same brief and run `npm run validate`.

---


## What the founder said (verbatim)

> "make these tasks like every day tasks for kids who want to become successful like me. I want this to feel relatable and actually mean something. this app just feels like some AI tool used for marketing. NO. I want this app actually to be useful and help people so it actually works."

The founder is young and started a streetwear brand (UNSETLD) themselves. The app is a daily-discipline app: every day the user sees **one line** (a short sentence) and does **today's work**: their own three daily rules, **one task from UNSETLD**, and up to three tasks of their own. They can prove a task with a photo taken in the app. Proven tasks earn points toward discount codes on the brand's site, but **the app has to be worth using for someone who never buys anything**.

Decisions already made:
- **Audience: 14 to 22.** High school through early twenties. Anything written must make sense to a 14-year-old in 9th grade AND to a 21-year-old with a job who isn't in school. If a task only fits one of them, rephrase it so it covers both ("a teacher or your boss", "class or your shift") or drop it.
- **Lines get rewritten** so a 14–22-year-old can relate to every one, and **each day's line is tied to that day's task** (each task will list 1–2 line numbers from its chapter that fit it).
- Codes are open to 13+. Own tasks are free. None of that is your concern here, except: tasks and lines never sell, never mention the brand, points, codes or shopping.

## Three people to write for

Read every task and line as each of them. If any of them would roll their eyes, it's wrong.

- **Jay, 15.** 10th grade. JV basketball. Phone around 7 hours a day, mostly short videos and group chats. No job, $40 left from a birthday. Parents decide a lot (bedtime, rides, money). Wants to be rich and start a clothing brand "someday". Hates anything that sounds like a teacher, a poster in a guidance office, or an ad.
- **Maya, 18.** Senior. Works ~20 hours a week at a restaurant. Applying to college. Sells drawings online on the side. Sleeps 6 hours. Saving for a car. Busy, tired, no patience for fluff.
- **Andre, 21.** Left community college, works at a warehouse. Wants to get in shape and start a business. Has a sports-betting app and a vape. Broke at the end of every month. Smart, but nobody ever showed him how to do the basics.

Gender: write for everyone. No "man", "bro", "king", "the man you'll be". No assumptions about family (some kids have one parent, live with grandparents, etc.: say "the people you live with" or "a parent" when needed).

## What "actually works" means for a task

A task is one specific thing to do **today**, that a 14–22-year-old can actually do on a normal day (school day or work day), for free, without a car, and that obviously moves them toward being someone who makes it.

Good tasks follow what's known to build habits and get results:
- **Small and specific, with a clear finish line.** You know exactly when it's done. "Read 10 pages of a book." not "Read more."
- **Tied to a time or a moment** (an implementation intention): "Right after school, before your phone..." "When you get home from your shift..."
- **About the basics that compound**: sleep, moving your body, food, the phone, school/work, money, keeping your word, people, building a skill, making things.
- **Some build something**, like the founder did: make something, show it to someone, learn a skill people pay for, write down an idea, finish a small project, ask someone who's done it.
- **Mix of easy and stretch.** Most tasks should take 5–60 minutes. A few can be harder (a full hour of practice, a hard conversation). None should take a whole day.

Every task must pass all of these:
1. **Everyday.** Fits into a normal school day or work day. No travel, no events, no "this weekend", no special equipment, no gym membership (bodyweight, outside, stairs, a ball are fine).
2. **Free.** Costs nothing. Never "buy", never a paid app, never a subscription.
3. **Safe for a 14-year-old.** No fasting, skipping meals, calorie counting, weight loss, body checking, "cutting", supplements, caffeine or energy drinks as a tool, cold plunges or ice baths, extreme workouts, running at night alone, meeting strangers, giving out personal info, anything illegal (no alcohol, betting or vaping tasks that assume they do it: frame those as "if you do X, ..." or as quitting/cutting back, and keep them rare and plain). No dares, no pranks.
4. **Provable with one photo that shows no one's face** and nothing private: the page, the made bed, the shoes after the run, the list, the phone in a drawer, the empty sink, the drawing, the timer. Never a screenshot of someone else's messages. If a task can't be photographed (a conversation), the proof is something after it (the note you wrote about what they said).
5. **Means something.** Its "why" connects it to the life they want, in plain words. Not a slogan.
6. **Not preachy, not a poster.** No "believe in yourself", no "you've got this", no "level up", no "unlock", no "journey", no "mindset", no "self-care", no "hustle/grind".

## The task format

```json
{
  "text": "Put your phone in another room for homework.",
  "proof": "Your desk with no phone on it.",
  "when": "day",
  "why": "Your phone is built to win every fight for your attention. Don't fight it. Leave it in the kitchen.",
  "how": "Pick one assignment. Phone goes in another room until it's done."
}
```

- `text`: 3–12 words, at most 60 characters, an instruction to "you" (imperative), ends with a full stop. No "!", "?", "…". Plain words a 14-year-old uses.
- `proof`: what to photograph, at most 8 words, ends with a full stop.
- `when`: `morning`, `day`, `evening` or `any`.
- `why`: 1–2 short sentences, at most 170 characters. Second person. Concrete and honest. It may state a fact only if it's in the facts list below. It must not repeat the text.
- `how`: one or two short sentences, at most 120 characters, making it easy to start: when, where, how much, what to do first.

Good examples (calibration, don't copy):
- text "Make your bed before you touch your phone." proof "The made bed." why "It takes two minutes and it's the first thing you finish. Start the day already ahead of it." how "Feet on the floor, bed made, then phone."
- text "Write down every dollar you spent this week." proof "The list." why "You can't save money you can't see. Most of it goes in small amounts you don't remember." how "Check your bank app or think back day by day. Total it at the bottom."
- text "Ask one question in class or at work." proof "The note with the answer." why "People who ask get help and get remembered. Staying quiet feels safe and costs you both." how "Write the question down first so you can't back out."
- text "Do 50 push-ups before the end of the day." proof "The floor where you did them." why "You don't need a gym to get strong. You need to do it today and again tomorrow." how "Break it up: 10 at a time, five times."
- text "Show someone something you made." proof "The thing you made." why "Most people never start because they never show anyone. Showing it is how it gets better." how "Pick one person who'll be honest. Ask what they'd change."

Bad (and why):
- "Crush your goals today." (slogan, no finish line)
- "Cancel one subscription you didn't use." (a 15-year-old has none)
- "Say your idea first in today's meeting." (no meetings at 15)
- "Cook dinner tonight." (many 14-year-olds can't; rephrase: "Make yourself one real meal today.")
- "Take a cold shower." (fine for some, but no health stunts)
- "Skip lunch and..." (never)
- "Post your progress on Instagram." (sends them to the feed; also privacy)

## Lines (the one sentence a day)

Lines are short, true sentences in the brand's voice that a 14–22-year-old would screenshot, put on their lock screen, or send to a friend because it's about their life. Original (not famous quotes or close copies of them). Each line belongs to one chapter.

Rules (from the validator, they are hard rules):
- Original lines: 7–14 words, at most 80 characters, no "!" or "…", no emoji, no questions (almost never).
- `explicit: true` only if it contains exactly one swear from: damn, hell, shit, bullshit, piss, fuck (and their forms). One swear per line at most. At most 2 explicit lines in a chapter's first 80, and under 12% overall. Since kids are 14+, keep swears rare (the app defaults to clean).
- Never: slurs, "ass", "dick", "bitch" etc.
- Banned words and phrases (voice guide): lock in, locked in, the bag, aura, npc, bro, rizz, cooked, built different, grind, grinding, hustle, alpha, sigma, king, era, no cap, cringe, send it, with your chest, the boys, lowkey, main character, you've got this, be kind to yourself, proud of you, you deserve it, trust the process, good things are coming, no days off, rise and grind, nobody is coming to save you, nobody cares, stay hungry, do it scared, move in silence, the obstacle is the way, highlight reel, yesterday you said tomorrow, with extra steps, lol, unsetld, real men, be a man, females, never miss twice, no is a complete sentence, rage-quit, six figures, shredded.
- Caps across the library: few "X, not Y" / "isn't X. It's Y" contrasts (at most ~8 per 80 lines), at most 2 lines opening with "Nobody", 1 "most people", don't start more than 5 lines per 80 with the same word.
- Attributed Stoic quotes (with `attribution` and `verified: true`) cannot be edited. Keep only ones a 15-year-old can follow on one read; cut the rest.

The voice: an older sibling or coach who made it and is a little blunt because they care. Direct, specific, a bit dry. Never cheesy, never hype, never therapy-speak, never Gen Z slang (it dates fast and reads like an ad trying to sound young). Concrete details from their actual life beat abstractions: the group chat, the bus, the alarm, homework at 11 pm, the coach, the shift, the first paycheck, the vape, the energy drink, the game you said was one more, the drawing you never posted, the parent who says no, the friend who copies your homework, the person who laughed at your idea.

Adult-only details (salary band, raises, your boss, happy hour, hangovers, eulogies, mortgages, LinkedIn, traffic on your commute, "at fifty", spouses) get **rewritten into the 14–22 version of the same truth** or cut.

Examples of the target voice:
- "The group chat will still be there after the homework. It always is."
- "You don't need a plan for the brand. You need a first shirt."
- "Tired is not the same as done. Do the last set."
- "Your phone was made by people paid to keep you on it."
- "Being bad at it is the first step. Everyone skips that part in the story."

## Facts writers may use (verified; don't invent others)

- Teens 13–18 need 8–10 hours of sleep a night; adults 18+ need at least 7 (American Academy of Sleep Medicine).
- Kids and teens 6–17 should get 60 minutes of moderate-to-vigorous activity every day (CDC / US Physical Activity Guidelines). Adults: 150 minutes a week plus strength work twice a week.
- Habits take a varying amount of time to form; in one well-known study it averaged about two months (Lally et al., 2010). Don't promise "21 days".
- Writing down a specific plan for when and where you'll do something makes you more likely to do it (implementation intentions, Gollwitzer).
- Phone notifications and having the phone in sight pull attention even when you don't check it (keep it in another room).
- Compound interest: money saved early grows on itself over time.
- Nicotine is addictive, and in the US it is illegal to sell vapes or tobacco to anyone under 21.

Prefer no numbers at all to an invented one.

## The seven chapters, for 14–22

- **Discipline**: keeping your word to yourself. Alarm, bed, room, chores, homework first, finishing what you start, doing it when you don't feel like it.
- **Focus**: attention. Phone away, one thing at a time, study blocks, reading, practice hours on a skill, planning tomorrow, finishing assignments.
- **Training**: body. Moving every day, bodyweight work, running, sports practice, sleep, water, real food, stretching. Never weight loss or looks.
- **Money**: earning, saving, not wasting. Tracking spending, saving part of every bit you get, selling things you don't use, earning your first money, learning how money works, not buying hype, asking for a raise or more shifts (for the ones who work).
- **Confidence**: people and being seen. Speaking up in class or at work, asking questions, eye contact, calling instead of texting, asking for help, showing your work, saying no to a friend, introducing yourself, owning a mistake.
- **Vices**: what eats your days. Scrolling, games past bedtime, energy drinks, junk food, vaping, betting apps (18+), porn (never name it; "the stuff you'd delete your history for" at most, or skip), gossip, late nights. Framed as cutting back and taking control, not shaming.
- **Stoic**: control and perspective. What's in your control, handling being doubted or cut or failing a test, discomfort on purpose (safe), writing things down, gratitude without the poster, helping someone without credit, apologizing.

## Anti-AI checklist (if any of these show up, rewrite)

- Generic motivation that could be on any app ("Small steps lead to big results.")
- Tricolons and rhythm tricks ("Show up. Do the work. Repeat.")
- Words: journey, unlock, level up, elevate, empower, mindset, manifest, vibe, game-changer, transform, intentional, self-care, boundaries (therapy-speak), crush it, beast mode, hustle, grind.
- "It's not X, it's Y" in more than a few lines.
- Abstract nouns doing the work (discipline, consistency, greatness) instead of a thing you can see.
- Anything that sounds like it's selling something.

## The founder's own habits (added 8 Oct, in their words)

> "you can talk about how I stay up late and stuff to work and i dont go to plans and stuff when i have work to do and I stay focused and block out the noise and even if something I feel like wont workout I still give it a shot and stuff like you can talk about those things cus those are very common like things that a bunch of other people could relate to yk"

These four are the heart of the brand. Write about them as things a lot of 14–22-year-olds already do or want to do, in second person, never as the founder's biography and never with invented details about the founder.

1. **Late nights on your own thing.** The quiet hours after everyone's asleep or done for the day, spent on the thing you're building instead of the feed. GUARDRAIL: the audience starts at 14 and needs 8–10 hours of sleep (18+: at least 7). Never tell anyone to skip sleep, pull an all-nighter or trade sleep for work. The honest version: the late hour that would have gone to scrolling goes to your thing, and then you sleep; or protect one evening block for it. A late session still ends at a set time.
2. **Saying no to plans when there's work to do.** Missing the hangout, the party, the game night, because the work is due or the thing you're building needs the hours. GUARDRAIL: it's a trade you choose for a reason, not cutting everyone off. Never skip family obligations, work shifts, school or anything you promised; never be rude about it; keep one person in the loop; and make plans again when the work is done. Friends who matter will still be there.
3. **Staying focused and blocking out the noise.** Headphones in, notifications off, not checking what everyone else is doing, not letting opinions, group chats, haters or doubters change what you're working on. GUARDRAIL: "noise" means distractions and opinions that don't help, never parents, teachers, coaches or anyone warning you about something real. Feedback from people who know the work is not noise.
4. **Giving it a shot even when you think it won't work.** Applying, sending it, posting it, trying out, launching the first version, pitching it, even when you're pretty sure it's a no. You learn something either way and you'll never know otherwise. GUARDRAIL: safe, legal shots only: no risky stunts, no spending money you don't have, no giving out personal info to strangers.
