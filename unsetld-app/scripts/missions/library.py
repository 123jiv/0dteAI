#!/usr/bin/env python3
"""The APPROVED UNSETLD mission library: the only built-in missions the app can plan, swap in
or recommend. Run: python3 scripts/missions/library.py; it writes src/content/missions.json.

66 missions, chosen by the founder from productivity, learning, fitness, finance, career and
behaviour-change research (docs/MISSIONS_SPEC.md §4). Rules for editing this file:
- Do not add missions, rename them, or reword them into slogans. Titles and descriptions are
  the approved text (reworded once, 3 Nov 2026, at the founder's request: concrete everyday
  wording, same ids, times, points and proofs; docs/MISSIONS_SPEC.md §4). Only a template slot ({project}, {subject}, {opportunity}, {skill}) may be
  filled from the user's own goal or skills (core/personalize missionTitle); the action never changes.
- Ids are permanent and are the approved ids (D1, S15, P9 ...). Gaps are deliberate: those
  missions were rejected in curation. Never renumber; history and analytics refer to them.
- Proof: a photo never stands in for time. A mission with a length in its title runs the timer
  (TIMER_AND_PHOTO). "Completion screen" proofs are photos of the screen (PHOTO), with
  personal details hidden. Workout proof shows the place or the kit, never the body. Money
  proof is a written note, never a bank screen.
- Points by effort: 5-10 min = 5, 15-20 = 10, 25-45 = 15-20, 45-60+ = 20-25.
- Frequency: high (several times a week, cooldown 1-2 days), medium (1-3 times a week,
  cooldown 3-4), low (weekly 7, monthly 30, or longer).
Tags are the keywords the goal and the weekly focus lean on (core/personalize KEYWORDS) and what
swap learning groups by; groups keep near-twins out of the same day.
"""
import json
import os

P, BA, TP, T = 'PHOTO', 'BEFORE_AFTER', 'TIMER_AND_PHOTO', 'TIMER'
TRACKS = ['discipline', 'school', 'fitness', 'money', 'career', 'projects', 'skills', 'organization']
PREFIX = {'D': 'discipline', 'S': 'school', 'F': 'fitness', 'M': 'money', 'C': 'career', 'P': 'projects', 'K': 'skills', 'O': 'organization'}
FREQ_COOLDOWN = {'high': (1, 2), 'medium': (3, 4), 'low': (7, 60)}
L = []


def m(id, title, short, proof_type, minutes, points, proof, *, freq, cooldown, timer=None, anchor=False, group=None,
      when=None, days=None, requires=None, tags=None, template=None, personalize=None, weight=None):
    track = PREFIX[id[0]]
    assert id not in {x['id'] for x in L}, id
    lo, hi = FREQ_COOLDOWN[freq]
    assert lo <= cooldown <= hi, (id, freq, cooldown)
    if proof_type in (T, TP):
        timer = timer or minutes
    # A length in the title is a timer.
    if 'Minutes' in title:
        assert proof_type in (T, TP), id
    assert bool(template) == bool(personalize), id
    x = {
        'id': id, 'source': 'UNSETLD', 'track': track, 'title': title, 'short': short, 'proof': proof,
        'proofType': proof_type, 'points': points, 'minutes': minutes,
    }
    if timer:
        x['timerMinutes'] = timer
    x['requires'] = requires or []
    x['frequency'] = freq
    x['cooldownDays'] = cooldown
    x['repeatable'] = True
    if anchor:
        x['anchor'] = True
    if group:
        x['group'] = group
    if when:
        x['when'] = when
    if days:
        x['days'] = days
    if weight and weight != 1:
        x['weight'] = weight
    if template:
        x['template'] = template
        x['personalize'] = personalize
    t = [track] + [k for k in (tags or []) if k != track]
    assert len(t) == len(set(t)) and len(t) <= 8, (id, t)
    x['tags'] = t
    x['active'] = True
    L.append(x)


NOTES = 'A photo of your notes or the work in front of you.'
WORKOUT = 'A photo of where you trained: the gym, your equipment, mat or shoes. Not your body.'

# ── DISCIPLINE ─────────────────────────────────────────────────────────────
m('D1', 'Lock In for 30 Minutes', "Pick one thing, like tonight's homework or the song you're learning, and work only on that until the timer ends.", TP, 30, 15,
  'What you worked on, after the timer.', freq='high', cooldown=1, anchor=True, group='deep-work',
  tags=['focus', 'habits', 'routine'])
