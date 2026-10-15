#!/usr/bin/env python3
"""The APPROVED UNSETLD mission library: the only built-in missions the app can plan, swap in
or recommend. Run: python3 scripts/missions/library.py; it writes src/content/missions.json.

66 missions, chosen by the founder from productivity, learning, fitness, finance, career and
behaviour-change research (docs/MISSIONS_SPEC.md §4). Rules for editing this file:
- Do not add missions, rename them, or reword them into slogans. Titles and descriptions are
  the approved text. Only a template slot ({project}, {subject}, {opportunity}, {skill}) may be
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
    if 'Minutes' in title and 'Reset' not in title:
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
m('D1', 'Lock In for 30 Minutes', 'Spend 30 uninterrupted minutes working on something important.', TP, 30, 15,
  'What you worked on, after the timer.', freq='high', cooldown=1, anchor=True, group='deep-work',
  tags=['focus', 'habits', 'routine'])
m('D2', 'Do Your Most Important Task for 30 Minutes',
  'Choose the task that matters most today and work on it for 30 focused minutes.', TP, 30, 15,
  'What you worked on, after the timer.', freq='high', cooldown=1, anchor=True, group='deep-work',
  tags=['focus', 'priorities'])
m('D3', "Finish One Thing You've Been Avoiding", 'Choose one useful task you have been putting off and finish it.',
  P, 30, 15, 'The finished result. Cover anything private.', freq='medium', cooldown=3, group='finish-it',
  tags=['habits', 'focus'])
m('D4', "Plan Tomorrow's Top 3", 'Write down the three most important things you need to get done tomorrow.', P, 5, 5,
  'Your written list of three.', freq='medium', cooldown=3, when='evening', group='planning',
  tags=['planning', 'routine', 'habits'])
m('D5', 'Work With Your Phone Away for 30 Minutes', 'Put your phone away and work without distractions for 30 minutes.',
  TP, 30, 15, 'What you worked on, after the timer.', freq='high', cooldown=1, anchor=True, group='deep-work',
  tags=['focus', 'phone', 'habits'])
m('D6', 'Finish One Unfinished Task', 'Choose one incomplete task and finish it today.', P, 20, 10,
  'The finished result. Cover anything private.', freq='medium', cooldown=3, group='finish-it', tags=['focus'])

# ── SCHOOL ─────────────────────────────────────────────────────────────────
m('S1', 'Study One Subject for 30 Minutes', 'Spend 30 focused minutes studying one class or subject.', TP, 30, 15,
  NOTES + ' After the timer.', freq='high', cooldown=1, anchor=True, group='study-block',
  tags=['study', 'grades', 'gpa'], template='Study {subject} for 30 Minutes', personalize='subject')
m('S2', 'Test Yourself Without Looking at Your Notes',
  'Choose a topic and answer questions or write what you know without checking your notes first.', P, 15, 10,
  'Your answers, written from memory.', freq='high', cooldown=2, group='recall', tags=['study', 'exam', 'test'])
m('S3', 'Complete 10 Practice Problems', 'Complete ten useful practice problems for one of your classes.', P, 20, 10,
  'Your worked problems.', freq='high', cooldown=1, tags=['study', 'homework', 'exam', 'practice'])
m('S4', 'Write Everything You Remember About One Topic',
  'Without checking your notes first, write everything you remember about one topic.', P, 15, 10,
  'What you wrote from memory.', freq='medium', cooldown=3, group='recall', tags=['study', 'exam', 'test'])
m('S5', 'Finish One Assignment', 'Complete one assignment you need to get done.', P, 30, 15,
  'The finished assignment or its submitted screen. Hide your name and any grades.', freq='high', cooldown=1,
  anchor=True, tags=['homework', 'grades', 'assignment'])
m('S6', "Start an Assignment Before It's Urgent",
  'Spend focused time beginning an assignment before the deadline becomes stressful.', TP, 30, 15,
  'What you started, after the timer.', freq='medium', cooldown=3, tags=['homework', 'assignment'])
m('S7', "Turn Today's Notes Into 10 Questions", 'Create ten questions from something you learned today.', P, 15, 10,
  'Your ten questions.', freq='medium', cooldown=3, when='evening', tags=['study', 'notes', 'exam'])
m('S9', 'Test Yourself on Flashcards for 20 Minutes', 'Use flashcards to actively test your memory for 20 minutes.',
  TP, 20, 10, 'Your flashcards, after the timer.', freq='high', cooldown=1, group='study-block',
  tags=['study', 'flashcards', 'exam', 'test'])
m('S10', 'Explain One Difficult Concept From Memory',
  'Write an explanation of one difficult concept without checking your notes first.', P, 15, 10,
  'Your explanation, written from memory.', freq='high', cooldown=2, group='recall', tags=['study', 'exam'])
m('S11', 'Spend 30 Minutes on Your Hardest Class',
  'Spend 30 focused minutes working on the class that currently needs the most attention.', TP, 30, 15,
  NOTES + ' After the timer.', freq='high', cooldown=1, group='study-block', tags=['study', 'grades', 'gpa'])
m('S12', 'Create Your Study Plan for the Week',
  'Plan what subjects, assignments, or exams you need to work on this week.', P, 15, 10, 'Your written plan.',
  freq='low', cooldown=7, group='planning-week', tags=['planning', 'exam', 'study'])
m('S13', 'Work on an Upcoming Project for 30 Minutes',
  'Spend 30 focused minutes making progress on a school project that is not due today.', TP, 30, 15,
  'Your project work, after the timer.', freq='medium', cooldown=3, tags=['homework', 'assignment', 'grades'])
m('S15', 'Review a Topic You Learned Earlier This Week',
  'Return to something you learned earlier this week and test yourself on it again.', TP, 20, 10,
  'Your review, after the timer.', freq='high', cooldown=2, tags=['study', 'exam', 'test'])

# ── FITNESS ────────────────────────────────────────────────────────────────
m('F1', 'Complete Your Workout', 'Complete the workout you planned for today.', P, 45, 20, WORKOUT, freq='high',
  cooldown=1, anchor=True, group='workout', tags=['workout', 'gym', 'training', 'strength'])
m('F2', 'Walk for 30 Minutes', 'Take a purposeful 30-minute walk.', TP, 30, 15,
  'Where you walked, after the timer. Not your face.', freq='high', cooldown=1, group='cardio',
  tags=['walk', 'cardio', 'endurance'])
m('F3', 'Do 20 Minutes of Cardio', 'Complete at least 20 minutes of cardio.', TP, 20, 10,
  'Where you did it, after the timer. Not your body.', freq='high', cooldown=1, group='cardio',
  tags=['cardio', 'run', 'endurance'])
m('F5', 'Complete a 30-Minute At-Home Workout',
  'Complete a 30-minute workout using whatever equipment or space you have available.', TP, 30, 15,
  'Your workout space or equipment, after the timer. Not your body.', freq='high', cooldown=1, anchor=True, group='workout',
  tags=['workout', 'home', 'strength'])
m('F6', 'Get Outside and Move for 20 Minutes', 'Spend at least 20 minutes moving outside.', TP, 20, 10,
  'Where you were, after the timer. Not your face.', freq='high', cooldown=1, group='cardio',
  tags=['walk', 'cardio', 'outside'])
m('F7', 'Complete Your Planned Strength Workout', 'Complete the strength workout you planned for today.', P, 45, 20,
  WORKOUT, freq='high', cooldown=1, group='workout', tags=['strength', 'gym', 'muscle', 'workout'])
m('F8', 'Do Your Planned Cardio Today', 'Complete the cardio session you planned for today.', TP, 30, 15,
  'Where you did it, after the timer. Not your body.', freq='high', cooldown=1, group='cardio',
  tags=['cardio', 'run', 'endurance', 'training'])

# ── MONEY ──────────────────────────────────────────────────────────────────
NO_BANK = 'Written, never a bank or card screen.'
m('M1', 'Track Everything You Spend Today', 'Write down everything you spent money on today.', P, 5, 5,
  'Your written list of what you spent. ' + NO_BANK, freq='high', cooldown=1, anchor=True, when='evening',
  tags=['spending', 'budget', 'money'])
m('M2', 'Review Your Spending From the Last 7 Days',
  'Look over what you spent during the past week and identify where your money went.', P, 15, 10,
  'Your notes or a summary by category. ' + NO_BANK, freq='low', cooldown=7, tags=['spending', 'budget'])
m('M3', 'Make a Spending Plan for This Week', 'Decide how you want to use your money this week before you spend it.',
  P, 10, 5, 'Your written plan. ' + NO_BANK, freq='low', cooldown=7, tags=['budget', 'save', 'planning'])
m('M5', 'Check One Subscription or Recurring Charge',
  'Review one recurring expense and decide whether it is still worth paying for.', P, 10, 5,
  'A written note of the charge and what you decided. No account screenshots.', freq='low', cooldown=30,
  tags=['spending', 'subscriptions'])
m('M6', 'Set One Savings Goal and Deadline',
  'Choose something you want to save for, decide how much you need, and give yourself a deadline.', P, 10, 5,
  'Your written goal, amount and deadline.', freq='low', cooldown=45, tags=['save', 'savings', 'goal'])

# ── CAREER ─────────────────────────────────────────────────────────────────
HIDE = 'Hide anything personal.'
m('C1', 'Improve One Resume Bullet', 'Rewrite one resume bullet so it explains your work, result, or impact more clearly.',
  P, 15, 10, 'The rewritten bullet. ' + HIDE, freq='low', cooldown=14, tags=['resume', 'job', 'internship'])
m('C2', 'Apply to One Job or Internship',
  'Submit one application for a job, internship, scholarship, or relevant opportunity.', P, 30, 15,
  'The submitted screen or confirmation. ' + HIDE, freq='medium', cooldown=3, requires=['jobsearch'], anchor=True,
  tags=['apply', 'job', 'internship'], template='Apply to One {opportunity}', personalize='opportunity')
m('C3', 'Find 3 Opportunities Worth Applying To',
  'Find three jobs, internships, scholarships, or opportunities that genuinely fit your goals.', P, 20, 10,
  'Your list of three.', freq='medium', cooldown=3, tags=['job', 'internship', 'apply', 'research'],
  template='Find 3 {opportunities} Worth Applying To', personalize='opportunity')
m('C4', 'Improve One Part of Your Portfolio',
  'Improve one project, page, description, design, or example of your work.', P, 30, 15,
  'The improved part. ' + HIDE, freq='medium', cooldown=3, group='portfolio', tags=['portfolio', 'design'])
m('C5', 'Practice 5 Interview Questions', 'Practice answering five common or role-specific interview questions.', P, 20,
  10, 'Your notes on the five answers.', freq='low', cooldown=7, tags=['interview', 'job'])
m('C7', 'Spend 30 Minutes Building a Career Skill',
  'Spend 30 focused minutes practicing a skill that can improve your future career opportunities.', TP, 30, 15,
  'What you practiced, after the timer.', freq='medium', cooldown=3, anchor=True, tags=['skill', 'learn', 'work'])
m('C9', 'Add One Project or Accomplishment to Your Resume or Portfolio',
  'Document one useful project, achievement, or piece of experience.', P, 15, 10,
  'The new entry. ' + HIDE, freq='low', cooldown=21, group='portfolio', tags=['resume', 'portfolio'])
m('C10', 'Research 3 Skills Required for a Job You Want',
  "Choose a role you're interested in and identify three skills employers commonly expect.", P, 15, 10,
  'Your notes on the three skills.', freq='low', cooldown=14, tags=['research', 'job', 'skill'])
m('C11', "Practice Explaining One Project You've Built",
  'Prepare a clear explanation of what you built, what you did, and what the result was.', P, 15, 10,
  'Your outline or notes.', freq='medium', cooldown=4, tags=['interview', 'portfolio'])
m('C12', 'Complete One Part of an Application',
  'Make meaningful progress on a job, internship, scholarship, school, or program application.', P, 30, 15,
  'The part you finished. ' + HIDE, freq='medium', cooldown=3, tags=['apply', 'application', 'job', 'internship'])

# ── PROJECTS ───────────────────────────────────────────────────────────────
m('P1', 'Work on Your Project for 30 Minutes', 'Spend 30 focused minutes working on something you are building.', TP, 30,
  15, 'What you worked on, after the timer.', freq='high', cooldown=1, anchor=True, group='build-block',
  tags=['build', 'project', 'brand', 'app', 'business'], template='Work on {project} for 30 Minutes',
  personalize='project')
m('P2', 'Finish One Small Part of Your Project', 'Choose one clearly defined piece of your project and finish it.', P, 30,
  15, 'The finished part.', freq='high', cooldown=1, tags=['build', 'project', 'launch'],
  template='Finish One Small Part of {project}', personalize='project')
m('P3', 'Create One Piece of Content',
  'Create one complete piece of useful content for your project, business, portfolio, or audience.', P, 30, 15,
  'The finished piece.', freq='medium', cooldown=3, tags=['content', 'brand', 'audience', 'sell'])
m('P4', 'Improve One Page, Screen, Product, or Listing', 'Take one existing part of your project and noticeably improve it.',
  BA, 30, 15, 'Before and after.', freq='medium', cooldown=3, group='improve',
  tags=['product', 'brand', 'shop', 'app', 'design'])
m('P5', 'Fix One Problem With Your Project',
  'Identify one real problem, bug, weak point, or unfinished issue and fix it.', P, 30, 15, 'The fixed result.',
  freq='high', cooldown=2, tags=['build', 'project', 'app'], template='Fix One Problem With {project}',
  personalize='project')
m('P6', 'Write Your Next 3 Project Actions', 'Decide the next three concrete actions required to move your project forward.',
  P, 10, 5, 'Your written list of three.', freq='medium', cooldown=3, group='planning', tags=['planning', 'project', 'support'])
m('P7', 'Create One New Design, Prototype, or Draft', 'Turn an idea into something tangible that you can review or improve.',
  P, 30, 15, 'What you made.', freq='high', cooldown=2, group='draft', tags=['design', 'build', 'brand', 'clothing'])
m('P9', 'Review One Important Metric and Make One Decision From It',
  'Look at one useful project or business metric and decide what you should do next because of it.', P, 15, 10,
  'Your written decision. No customer or financial details.', freq='low', cooldown=7,
  tags=['business', 'customers', 'sell'])
m('P10', 'Publish Something You Made', 'Finish and publish something useful instead of leaving it unfinished.', P, 20, 10,
  'What you published.', freq='medium', cooldown=4, tags=['launch', 'publish', 'content'])
m('P11', 'Improve Something You Made Yesterday', 'Return to recent work and make one meaningful improvement.', BA, 20, 10,
  'Before and after.', freq='high', cooldown=2, group='improve', tags=['build', 'project', 'follow-up'])
m('P12', 'Turn One Idea Into a First Draft', 'Choose one idea and create the first usable version of it.', P, 30, 15,
  'Your first draft.', freq='high', cooldown=2, group='draft', tags=['build', 'launch', 'idea'])

# ── SKILLS ─────────────────────────────────────────────────────────────────
m('K1', 'Practice Your Skill for 30 Minutes', 'Spend 30 focused minutes actively practicing a skill you want to improve.',
  TP, 30, 15, 'What you practiced, after the timer.', freq='high', cooldown=1, anchor=True, group='practice-block',
  tags=['practice', 'learn', 'skill'], template='Practice {skill} for 30 Minutes', personalize='skill')
m('K2', 'Complete One Lesson, Then Use What You Learned',
  'Complete one useful lesson and immediately apply at least one thing from it.', P, 30, 15,
  'What you made with what you learned.', freq='high', cooldown=2, group='lesson', tags=['learn', 'course', 'practice'])
m('K3', 'Practice One Weak Part of Your Skill for 20 Minutes',
  'Identify the part of your skill you struggle with most and deliberately practice it.', TP, 20, 10,
  'What you practiced, after the timer.', freq='high', cooldown=2, group='practice-block', tags=['practice', 'skill'])
m('K4', 'Build a Small Project Using Your Skill', "Create something small that forces you to use the skill you're learning.",
  P, 45, 20, 'What you built.', freq='medium', cooldown=4, group='make', tags=['build', 'practice', 'coding', 'design'])
m('K5', 'Explain One Thing You Learned From Memory', 'Without checking your source first, explain one thing you recently learned.',
  P, 15, 10, 'Your explanation, written from memory.', freq='high', cooldown=2, tags=['learn'])
m('K6', 'Create Something You Can Put in a Portfolio', 'Create a finished piece of work that represents your ability.', P, 45,
  20, 'The finished piece.', freq='medium', cooldown=4, group='make', tags=['portfolio', 'design', 'coding'])
m('K7', 'Improve Something You Created Before', 'Take an older piece of work and make it noticeably better.', BA, 20, 10,
  'Before and after.', freq='high', cooldown=2, tags=['practice', 'improve'])
m('K9', 'Watch One Tutorial and Apply One Thing From It',
  'Use a tutorial to learn something, then immediately apply that knowledge yourself.', P, 30, 15,
  'What you made with it.', freq='high', cooldown=2, group='lesson', tags=['learn', 'tutorial', 'practice'])
m('K10', 'Recreate Something Without Following the Tutorial',
  "Try to recreate something you've learned without following the instructions step by step.", P, 30, 15,
  'What you recreated.', freq='medium', cooldown=3, tags=['practice', 'learn'])

# ── ORGANIZATION ───────────────────────────────────────────────────────────
m('O1', 'Clear Your Desk', 'Remove clutter and reset your workspace.', BA, 10, 5, 'Before and after of the desk.',
  freq='medium', cooldown=3, group='desk', tags=['clean', 'organize', 'desk'])
m('O2', 'Do a 15-Minute Room Reset', 'Spend 15 focused minutes cleaning and organizing your space.', BA, 15, 10,
  'Before and after of the room.', freq='medium', cooldown=3, anchor=True, tags=['clean', 'organize', 'room'])
m('O5', 'Pack Everything You Need for Tomorrow', 'Prepare your bag, materials, equipment, or essentials for tomorrow.', P,
  10, 5, 'What you packed.', freq='medium', cooldown=3, when='evening', tags=['planning', 'organize', 'tomorrow'])
m('O8', 'Reset Your Workspace for Tomorrow', 'Leave your workspace clean and ready for the next day.', P, 10, 5,
  'Your workspace, ready.', freq='medium', cooldown=3, when='evening', group='desk', tags=['clean', 'organize', 'desk'])
m('O9', 'Review Your Calendar for the Next 7 Days',
  'Look at the next seven days and write down the important deadlines, commitments, or tasks you need to prepare for.',
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