m('D2', 'Work on Your Top To-Do for 30 Minutes',
  "Pick what matters most today, like studying for tomorrow's test or a paper due this week, and work on it.", TP, 30, 15,
  'What you worked on, after the timer.', freq='high', cooldown=1, anchor=True, group='deep-work',
  tags=['focus', 'priorities'])
m('D3', "Finish One Thing You've Been Avoiding", 'Pick one task you keep putting off, like an email you owe, a form to fill out, or a pile of laundry, and finish it.',
  P, 30, 15, 'The finished result. Cover anything private.', freq='medium', cooldown=3, group='finish-it',
  tags=['habits', 'focus'])
m('D4', 'List 3 Things You Need to Do Tomorrow', 'Write down the three things that matter most tomorrow, like a quiz to study for or a form to turn in.', P, 5, 5,
  'Your written list of three.', freq='medium', cooldown=3, when='evening', group='planning',
  tags=['planning', 'routine', 'habits'])
m('D5', 'Work With Your Phone Away for 30 Minutes', 'Start the timer, put your phone in a drawer or another room, and work on homework or another task until it ends.',
  TP, 30, 15, 'What you worked on, after the timer.', freq='high', cooldown=1, anchor=True, group='deep-work',
  tags=['focus', 'phone', 'habits'])
m('D6', 'Finish Something You Left Half Done', "Pick something you started but didn't finish, like a half-done worksheet or a drawer you were sorting, and finish it.", P, 20, 10,
  'The finished result. Cover anything private.', freq='medium', cooldown=3, group='finish-it', tags=['focus'])

# ── SCHOOL ─────────────────────────────────────────────────────────────────
m('S1', 'Study One Subject for 30 Minutes', 'Go over your notes, redo a few homework problems, or read the next chapter until the timer ends.', TP, 30, 15,
  NOTES + ' After the timer.', freq='high', cooldown=1, anchor=True, group='study-block',
  tags=['study', 'grades', 'gpa'], template='Study {subject} for 30 Minutes', personalize='subject')
m('S2', 'Test Yourself Without Looking at Your Notes',
  'Close your notes and answer a few review questions from the end of a chapter or a study guide, then check them.', P, 15, 10,
  'Your answers, written from memory.', freq='high', cooldown=2, group='recall', tags=['study', 'exam', 'test'])
m('S3', 'Complete 10 Practice Problems', 'Do ten practice problems for one class, like math problems from your textbook or questions from an old quiz.', P, 20, 10,
  'Your worked problems.', freq='high', cooldown=1, tags=['study', 'homework', 'exam', 'practice'])
m('S4', 'Write Everything You Remember About One Topic',
  'Without opening your notes, fill a page with everything you remember about one topic, like the water cycle.', P, 15, 10,
  'What you wrote from memory.', freq='medium', cooldown=3, group='recall', tags=['study', 'exam', 'test'])
m('S5', 'Finish One Assignment', "Finish one assignment so it's ready to turn in, like a worksheet, a lab write-up, or a discussion post.", P, 30, 15,
  'The finished assignment or its submitted screen. Hide your name and any grades.', freq='high', cooldown=1,
  anchor=True, tags=['homework', 'grades', 'assignment'])
m('S6', "Start an Assignment Before It's Urgent",
  "Start an assignment that isn't due for a few days, like outlining an essay or reading the first chapter of a book.", TP, 30, 15,
  'What you started, after the timer.', freq='medium', cooldown=3, tags=['homework', 'assignment'])
m('S7', "Turn Today's Notes Into 10 Questions", "Read over today's notes from one class and write ten questions a test could ask about them.", P, 15, 10,
  'Your ten questions.', freq='medium', cooldown=3, when='evening', tags=['study', 'notes', 'exam'])
m('S9', 'Test Yourself on Flashcards for 20 Minutes', 'Go through your flashcards, like vocab words or formulas, saying each answer before you flip the card.',
  TP, 20, 10, 'Your flashcards, after the timer.', freq='high', cooldown=1, group='study-block',
  tags=['study', 'flashcards', 'exam', 'test'])
m('S10', 'Explain One Hard Topic in Your Own Words',
  "Without your notes, write how you'd explain one hard topic to a friend, like solving for x or how photosynthesis works.", P, 15, 10,
  'Your explanation, written from memory.', freq='high', cooldown=2, group='recall', tags=['study', 'exam'])
m('S11', 'Spend 30 Minutes on Your Hardest Class',
  "Work on the class that's hardest for you, like redoing quiz questions you missed or rereading a confusing lesson.", TP, 30, 15,
  NOTES + ' After the timer.', freq='high', cooldown=1, group='study-block', tags=['study', 'grades', 'gpa'])
m('S12', 'Create Your Study Plan for the Week',
  "Write what you'll study each day this week, like Monday for the history quiz and Wednesday for the essay.", P, 15, 10, 'Your written plan.',
  freq='low', cooldown=7, group='planning-week', tags=['planning', 'exam', 'study'])
m('S13', 'Work on a School Project for 30 Minutes',
  "Pick a school project that isn't due today, like a poster, a slideshow, or a research paper, and do the next part.", TP, 30, 15,
  'Your project work, after the timer.', freq='medium', cooldown=3, tags=['homework', 'assignment', 'grades'])
m('S15', 'Review a Topic You Learned Earlier This Week',
  'Go back to your notes from a class two or three days ago and quiz yourself on them until the timer ends.', TP, 20, 10,
  'Your review, after the timer.', freq='high', cooldown=2, tags=['study', 'exam', 'test'])

# ── FITNESS ────────────────────────────────────────────────────────────────
m('F1', 'Complete Your Workout', 'Do the whole workout you planned for today, like a team practice, drills for your sport, or a dance routine.', P, 45, 20, WORKOUT, freq='high',
  cooldown=1, anchor=True, group='workout', tags=['workout', 'gym', 'training', 'strength'])
m('F2', 'Walk for 30 Minutes', 'Take a 30-minute walk, like laps around your block, the long way home, or a loop at a park.', TP, 30, 15,
  'Where you walked, after the timer. Not your face.', freq='high', cooldown=1, group='cardio',
  tags=['walk', 'cardio', 'endurance'])
m('F3', 'Do 20 Minutes of Cardio', 'Do something that keeps you breathing hard for 20 minutes, like jumping rope, dancing, or running stairs.', TP, 20, 10,
  'Where you did it, after the timer. Not your body.', freq='high', cooldown=1, group='cardio',
  tags=['cardio', 'run', 'endurance'])
m('F5', 'Complete a 30-Minute At-Home Workout',
  'Do a 30-minute workout at home with what you have, like push-ups, squats, and planks, or a workout video.', TP, 30, 15,
  'Your workout space or equipment, after the timer. Not your body.', freq='high', cooldown=1, anchor=True, group='workout',
  tags=['workout', 'home', 'strength'])
m('F6', 'Get Outside and Move for 20 Minutes', 'Spend 20 minutes moving outside, like shooting hoops, skateboarding, or kicking a ball around.', TP, 20, 10,
  'Where you were, after the timer. Not your face.', freq='high', cooldown=1, group='cardio',
  tags=['walk', 'cardio', 'outside'])
m('F7', 'Complete Your Planned Strength Workout', 'Do every set of the strength workout you planned for today, like lifting weights at a gym or pull-ups at a park.', P, 45, 20,
  WORKOUT, freq='high', cooldown=1, group='workout', tags=['strength', 'gym', 'muscle', 'workout'])
m('F8', 'Do Your Planned Cardio Today', 'Do the cardio you planned for today, like a run, a bike ride, or a swim, and keep going until the timer ends.', TP, 30, 15,
  'Where you did it, after the timer. Not your body.', freq='high', cooldown=1, group='cardio',
  tags=['cardio', 'run', 'endurance', 'training'])

# ── MONEY ──────────────────────────────────────────────────────────────────
NO_BANK = 'Written, never a bank or card screen.'
m('M1', 'Track Everything You Spend Today', 'Write down everything you spent today, even small things like a snack, a bus fare, or an in-app purchase.', P, 5, 5,
  'Your written list of what you spent. ' + NO_BANK, freq='high', cooldown=1, anchor=True, when='evening',
  tags=['spending', 'budget', 'money'])
m('M2', 'Add Up What You Spent This Past Week',
  'Sort the last seven days of purchases into groups, like food, clothes, and games, and add up each one.', P, 15, 10,
  'Your notes or a summary by category. ' + NO_BANK, freq='low', cooldown=7, tags=['spending', 'budget'])
m('M3', 'Make a Spending Plan for This Week', "Write how you'll split the money you have, like allowance, gift money, or pay, between food, fun, and saving this week.",
  P, 10, 5, 'Your written plan. ' + NO_BANK, freq='low', cooldown=7, tags=['budget', 'save', 'planning'])
m('M5', 'Decide If One Subscription Is Worth It',
  'Pick one thing you pay for every month, like a music app or a game pass, and decide whether to keep it.', P, 10, 5,
  'A written note of the charge and what you decided. No account screenshots.', freq='low', cooldown=30,
  tags=['spending', 'subscriptions'])
m('M6', 'Set One Savings Goal and Deadline',
  'Pick something you want to save for, like new shoes or a concert ticket, and write how much you need and by when.', P, 10, 5,
  'Your written goal, amount and deadline.', freq='low', cooldown=45, tags=['save', 'savings', 'goal'])

# ── CAREER ─────────────────────────────────────────────────────────────────
HIDE = 'Hide anything personal.'
m('C1', 'Improve One Resume Bullet', 'Rewrite one resume line to say what you did and the result, like money raised at a bake sale or customers you helped.',
  P, 15, 10, 'The rewritten bullet. ' + HIDE, freq='low', cooldown=14, tags=['resume', 'job', 'internship'])
m('C2', 'Apply to One Job or Internship',
  'Fill out and submit one application, like a part-time job at a store, a summer internship, or a scholarship.', P, 30, 15,
  'The submitted screen or confirmation. ' + HIDE, freq='medium', cooldown=3, requires=['jobsearch'], anchor=True,
  tags=['apply', 'job', 'internship'], template='Apply to One {opportunity}', personalize='opportunity')
m('C3', 'Find 3 Opportunities Worth Applying To',
  'Look up jobs, internships, scholarships, or summer programs and write down three to apply to, with any deadlines.', P, 20, 10,
  'Your list of three.', freq='medium', cooldown=3, tags=['job', 'internship', 'apply', 'research'],
  template='Find 3 {opportunities} Worth Applying To', personalize='opportunity', weight=2)
m('C4', 'Improve One Part of Your Portfolio',
  'Fix one thing in your portfolio, like a blurry photo of your work, an unclear description, or a broken link.', P, 30, 15,
  'The improved part. ' + HIDE, freq='medium', cooldown=3, group='portfolio', tags=['portfolio', 'design'])
m('C5', 'Practice 5 Interview Questions', 'Write answers to five interview questions, like why you want the job or a time you solved a problem, and say them aloud.', P, 20,
  10, 'Your notes on the five answers.', freq='low', cooldown=7, tags=['interview', 'job'])
m('C7', 'Spend 30 Minutes Practicing a Job Skill',
  'Practice something most jobs ask for, like typing, making a spreadsheet, or writing a clear, polite email.', TP, 30, 15,
  'What you practiced, after the timer.', freq='medium', cooldown=3, anchor=True, tags=['skill', 'learn', 'work'])
m('C9', 'Add Something New to Your Resume or Portfolio',
  "Add one thing that isn't listed yet, like a club role, an award, a summer job, or something you made.", P, 15, 10,
  'The new entry. ' + HIDE, freq='low', cooldown=21, group='portfolio', tags=['resume', 'portfolio'])
m('C10', 'Research 3 Skills Required for a Job You Want',
  'Look up postings for a job you want someday, like nurse or game designer, and write three skills they ask for.', P, 15, 10,
  'Your notes on the three skills.', freq='low', cooldown=14, tags=['research', 'job', 'skill'])
m('C11', 'Practice Explaining Something You Made',
  'Pick something you made, like a science fair project or a video, and write what it was, what you did, and how it went.', P, 15, 10,
  'Your outline or notes.', freq='medium', cooldown=4, tags=['interview', 'portfolio'])
m('C12', 'Complete One Part of an Application',
  'Finish one section of a job, school, or scholarship application, like the short essay or the activities list.', P, 30, 15,
  'The part you finished. ' + HIDE, freq='medium', cooldown=3, tags=['apply', 'application', 'job', 'internship'])

# ── PROJECTS ───────────────────────────────────────────────────────────────
m('P1', 'Work on Your Project for 30 Minutes', 'Do the next real step, like writing code, designing a shirt, editing your next video, or recording a song.', TP, 30,
  15, 'What you worked on, after the timer.', freq='high', cooldown=1, anchor=True, group='build-block',
  tags=['build', 'project', 'brand', 'app', 'business'], template='Work on {project} for 30 Minutes',
  personalize='project')
m('P2', 'Finish One Small Part of Your Project', 'Get one small piece fully done, like one app screen, one product photo, the chorus of a song, or a video intro.', P, 30,
  15, 'The finished part.', freq='high', cooldown=1, tags=['build', 'project', 'launch'],
  template='Finish One Small Part of {project}', personalize='project')
m('P3', 'Make One Post or Video for Your Project',
  'Make one finished post you could share, like a clip of your process, a product photo with a caption, or a song preview.', P, 30, 15,
  'The finished post or video.', freq='medium', cooldown=3, tags=['content', 'brand', 'audience', 'sell'],
  template='Make One Post or Video for {project}', personalize='project')
m('P4', 'Improve One Page, Photo, or Screen', "Redo one thing people see first, like a product photo, a video thumbnail, your site's home page, or an app screen.",
  BA, 30, 15, 'Before and after.', freq='medium', cooldown=3, group='improve',
  tags=['product', 'brand', 'shop', 'app', 'design'])
m('P5', 'Fix One Thing Wrong With Your Project',
  "Find one thing that's broken or off, like a bug, a dead link, a loose seam, or audio that's too quiet, and fix it.", P, 30, 15, 'The fixed result.',
  freq='high', cooldown=2, tags=['build', 'project', 'app'], template='Fix One Thing Wrong With {project}',
  personalize='project')
m('P6', 'Plan the Next 3 Steps for Your Project', 'Write three steps you can each do in one sitting, like sketching a logo, filming an intro, or fixing a sign-up page.',
  P, 10, 5, 'Your written list of three.', freq='medium', cooldown=3, group='planning', tags=['planning', 'project', 'support'],
  template='Plan the Next 3 Steps for {project}', personalize='project')
m('P7', 'Sketch One New Design', 'Sketch one new idea on paper or on a screen, like a shirt graphic, a logo, an app layout, or cover art for a song.',
  P, 30, 15, 'What you made.', freq='high', cooldown=2, group='draft', tags=['design', 'build', 'brand', 'clothing'])
m('P9', 'Check Your Views or Sales and Pick One Change',
  "Look at one number, like video views, shop sales, or app downloads, and write one thing you'll change because of it.", P, 15, 10,
  'Your written decision. No customer or financial details.', freq='low', cooldown=7,
  tags=['business', 'customers', 'sell'])
m('P10', 'Publish Something You Made', "Finish and post one thing that's been sitting in drafts, like a video, a song, a shop item, or a blog post.", P, 20, 10,
  'What you published.', freq='medium', cooldown=4, tags=['launch', 'publish', 'content'])
m('P11', 'Improve Something You Made Yesterday', "Open yesterday's work and make one clear change, like trimming a slow clip, fixing a design's colors, or tidying code.", BA, 20, 10,
  'Before and after.', freq='high', cooldown=2, group='improve', tags=['build', 'project', 'follow-up'])
m('P12', 'Turn One Idea Into a First Draft', 'Write or record a rough first version of one idea, like a video script, a song demo, or a product description.', P, 30, 15,
  'Your first draft.', freq='high', cooldown=2, group='draft', tags=['build', 'launch', 'idea'])

# ── SKILLS ─────────────────────────────────────────────────────────────────
m('K1', 'Practice Your Skill for 30 Minutes', 'Practice by doing, not watching, like playing scales, speaking Spanish aloud, sketching, or solving a coding exercise.',
  TP, 30, 15, 'What you practiced, after the timer.', freq='high', cooldown=1, anchor=True, group='practice-block',
  tags=['practice', 'learn', 'skill'], template='Practice {skill} for 30 Minutes', personalize='skill')
m('K2', 'Complete One Lesson, Then Use What You Learned',
  'Finish one lesson in a book, course, or app, then use it right away, like writing Spanish sentences with the new words.', P, 30, 15,
  'What you made with what you learned.', freq='high', cooldown=2, group='lesson', tags=['learn', 'course', 'practice'])
m('K3', 'Practice What Trips You Up for 20 Minutes',
  'Slowly repeat the one thing you keep getting wrong, like a chord change, Spanish verb endings, or drawing hands.', TP, 20, 10,
  'What you practiced, after the timer.', freq='high', cooldown=2, group='practice-block', tags=['practice', 'skill'])
m('K4', 'Make One Small Thing Using Your Skill', 'Make one small, finished thing, like a one-page website, a short comic, a simple song, or a paragraph in Spanish.',
  P, 45, 20, 'What you made.', freq='medium', cooldown=4, group='make', tags=['build', 'practice', 'coding', 'design'])
m('K5', 'Explain One Thing You Learned From Memory', 'Close the book or video and write out one thing you learned, like how a chord is built or a Spanish grammar rule.',
  P, 15, 10, 'Your explanation, written from memory.', freq='high', cooldown=2, tags=['learn'])
m('K6', 'Create Something Worth Showing Someone', "Make one finished piece you'd show a friend, like a full drawing, a recorded cover song, or a one-minute video.", P, 45,
  20, 'The finished piece.', freq='medium', cooldown=4, group='make', tags=['portfolio', 'design', 'coding'])
m('K7', 'Improve Something You Created Before', 'Open something you made weeks or months ago, like an old drawing, song, or essay, and redo one part better.', BA, 20, 10,
  'Before and after.', freq='high', cooldown=2, tags=['practice', 'improve'])
m('K9', 'Watch One Tutorial and Apply One Thing From It',
  'Watch one how-to video, like a guitar lesson or a video-editing tip, then try that one thing yourself right away.', P, 30, 15,
  'What you made with it.', freq='high', cooldown=2, group='lesson', tags=['learn', 'tutorial', 'practice'])
m('K10', 'Recreate Something Without Following the Tutorial',
  'Make something you learned from a video again with the video closed, like a drawing, a guitar riff, or a small program.', P, 30, 15,
  'What you recreated.', freq='medium', cooldown=3, tags=['practice', 'learn'])

# ── ORGANIZATION ───────────────────────────────────────────────────────────
m('O1', 'Clear Your Desk', 'Throw out trash, put away papers and chargers, and leave only what you need on your desk.', BA, 10, 5, 'Before and after of the desk.',
  freq='medium', cooldown=3, group='desk', tags=['clean', 'organize', 'desk'])
m('O2', 'Clean Up Your Room', 'Spend 15 minutes putting clothes away, clearing the floor, and making your bed.', BA, 15, 10,
  'Before and after of the room.', freq='medium', cooldown=3, anchor=True, tags=['clean', 'organize', 'room'])
m('O5', 'Pack Everything You Need for Tomorrow', 'Pack your bag tonight with what you need tomorrow, like homework, your charger, and clothes for practice.', P,
  10, 5, 'What you packed.', freq='medium', cooldown=3, when='evening', tags=['planning', 'organize', 'tomorrow'])
m('O8', 'Reset Your Workspace for Tomorrow', "Put things back where they go and set out what you'll start with tomorrow, like the notebook you need first.", P, 10, 5,
  'Your workspace, ready.', freq='medium', cooldown=3, when='evening', group='desk', tags=['clean', 'organize', 'desk'])
m('O9', 'Review Your Calendar for the Next 7 Days',
  "Look at the next seven days and write down what's coming, like tests, practices, work shifts, and birthdays.",
  P, 10, 5, 'Your written summary. No calendar screenshot needed.', freq='low', cooldown=7, group='planning-week',
  tags=['planning', 'organize', 'routine'])


APPROVED = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6',
            'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S9', 'S10', 'S11', 'S12', 'S13', 'S15',
            'F1', 'F2', 'F3', 'F5', 'F6', 'F7', 'F8',
            'M1', 'M2', 'M3', 'M5', 'M6',
            'C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C9', 'C10', 'C11', 'C12',
            'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P9', 'P10', 'P11', 'P12',
            'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K9', 'K10',
            'O1', 'O2', 'O5', 'O8', 'O9']

if __name__ == '__main__':
    assert [x['id'] for x in L] == APPROVED, 'the library must be exactly the approved list, in order'
    assert len(L) == 66
    root = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'content', 'missions.json')
    with open(root, 'w') as f:
        json.dump(L, f, indent=1, ensure_ascii=False)
        f.write('\n')
    from collections import Counter
    print(len(L), 'missions', dict(Counter(x['track'] for x in L)))
