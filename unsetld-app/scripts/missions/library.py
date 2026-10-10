#!/usr/bin/env python3
"""The mission library, as one readable list. Run: python3 scripts/missions/library.py
writes src/content/missions.json. Edit missions here, not in the JSON.

Every mission is a normal, high-value action a motivated 13-25 year old would
recognise: work done, something learned, made, organised, trained, or money and
career progress. Titles say what to do. One sentence says how. The proof is a
photo (or the timer) that doesn't need a face, a body, a screen of the phone
itself, grades, addresses, bank details or private messages.

Points by time: up to 5 min = 5, 6-20 = 10, 21-35 = 15 (20 for work on your
own goal: a project, a business, training), 36-59 = 20, 60+ = 25.
"""
import json
import os

P, PA, BA, TP, T = 'PHOTO', 'PHOTO_AFTER', 'BEFORE_AFTER', 'TIMER_AND_PHOTO', 'TIMER'
L = []


def m(id, track, title, minutes, points, proof_type, short, proof, cooldown=1, *, timer=None, anchor=False,
      group=None, when=None, requires=None, also=None, weight=None, repeatable=True, tags=None, days=None,
      fits=None, active=True):
    assert id.startswith(track + '-'), id
    if proof_type in (T, TP):
        timer = timer or minutes
    x = {
        'id': id, 'track': track, 'title': title, 'short': short, 'proof': proof, 'proofType': proof_type,
        'points': points, 'minutes': minutes,
    }
    if timer:
        x['timerMinutes'] = timer
    if also:
        x['also'] = also
    x['requires'] = requires or []
    x['cooldownDays'] = cooldown
    x['repeatable'] = repeatable
    if anchor:
        x['anchor'] = True
    if group:
        x['group'] = group
    if when:
        x['when'] = when
    if days:
        x['days'] = days
    if weight:
        x['weight'] = weight
    if fits:
        x['fits'] = fits
    x['tags'] = tags or [track]
    x['active'] = active
    L.append(x)


# 0 = Sunday. Getting ready for tomorrow only makes sense the night before a school or work day.
WEEKNIGHTS = [0, 1, 2, 3, 4]

# ── DISCIPLINE ─────────────────────────────────────────────────────────────
D = 'discipline'
m('discipline-make-your-bed', D, 'Make Your Bed', 3, 5, P,
  'Make your bed as soon as you get up.', 'Your made bed.', 1, anchor=True, when='morning')
m('discipline-plan-tomorrow', D, 'Plan Tomorrow', 5, 5, P,
  "Write tomorrow's 3 most important tasks and when you'll do each one.", 'Your written plan for tomorrow.', 1,
  anchor=True, group='planning')
m('discipline-top-3', D, 'Write Your Top 3 Priorities', 5, 5, P,
  'Write the 3 things that matter most today, most important first.', 'Your list of three.', 1,
  anchor=True, group='planning', when='morning')
m('discipline-lock-in-30', D, 'Lock In for 30 Minutes', 30, 15, TP,
  'Put your phone in another room and work on one task for 30 minutes without stopping.',
  'What you worked on, after the timer.', 1, anchor=True, group='deep-work')
m('discipline-focus-20', D, 'Do a 20-Minute Focus Session', 20, 10, TP,
  'Pick one task and work on only that for 20 minutes, phone away.', 'What you got done, after the timer.', 1,
  group='deep-work')
m('discipline-lock-in-60', D, 'Lock In for 60 Minutes', 60, 25, TP,
  'Phone in another room, one hour on the work that matters most to you.', 'What you got done, after the timer.', 2,
  group='deep-work')
m("discipline-avoided-task", D, "Finish Something You've Been Avoiding", 30, 15, P,
  "Pick the task you keep putting off and get it done today.", "The finished task, or a note of what you did. Private details covered.", 3,
  group="finish-it")
m("discipline-most-important-first", D, "Do Your Most Important Task First", 30, 15, P,
  "Finish your most important task of the day before you open any games, videos or social apps.", "The finished task.", 2,
  group="finish-it", when='morning')
m('discipline-finish-unfinished', D, 'Finish One Unfinished Task', 30, 15, P,
  'Pick one task you started and never finished, and finish it today.', 'The finished task, private details covered.', 2,
  group='finish-it')
m('discipline-prepare-tomorrow', D, 'Prepare Everything You Need for Tomorrow', 10, 10, P,
  'Pack your bag, lay out your clothes and charge what you need, tonight.', 'Everything ready to go.', 1,
  group='tomorrow-ready', when='evening', also=['organization'], days=WEEKNIGHTS)
m('discipline-prepare-workspace', D, 'Prepare Your Workspace', 5, 5, BA,
  'Clear your desk and set out only what you need for your next work session.', 'Before and after of your workspace.', 2,
  group='desk')
m('discipline-plan-week', D, 'Plan Your Week', 15, 10, P,
  'Write your goals, deadlines and key tasks for the next 7 days on one page.',
  'Your week on one page, private details covered.', 6, group='planning-week')
m('discipline-clear-3-small', D, 'Knock Out 3 Small Tasks', 15, 10, P,
  'Do three small things you keep leaving: a reply, a form, a quick errand.',
  'Your list with all three crossed off.', 3, group='small-tasks')
m('discipline-todo-30', D, 'Work Through Your To-Do List for 30 Minutes', 30, 15, TP,
  'Cross off as many tasks on your list as you can in 30 minutes, quickest first.',
  'Your list with what you crossed off, after the timer.', 3, group='small-tasks')

# ── SCHOOL ─────────────────────────────────────────────────────────────────
S = 'school'
SC = ['school']
# 0 = Sunday. Notes come from a class day; homework is due the next morning.
SCHOOL_DAYS = [1, 2, 3, 4, 5]
SCHOOL_NIGHTS = WEEKNIGHTS
# SAT/ACT and college applications: high school, 16 and up (not for college students).
HS = ['school', 'highschool', 'age16']
m('school-study-30', S, 'Study for 30 Minutes', 30, 15, TP,
  'Put your phone away and spend 30 focused minutes studying one subject.',
  'Your notes or study setup, after the timer.', 1, anchor=True, group='study', requires=SC)
m("school-study-60", S, "Study for 60 Minutes", 60, 25, TP,
  "Put your phone in another room and study for one focused hour.", "Your notes or study setup, after the timer.", 2,
  group="study", requires=['school'])
m('school-finish-assignment', S, 'Finish One Assignment', 30, 15, P,
  'Pick one assignment and finish it completely.', 'The finished assignment, name and grades covered.', 1,
  anchor=True, group='assignment', requires=SC)
m('school-start-early', S, 'Start an Assignment Early', 30, 15, P,
  "Do the first real part of an assignment that isn't due yet.", 'What you got done, name covered.', 3,
  group='assignment', requires=SC)
m('school-tonights-homework', S, "Finish Tonight's Homework", 45, 20, P,
  "Get all of tonight's homework done.", 'Your finished homework, name covered.', 1,
  group='assignment', requires=SC, anchor=True, days=SCHOOL_NIGHTS)
m('school-review-notes', S, "Review Today's Notes", 10, 10, P,
  "Go over today's class notes and mark anything you don't understand yet.", 'Your notes with what you marked.', 1,
  when='evening', requires=SC, anchor=True, days=SCHOOL_DAYS)
m('school-read-chapter', S, 'Read One Chapter', 30, 15, P,
  'Read one full chapter of a textbook or assigned book.', 'The book open to where you finished.', 2,
  group='school-reading', requires=SC)
m('school-assigned-reading', S, 'Read 10 Pages of Assigned Reading', 20, 10, P,
  "Read 10 pages of what's assigned for class.", 'The book open to where you stopped.', 1,
  group='school-reading', requires=SC)
m("school-hard-topic", S, "Study One Difficult Topic", 30, 15, TP,
  "Pick the topic you understand least and work through it until it makes sense.", "Your notes on the topic, after the timer.", 3,
  group="hard-subject", requires=['school'])
m("school-hardest-class", S, "Spend 20 Minutes on Your Hardest Class", 20, 10, TP,
  "Spend 20 focused minutes on the class you're struggling with most.", "Your work, after the timer.", 2,
  group="hard-subject", requires=['school'])
m('school-practice-problems', S, 'Complete 10 Practice Problems', 30, 15, P,
  'Do 10 practice problems without looking at the answers, then check every one.', 'Your worked problems.', 2,
  requires=SC, group='practice-problems')
m('school-practice-5', S, 'Do 5 Practice Problems', 15, 10, P,
  'Do 5 practice problems from your hardest class without looking at the answers, then check them.',
  'Your worked problems.', 2, requires=SC, group='practice-problems')
m('school-make-flashcards', S, 'Make Flashcards for One Topic', 20, 10, P,
  'Make at least 15 flashcards for one topic you need to know.', 'Your flashcards.', 4,
  group='flashcards', requires=SC)
m('school-memorize-10', S, 'Memorize 10 Terms or Formulas', 10, 10, P,
  'Learn 10 terms, formulas or dates for a class until you can write them all from memory.',
  'The 10, written from memory.', 2, group='flashcards', requires=SC)
m('school-review-flashcards', S, 'Review Flashcards for 20 Minutes', 20, 10, TP,
  'Go through your flashcards until you know most of them without looking.', 'Your flashcards, after the timer.', 2,
  group='flashcards', requires=SC)
m('school-upcoming-project', S, 'Work on an Upcoming School Project', 30, 15, TP,
  "Spend 30 minutes on a school project that's due soon.", 'What you got done, after the timer.', 2,
  requires=SC)
m('school-test-prep', S, 'Prepare for a Test for 30 Minutes', 30, 15, TP,
  'Study for your next test with practice questions, notes or flashcards.', 'Your study material, after the timer.', 2,
  group='study', requires=SC)
m('school-practice-test', S, 'Take a Practice Test', 45, 20, TP,
  'Take one practice test or quiz with a real time limit, then check your answers.',
  'Your checked practice test, name covered.', 5, requires=SC)
m('school-rewrite-notes', S, 'Rewrite Messy Notes', 20, 10, P,
  "Rewrite one set of messy notes so they're clear and complete.", 'Your rewritten notes.', 5, requires=SC)
m('school-summarize-lesson', S, 'Summarize One Lesson in Your Own Words', 15, 10, P,
  "Write a short summary of one lesson without looking at your notes, then check it.", 'Your summary.', 3,
  requires=SC)
m('school-study-plan', S, 'Create a Study Plan for This Week', 15, 10, P,
  "Write what you'll study each day this week, with your test and due dates.", 'Your study plan.', 6,
  group='planning-week', requires=SC)
m('school-missing-assignment', S, 'Complete One Missing Assignment', 30, 15, P,
  'Finish one assignment you missed or still owe and hand it in.', 'The finished assignment, name and grades covered.', 10,
  group='assignment', requires=SC, weight=0.3)
m('school-organize-schoolwork', S, 'Organize Your Schoolwork', 15, 10, BA,
  "Sort your papers, folders and files by class and throw out what you don't need.",
  'Before and after of your schoolwork.', 7, requires=SC, also=['organization'])
m("school-essay-30", S, "Work on Your Essay for 30 Minutes", 30, 15, TP,
  "Write the next part of your essay or paper for 30 minutes without stopping to fix it.", "Your draft, after the timer, name covered.", 3,
  requires=['school'])
m('school-correct-test', S, 'Correct Your Mistakes on a Returned Test', 30, 15, P,
  'Redo every question you got wrong on a returned test or quiz until you can get it right.',
  'Your corrections, score and name covered.', 7, requires=SC, weight=0.6)
m('school-sat-act', S, 'Do 30 Minutes of SAT or ACT Prep', 30, 15, TP,
  'Do timed SAT or ACT practice questions for 30 minutes, then check every answer.',
  'Your worked questions, after the timer.', 2, requires=HS, weight=0.7)
m('school-college-essay', S, 'Work on Your College Essay for 30 Minutes', 30, 15, TP,
  'Draft or revise your college application essay for 30 minutes.',
  'Your draft on paper or a computer, after the timer, name covered.', 3, requires=HS, weight=0.5)
m('school-research-college', S, 'Research One College', 20, 10, P,
  'Look up one college: what it costs, what it takes to get in and when applications are due.', 'Your notes.', 10,
  requires=HS, weight=0.6)
m('school-study-sheet', S, 'Make a One-Page Study Sheet', 30, 15, P,
  "Fit one unit's key facts, formulas and examples onto one page for your next test.", 'Your study sheet.', 5,
  requires=SC)
m('school-term-deadlines', S, "Put This Term's Deadlines in Your Calendar", 30, 15, P,
  'Go through each syllabus or class page and add every test, paper and due date for the term to one calendar.',
  'Your calendar on paper or a computer, private details covered.', 60, requires=SC, group='planning-week')

m('school-plan-study-tomorrow', S, "Plan Tomorrow's Study Time", 5, 5, P,
  "Write what you'll study tomorrow, for how long and when.", 'Your plan.', 2, group='planning', requires=SC,
  when='evening')
m('school-check-due', S, "Check What's Due This Week", 5, 5, P,
  'Check your planner or class pages and write down everything due in the next 7 days and anything missing.',
  "Your list of what's due. No scores.", 3, group='planning-week', requires=SC)

# ── FITNESS ────────────────────────────────────────────────────────────────
F = 'fitness'
m('fitness-workout', F, 'Complete Your Workout', 45, 20, P,
  'Do your planned workout from start to finish.', 'Where you trained, right after. No people.', 1,
  anchor=True, group='workout')
m("fitness-gym", F, "Go to the Gym", 45, 20, P,
  "Go to the gym and do a full session.", "The equipment you used, after your session. No people.", 1,
  group="workout", requires=["gym"], anchor=True, weight=2)
m('fitness-train-30', F, 'Train for at Least 30 Minutes', 30, 20, TP,
  'Lift, practice your sport or do a full workout for at least 30 minutes.', 'Where you trained. No people.', 1,
  timer=30, group='workout')
m('fitness-home-workout', F, 'Do an At-Home Workout', 20, 10, TP,
  'Do push-ups, squats, lunges and planks at home for 20 minutes, no equipment needed.',
  'Your workout spot, right after.', 2, timer=20, group='workout', anchor=True)
m('fitness-bodyweight-10', F, 'Do a 10-Minute Bodyweight Workout', 10, 10, T,
  'Do squats, push-ups, lunges and planks for 40 seconds each with 20 seconds rest until the timer ends.',
  'Run the 10-minute timer to the end.', 2, group='workout', anchor=True)
m('fitness-pushups-squats', F, 'Do 3 Rounds of Push-ups and Squats', 5, 5, T,
  'Do 3 rounds of 10 push-ups and 15 squats, with the push-ups on your knees if you need to.',
  'Run the 5-minute timer to the end.', 2, group='workout')
m('fitness-walk-30', F, 'Walk for 30 Minutes', 30, 15, TP,
  'Go for a 30-minute walk with your phone in your pocket.', 'Where you walked. No people.', 1, group='cardio', anchor=True)
m('fitness-walk-15', F, 'Go for a 15-Minute Walk', 15, 10, TP,
  'Walk at a brisk pace for 15 minutes with your phone in your pocket.', 'Where you walked. No people.', 2,
  group='cardio')
m('fitness-cardio-10', F, 'Do 10 Minutes of Cardio at Home', 10, 10, T,
  'Do jumping jacks, high knees and mountain climbers for 10 minutes, resting when you need to.',
  'Run the 10-minute timer to the end.', 2, group='cardio')
m('fitness-run', F, 'Go for a Run', 20, 10, TP,
  'Run for 20 minutes at a pace you can keep, with walk breaks if you need them.',
  'Your route after the run. No people.', 2, timer=20, group='cardio')
m('fitness-cardio-20', F, 'Do 20 Minutes of Cardio', 20, 10, TP,
  'Run, bike, swim, jump rope or use a cardio machine for 20 minutes.', 'Where you did it. No people.', 2,
  timer=20, group='cardio')
m("fitness-long-walk", F, "Take a Long Walk Instead of Scrolling", 45, 20, TP,
  "Go for a 45-minute walk instead of sitting on your phone.", "Where you walked. No people.", 4,
  group="cardio")
m("fitness-outside-20", F, "Get Outside and Move for 20 Minutes", 20, 10, TP,
  "Walk, bike or play outside for 20 minutes.", "Where you were. No people.", 2,
  group="cardio", weight=0.6)
# Retired: it assumes a bike nobody was asked about; Do 20 Minutes of Cardio already offers biking.
m("fitness-bike-30", F, "Bike for 30 Minutes", 30, 15, TP,
  "Ride your bike for 30 minutes at a steady pace, helmet on.", "Your bike after the ride. No people.", 3,
  group="cardio", active=False)
m('fitness-sport-30', F, 'Practice Your Sport for 30 Minutes', 30, 15, TP,
  'Work on the skills of your sport for 30 minutes: drills, shots, footwork.', 'Where you practiced. No people.', 3,
  group='workout', weight=0.3)
m('fitness-stretch-10', F, 'Stretch for 10 Minutes', 10, 10, T,
  'Stretch your hips, legs, back and shoulders for 10 minutes.', 'Run the 10-minute timer to the end.', 1,
  group='stretch', anchor=True)
m('fitness-mobility-10', F, 'Do a 10-Minute Mobility Session', 10, 10, T,
  'Ten minutes of mobility work for your hips, ankles, shoulders and back.', 'Run the 10-minute timer to the end.', 2,
  group='stretch')
m("fitness-balanced-meal", F, "Prepare a Balanced Meal", 20, 10, P,
  "Cook yourself a meal with a protein, a carb and a vegetable.", "Your plate before you eat.", 2,
  group="meal")
m('fitness-pack-meal', F, "Prepare Tomorrow's Meal", 15, 10, P,
  "Make or pack tomorrow's lunch tonight.", 'Your packed meal.', 2, group='meal', when='evening', days=WEEKNIGHTS)
m('fitness-plan-week', F, "Plan This Week's Workouts", 10, 10, P,
  "Write which days you'll train this week, when, and what you'll do.", 'Your training plan.', 6)
m('fitness-log-workout', F, 'Log Your Last Workout', 5, 5, P,
  'Write down every exercise, set and rep from your last workout, and circle one to beat next time.',
  'Your workout log.', 2, requires=['gym'])
m('fitness-meal-prep', F, 'Meal Prep for the Next 3 Days', 60, 25, P,
  'Cook and pack lunches or dinners for the next 3 days.', 'Your packed meals.', 6, group='meal')

m('fitness-core-10', F, 'Do a 10-Minute Core Workout', 10, 10, T,
  'Do planks, side planks, dead bugs and glute bridges for 10 minutes.', 'Run the 10-minute timer to the end.', 2,
  group='core')
m('fitness-plank-5', F, 'Do a 5-Minute Plank Set', 5, 5, T,
  'Hold planks and side planks for 30 seconds each, resting in between, until the timer ends.',
  'Run the 5-minute timer to the end.', 2, group='core')
m('fitness-pack-gym-bag', F, 'Pack Your Gym Bag for Tomorrow', 5, 5, P,
  "Pack your shoes, clothes and water tonight for tomorrow's workout.", 'Your packed bag.', 2,
  group='tomorrow-ready', when='evening', requires=['gym'])

# ── MONEY ──────────────────────────────────────────────────────────────────
M = 'money'
m('money-track-spending', M, "Track Today's Spending", 5, 5, P,
  'Write down everything you spent today and the total.', 'Your handwritten list. No bank details.', 1,
  anchor=True, when='evening')
m('money-review-week', M, "Review This Week's Spending", 15, 10, P,
  "Add up what you spent this week and circle what you didn't need.", 'Your totals on paper. No bank details.', 6,
  group='money-review')
m('money-weekly-plan', M, 'Create a Weekly Spending Plan', 15, 10, P,
  "Decide what you'll spend this week on food, transport and fun, and write it down.", 'Your plan on paper.', 6,
  group='money-plan')
m('money-savings-goal', M, 'Write Down Your Savings Goal', 5, 5, P,
  "Write what you're saving for, what it costs and the date you want it by.", 'Your goal on paper.', 30)
m('money-month-savings', M, "Plan How Much You'll Save This Month", 10, 10, P,
  'Pick an amount to save this month and work out what that is each week.', 'Your numbers on paper.', 25,
  group='money-plan')
m('money-simple-budget', M, 'Create a Simple Budget', 30, 15, P,
  'Write your money in, your fixed costs, what you save and what is left to spend.',
  'Your budget on paper or a computer. No account details.', 30, group='money-plan')
m('money-cut-expense', M, 'Research One Way to Cut a Recurring Cost', 15, 10, P,
  'Pick one subscription or regular cost and find a cheaper plan, a student deal or a way to drop it.',
  'Your notes with what it would save each month.', 30)
m('money-learn-concept', M, 'Learn One Personal Finance Concept', 20, 10, TP,
  'Learn one idea such as compound interest, credit scores or taxes, and write it in your own words.',
  'Your notes, after the timer.', 2, group='money-learning')
m('money-learn-budgeting', M, 'Spend 20 Minutes Learning About Budgeting', 20, 10, TP,
  'Learn one simple way to budget, like 50/30/20, and write how you would use it.',
  'Your notes, after the timer.', 7, group='money-learning')
m('money-read-20', M, 'Read About Personal Finance for 20 Minutes', 20, 10, TP,
  'Read a personal finance book or guide for 20 minutes and write down one thing you will do.',
  'Your notes, after the timer.', 2, group='money-learning')
m('money-compare-prices', M, 'Compare Prices Before You Buy', 20, 10, P,
  'Before your next planned purchase, find the same thing in three places and write the prices down.',
  'Your three prices on paper.', 3)
m('money-month-review', M, "Review Last Month's Spending", 30, 15, P,
  "Add up last month's spending by category and circle the two you'll spend less on.",
  'Your totals on paper. No bank details.', 25, group='money-review')
m('money-save-today', M, 'Put Money Into Savings', 5, 5, P,
  'Put any amount into savings today, even five dollars.', 'A note of the amount you put in. No bank details.', 7)
m('money-auto-savings', M, 'Set Up Automatic Savings', 10, 10, P,
  'Set up a weekly or monthly automatic transfer into savings, any amount.', 'A note of the amount and how often. No bank details.', 90,
  requires=['age16'])
m('money-scholarship', M, 'Find One Scholarship You Can Apply For', 20, 10, P,
  'Find one scholarship you qualify for and write down the amount, the requirements and the deadline.',
  'Your notes with the deadline.', 14, requires=['school', 'age16'])
m("money-log-pay", M, "Check Your Paycheck", 10, 10, P,
  "Compare your latest paycheck with the hours you worked and make sure it is right.", "Your hours and pay written on paper. No bank details.", 7,
  requires=['work'])
m('money-plan-paycheck', M, 'Plan Your Next Paycheck', 10, 10, P,
  'Before payday, write how much of it goes to bills, savings and spending.', 'Your plan on paper. No bank details.', 7,
  requires=['work'], group='money-plan')
m('money-bills-due', M, 'List Your Payments Due This Week', 5, 5, P,
  'Write down every bill and subscription that comes out in the next 7 days, and when.',
  'Your list. No account details.', 6, requires=['age18'])
m("money-sell-unused", M, "Sell One Thing You Don't Use", 30, 15, P,
  "List one thing you don't use for sale at a fair price, and have a parent post it if you're under 18.", "The item with its price written on paper next to it.", 14)

m('money-earn-options', M, 'Find One Way to Earn Money This Month', 20, 10, P,
  'List five ways you could earn money with what you can do, and pick one to try this month.',
  'Your list with one circled.', 30)
m('money-savings-account', M, 'Compare Two Savings Accounts', 20, 10, P,
  'Compare the interest rate and fees of two savings accounts and pick the better one.',
  'Your comparison on paper. No account details.', 60, requires=['age18'])

# ── CAREER ─────────────────────────────────────────────────────────────────
C = 'career'
m('career-apply-job', C, 'Apply to One Job', 30, 20, P,
  'Find one job you want and send a complete application.',
  'The confirmation on a computer, or the role and date written down. Details covered.', 2,
  group='apply', requires=['age16'], anchor=True)
m('career-apply-internship', C, 'Apply to One Internship', 30, 20, P,
  'Find one internship you want and send a complete application.',
  'The confirmation on a computer, or the role and date written down. Details covered.', 2, group='apply',
  requires=['age16'])
m("career-find-opportunities", C, "Find Three Opportunities", 20, 10, P,
  "Find three jobs, internships, programs or competitions you're old enough for, and save each link and deadline.", "Your list of three with deadlines.", 4,
  group="opportunities")
m('career-find-one', C, 'Find One Opportunity to Apply For', 10, 10, P,
  "Find one job, internship or program you're old enough for and write down the link and the deadline.",
  'Your note of what it is and the deadline.', 2, group='opportunities')
m("career-research-internships", C, "Research Internships for 20 Minutes", 20, 10, TP,
  "Look for internships in a field you want and save the ones you could apply to.", "Your list, after the timer.", 5,
  group="opportunities", requires=['age16'])
m('career-improve-resume', C, 'Improve Your Resume', 30, 15, TP,
  "Spend 30 minutes making your resume clearer and stronger, or start one if you don't have one yet.",
  'Your updated resume, contact details covered.', 5, group='resume', requires=['age16'], weight=2)
m('career-resume-bullet', C, 'Improve One Resume Bullet', 10, 10, P,
  'Rewrite one line of your resume so it shows a result, with a number if you can.',
  'The old line and the new one, written down.', 4, group='resume', requires=['age16'])
m('career-first-resume', C, 'Write the First Draft of Your Resume', 30, 15, P,
  "Write a one-page resume with your school, work, projects and skills, even if it's short.",
  'Your draft, contact details covered.', 365, repeatable=False, group='resume', weight=2)
m('career-resume-list', C, 'List What Could Go on Your Resume', 10, 10, P,
  'List every job, team, club, project, award and skill you have, with the dates.', 'Your list.', 30,
  group='resume')
m('career-linkedin', C, 'Improve Your LinkedIn', 20, 10, P,
  'Update one part of your LinkedIn: headline, about, experience or skills.',
  'The updated section on a computer, or the new text written down. No photo or name.', 7, requires=['age16'])
m('career-portfolio', C, 'Work on Your Portfolio', 30, 20, TP,
  'Add or improve one piece in your portfolio.', 'Your portfolio on a computer, or the piece you added.', 2,
  also=['projects', 'skills'], weight=0.6, fits=['coding', 'design', 'video', 'writing'])
m('career-goal', C, 'Write Down Your Career Goal', 5, 5, P,
  'Write the job you want next, when you want it by and the next three steps to get there.', 'Your goal on paper.', 30)
m('career-learn-career', C, "Learn About One Career You're Interested In", 20, 10, P,
  'Find out what the job pays, what it takes to get in, and the first step toward it.', 'Your notes.', 7)
m('career-skill-30', C, 'Spend 30 Minutes Learning a Career Skill', 30, 15, TP,
  'Learn a skill employers pay for: spreadsheets, coding, writing, sales or a trade.',
  'Your notes or what you made, after the timer.', 1, anchor=True, also=['skills'], group='skill-session')
m('career-skill-15', C, 'Spend 15 Minutes Learning a Career Skill', 15, 10, TP,
  'Spend 15 minutes on a skill employers pay for, like spreadsheets, writing, sales or a trade.',
  'Your notes or what you made, after the timer.', 1, also=['skills'], group='skill-session')
m('career-network-message', C, 'Send One Professional Networking Message', 15, 10, P,
  'Message someone who works in a field you want and ask one specific question.',
  'A note of who you messaged (initials) and what you asked.', 4, requires=['age16'])
m('career-research-company', C, 'Research One Company', 20, 10, P,
  'Look into one company you would want to work for: what they do, who they hire, how to apply.', 'Your notes.', 5)
m("career-interview-practice", C, "Practice Interview Questions for 20 Minutes", 20, 10, TP,
  "Answer common interview questions out loud and write down what to improve.", "Your notes, after the timer.", 5,
  requires=['age16'], group='interview')
m('career-interview-one', C, 'Practice One Interview Question', 5, 5, P,
  'Answer one common interview question out loud, then write your best answer in three lines.',
  'Your answer, written down.', 4, requires=['age16'], group='interview', weight=0.6)
m('career-introduction', C, 'Write Your 30-Second Introduction', 10, 10, P,
  "Write three sentences on who you are, what you're good at and what you want next, for interviews.",
  'Your introduction, written down.', 30, requires=['age16'], group='interview')
m("career-application-part", C, "Complete Part of an Application", 30, 15, P,
  "Finish one section of a job, college or scholarship application.",
  "The finished section on a computer, or what you finished written down.", 3, requires=['age16'])
m('career-resume-project', C, 'Build Something You Can Put on Your Resume', 45, 20, TP,
  'Spend 45 minutes on a project that shows a skill employers want.', 'What you built, after the timer.', 3,
  also=['projects', 'skills'], group='project-session')
m('career-cover-letter', C, 'Write a Cover Letter for One Job', 30, 15, P,
  'Write a cover letter for one job you want, tailored to that job.', 'Your letter, contact details covered.', 7,
  requires=['age16'])
m('career-manager-feedback', C, 'Ask Your Manager What to Improve', 10, 10, P,
  'Ask your manager or shift lead for one thing you could do better, and write it down.',
  'Their answer and your plan, on paper.', 30, requires=['work'], weight=0.3)
m('career-application-tracker', C, 'Update Your Application Tracker', 15, 10, P,
  "List every job and internship you've applied to with its status and next step.",
  'Your tracker on paper or a computer. No contact details.', 14, requires=['age16'], weight=0.3)
m('career-work-wins', C, 'Write Down Your Wins at Work', 10, 10, P,
  'List what you got done at work this week, with numbers where you can, for your next review or resume.',
  'Your list on paper, company details covered.', 7, requires=['work'])
m('career-pay-research', C, 'Look Up What Your Target Job Pays', 15, 10, P,
  'Find the pay range for the job you want, and for the role after it, where you live.', 'Your notes.', 30)
m('career-certification', C, 'Study for a Certification for 30 Minutes', 30, 15, TP,
  'Spend 30 minutes working toward a certification or license in your field.', 'Your notes or practice questions, after the timer.', 2,
  requires=['age16'], weight=0.6, also=['skills'], group='skill-session')

m('career-target-skills', C, 'Find 3 Skills Your Target Job Asks For', 10, 10, P,
  'Read three postings for a job you want and write the skills they all ask for.', 'Your list of skills.', 10)

# ── BUSINESS ───────────────────────────────────────────────────────────────
B = 'business'
m('business-work-30', B, 'Work on Your Business for 30 Minutes', 30, 20, TP,
  'Spend 30 focused minutes moving your business or business idea forward.',
  'What you worked on, after the timer.', 1, anchor=True, group='business-session')
m('business-work-60', B, 'Work on Your Business for 60 Minutes', 60, 25, TP,
  'Put your phone away and spend one focused hour on your business, one task at a time.',
  'What you got done, after the timer.', 2,
  group='business-session')
m("business-content", B, "Create One Piece of Content", 30, 15, P,
  "Make one post, video or graphic for your business or project.", "Your setup or draft, or the finished piece on a computer.", 1,
  anchor=True, also=['projects'], requires=['building'])
m('business-post', B, 'Post Something for Your Business', 15, 10, P,
  'Post one piece of content on your business account.', 'A note of what you posted and where.', 1,
  requires=['project'])
m("business-website", B, "Improve Your Website", 30, 15, P,
  "Improve one part of your website or online shop: a page, the copy, the photos or the prices.",
  "The updated page on a computer, or what you changed written down.", 4, requires=['project'])
m('business-competitors', B, 'Research Your Competitors for 20 Minutes', 20, 10, TP,
  'Look at what three competitors sell, what they charge and what they do better.', 'Your notes, after the timer.', 7)
m('business-reach-customer', B, 'Reach Out to One Potential Customer', 15, 10, P,
  'Contact one person or business who might buy from you.', 'A note of who (initials) and what you offered.', 2,
  requires=['age16'])
m('business-product', B, 'Work on Your Product', 30, 20, TP,
  'Spend 30 minutes making your product or service better.', 'Your product or your work, after the timer.', 2,
  requires=['building'])
m('business-fix-problem', B, 'Fix One Problem With Your Business', 30, 15, P,
  "Pick one thing that's broken or slowing you down and fix it.", 'The fix, or your notes on what changed.', 3)
m('business-product-page', B, 'Improve One Product Page', 20, 10, P,
  'Improve the description, photos or price on one product page.',
  'The updated page on a computer, or what you changed written down.', 5, weight=0.7, requires=['project'])
m('business-plan-tomorrow', B, "Plan Tomorrow's Business Tasks", 5, 5, P,
  "Write the 3 business tasks you'll do tomorrow, most important first.", 'Your list.', 1, group='planning', anchor=True)
m("business-marketing-idea", B, "Create One Marketing Idea", 10, 10, P,
  "Come up with one new way to get customers and do the first step today.", "What you made, or a note of what you did.", 3)
m('business-customer-messages', B, 'Respond to Important Customer Messages', 15, 10, P,
  'Answer every customer message that is waiting for you.', 'A note of how many you answered. Not the messages.', 1,
  requires=['project'])
m('business-numbers', B, 'Update Your Business Numbers', 15, 10, P,
  "Write down this week's sales, costs and profit.", 'Your numbers on paper or a computer. No account details.', 6,
  requires=['project'])
m("business-idea-to-real", B, "Turn One Idea Into Something Real", 45, 20, P,
  "Make a rough first version of one idea: a sample, a mockup, a page or a price list.", "What you made.", 7,
  also=['projects'])
m('business-customer-feedback', B, 'Ask a Customer for Feedback', 10, 10, P,
  'Ask one customer what they liked and what they would change.', 'Their answer, written down. No names.', 7,
  requires=['project'])
m('business-follow-up-leads', B, 'Follow Up With 3 Leads', 15, 10, P,
  "Follow up with three people who showed interest but haven't bought yet.",
  'A list of who (initials) and what you sent.', 3, requires=['project'])
m('business-customer-interviews', B, 'Talk to 3 Potential Customers', 30, 15, P,
  'Ask three people who might buy from you how they deal with the problem you solve, and write down what they say.',
  'Your notes. No names.', 10, requires=['age16'])
m('business-profit-per-sale', B, 'Work Out Your Profit per Sale', 20, 10, P,
  'Add up what one sale costs you and set a price that leaves a profit.', 'Your math on paper.', 21)
m('business-ideas', B, 'Write Down 10 Business Ideas', 15, 10, P,
  'List 10 things people around you would pay for that you could make, sell or do.', 'Your list of ten.', 14,
  requires=['starting'])
m('business-pick-idea', B, 'Pick One Business Idea and Plan It', 20, 10, P,
  'Pick one idea and write who it is for, what you would charge and your first three steps.', 'Your plan on paper.', 14,
  requires=['starting'])
m('business-pitch', B, 'Write Your One-Sentence Pitch', 5, 5, P,
  "Write one sentence that says what you sell, who it's for and why they'd pick you.", 'Your sentence on paper.', 14)
m('business-month-goal', B, "Set This Month's Business Goal", 5, 5, P,
  'Write one goal for this month, like your first sale or a number of customers, and the first step toward it.',
  'Your goal on paper.', 25)
m('business-learn-concept', B, 'Learn One Business Concept', 15, 10, TP,
  'Learn one idea such as profit margin, pricing or getting customers, and write it in your own words.',
  'Your notes, after the timer.', 3)
m('business-read-10', B, 'Read 10 Pages of a Business Book', 15, 10, P,
  'Read 10 pages of a book about starting or running a business.', 'The book open to where you stopped.', 2,
  group='reading', anchor=True)
m('business-review-request', B, 'Ask a Happy Customer for a Review', 10, 10, P,
  'Ask one happy customer to leave a review or send you someone who might buy.', 'A note of who (initials) and what you asked.', 7,
  requires=['project'])

# ── PROJECTS ───────────────────────────────────────────────────────────────
PR = 'projects'
m('projects-build-30', PR, 'Build Your Project for 30 Minutes', 30, 20, TP,
  'Spend 30 focused minutes building your project.', 'What you built, after the timer.', 1,
  anchor=True, group='project-session')
m('projects-build-60', PR, 'Build Your Project for 60 Minutes', 60, 25, TP,
  'Put your phone away and spend one focused hour building your project.', 'What you built, after the timer.', 2,
  group='project-session')
m('projects-work-10', PR, 'Work on Your Project for 10 Minutes', 10, 10, TP,
  'Open your project and get one small piece of it done in 10 minutes.', 'What you did, after the timer.', 1,
  group='project-session', anchor=True)
m("projects-instead-of-scrolling", PR, "Spend 30 Minutes Building Instead of Scrolling", 30, 20, TP,
  "Put the phone down and build something for 30 minutes instead.", "What you built, after the timer.", 3,
  group="project-session", weight=0.5)
m('projects-finish-feature', PR, 'Finish One Feature', 45, 20, P,
  'Finish one feature or part of your project so it fully works.', 'The finished part.', 2)
m('projects-fix-problem', PR, 'Fix One Bug or Problem in Your Project', 30, 15, P,
  "Pick one thing in your project that doesn't work right and fix it.", 'The fix, or your notes on what changed.', 2,
  group='project-fix')
m('projects-design', PR, 'Create One Design', 30, 15, P,
  'Make one finished design: a logo, a layout, a graphic or a mockup.', 'Your design.', 2, fits=['design'])
m('projects-write-page', PR, 'Write One Page', 30, 15, P,
  'Write one full page of your story, script, article or blog.', 'Your page.', 2, fits=['writing'])
m('projects-film-video', PR, 'Film One Video', 30, 15, P,
  'Film all the clips you need for one short video.', 'Your setup or shot list. No people.', 3, group='video',
  fits=['video'])
m("projects-edit-video", PR, "Edit One Video", 45, 20, P,
  "Edit one video from start to finished export.", "The finished edit on a computer, or your clip list ticked off on paper.", 3,
  group="video", fits=['video'])
m('projects-publish', PR, 'Publish Something You Created', 15, 10, P,
  'Put one finished thing out: post it, upload it, submit it or show it.',
  'A note of what you published and where.', 4)
m("projects-finish-not-start", PR, "Finish One Thing Instead of Starting Another", 45, 20, P,
  "Go back to a project you dropped and finish one piece of it before you start anything new.", "The finished piece.", 5,
  weight=0.5)
m('projects-plan-steps', PR, "Plan Your Project's Next Steps", 10, 10, P,
  'Write the next 5 steps for your project, smallest first.', 'Your list.', 5, group='planning')
m('projects-plan-tomorrow', PR, "Plan Tomorrow's Project Work", 5, 5, P,
  "Write the one thing you'll get done on your project tomorrow and when you'll do it.", 'Your plan.', 1,
  group='planning', when='evening', weight=0.6)
m('projects-small-project', PR, 'Create One Small Project', 60, 25, P,
  'Start and finish one small thing in a single sitting.', 'What you made.', 5, also=['skills'])
m('projects-get-feedback', PR, 'Get Feedback on Your Project', 15, 10, P,
  'Show your project to one person and write down what they would change.', 'Their feedback, written down.', 5)
m('projects-launch', PR, 'Launch a Version People Can Use', 60, 25, P,
  'Put a working version of your project where someone else can use it: a link, a listing or a demo.',
  'The live version on a computer, or the link and what it does written down.', 14)

m('projects-small-fix', PR, 'Fix One Small Thing in Your Project', 15, 10, P,
  'Fix one small thing in your project: a typo, a broken link, a rough edge.', 'The fix.', 2, group='project-fix')
m('projects-back-up', PR, 'Back Up Your Project Files', 10, 10, P,
  'Copy your project files to a second place: a cloud folder or a drive.', 'The backup folder on a computer.', 14)
m('projects-learn-15', PR, 'Learn One Thing Your Project Needs', 15, 10, TP,
  'Spend 15 minutes learning the one tool or technique your next step needs.', 'Your notes, after the timer.', 2,
  also=['skills'])
m('projects-describe', PR, "Write Your Project's Description", 10, 10, P,
  "Write a short description of what your project is, who it's for and what it does.", 'Your description.', 30)

# ── SKILLS ─────────────────────────────────────────────────────────────────
K = 'skills'
m('skills-learn-30', K, 'Learn a Skill for 30 Minutes', 30, 15, TP,
  "Spend 30 focused minutes learning the skill you're working on.",
  'Your notes or what you made, after the timer.', 1, anchor=True, group='skill-session')
m('skills-course-lesson', K, 'Complete One Course Lesson', 30, 15, P,
  'Finish one lesson of a course you are taking, including any exercise.',
  'Your notes or the finished exercise.', 1, group='skill-session', anchor=True)
m("skills-practice-not-watch", K, "Practice Without a Tutorial for 30 Minutes", 30, 15, TP,
  "Close the tutorials and practice the skill on your own for 30 minutes.", "What you made, after the timer.", 3,
  group="skill-session")
# The skills a user named under What are you learning? are their core habits in Skills.
# Short drills share skill-session with the 30-minute ones: one practice session a day.
m('skills-coding', K, 'Practice Coding for 30 Minutes', 30, 15, TP,
  'Write code for 30 minutes: an exercise, a small feature or a bug fix.', 'Your code on a computer, after the timer.', 1,
  requires=['coding'], group='skill-session', anchor=True)
m('skills-design', K, 'Practice Design for 30 Minutes', 30, 15, TP,
  'Spend 30 minutes designing: a layout, a logo, a type study or a redesign.', 'What you made, after the timer.', 1,
  requires=['design'], group='skill-session', anchor=True)
m("skills-editing", K, "Practice Editing for 30 Minutes", 30, 15, TP,
  "Spend 30 minutes editing: cuts, pacing, color or sound on real footage.", "Your timeline on a computer, or your edit notes, after the timer.", 1,
  group="skill-session", requires=['video'], anchor=True)
m('skills-writing', K, 'Practice Writing for 30 Minutes', 30, 15, TP,
  'Write for 30 minutes without stopping to fix anything.', 'Your pages, after the timer.', 1,
  requires=['writing'], group='skill-session', anchor=True)
m('skills-language', K, 'Practice a Language for 20 Minutes', 20, 10, TP,
  "Speak, read and write the language you're learning for 20 minutes.", 'Your notes, after the timer.', 1,
  requires=['language'], group='language', anchor=True)
m('skills-instrument', K, 'Practice Your Instrument for 30 Minutes', 30, 15, T,
  'Practice your instrument for 30 minutes, the hard parts first.', 'Run the 30-minute timer to the end.', 1,
  requires=['music'], group='skill-session', anchor=True)
m('skills-coding-15', K, 'Solve One Coding Problem', 15, 10, P,
  'Solve one coding exercise from start to finish without looking at the answer.', 'Your code on a computer.', 1,
  requires=['coding'], group='skill-session', anchor=True)
m('skills-design-copy', K, 'Recreate One Design You Like', 15, 10, P,
  "Copy one poster, layout or logo you like as closely as you can, to learn how it's made.", 'Your copy.', 2,
  requires=['design'], group='skill-session', anchor=True)
m('skills-writing-200', K, 'Write 200 Words', 15, 10, P,
  "Write 200 words of something you're working on without stopping to fix it.", 'Your 200 words.', 1,
  requires=['writing'], group='skill-session', anchor=True)
m('skills-language-words', K, 'Learn 10 New Words', 10, 10, P,
  "Learn 10 new words in the language you're learning until you can write them from memory.",
  'The 10 words, written from memory.', 1, requires=['language'], group='language', anchor=True)
m('skills-scales-10', K, 'Practice Scales and Technique for 10 Minutes', 10, 10, T,
  'Play scales and technique exercises on your instrument for 10 minutes, slowly and cleanly.',
  'Run the 10-minute timer to the end.', 1, requires=['music'], group='skill-session', anchor=True)
m("skills-lesson-notes", K, "Watch a Lesson and Take Notes", 20, 10, P,
  "Watch one lesson or lecture on something you're learning and take notes as you go.", "Your notes.", 2)
m('skills-build-with-skill', K, "Build Something With the Skill You're Learning", 45, 20, P,
  "Use what you've learned to make one small, real thing.", 'What you made.', 3)
m('skills-read-10', K, 'Read 10 Pages of a Useful Book', 15, 10, P,
  'Read 10 pages of a book that teaches you something.', 'The book open to where you stopped.', 1,
  anchor=True, group='reading')
m('skills-read-30', K, 'Read for 30 Minutes', 30, 15, TP,
  'Read a book that teaches you something for 30 minutes, phone away.', 'The book open to where you stopped.', 2,
  group='reading')
m('skills-practice-10', K, 'Practice Your Skill for 10 Minutes', 10, 10, TP,
  "Spend 10 focused minutes practicing the skill you're learning, without a tutorial.",
  'What you practiced, after the timer.', 1, group='skill-session')
m('skills-notes-learned', K, 'Take Notes on Something You Learned Today', 5, 5, P,
  'Write one thing you learned today in your own words, with an example.', 'Your note.', 2)
m('skills-plan-practice', K, "Plan Tomorrow's Practice", 5, 5, P,
  "Write what you'll practice tomorrow, for how long and when.", 'Your plan.', 1, group='planning', when='evening',
  weight=0.6)
m('skills-short-lesson', K, 'Watch One Short Lesson and Try It', 10, 10, P,
  'Watch one short lesson on the skill you are learning and try what it shows right away.', 'What you tried.', 2,
  group='skill-session')
m("skills-typing", K, "Practice Typing for 15 Minutes", 15, 10, TP,
  "Do a typing course or test for 15 minutes and write down your speed.", "Your speed written down, after the timer.", 3,
  weight=0.5)
m('skills-spreadsheets', K, 'Learn One Spreadsheet Skill', 20, 10, TP,
  'Learn one spreadsheet skill such as formulas, sorting or charts, and use it once.',
  'What you made on a computer, after the timer.', 5, also=['career'])

m('skills-review-yesterday', K, "Review Yesterday's Notes for 10 Minutes", 10, 10, P,
  "Go over what you learned yesterday before you learn anything new.", 'Your notes.', 2, group='skill-review')
m('skills-quiz-yourself', K, "Test Yourself on Last Week's Lessons", 10, 10, P,
  "Write down what you remember from last week's lessons without looking, then check your notes.",
  'What you wrote, checked against your notes.', 5, group='skill-review')
m("skills-practice-exercise", K, "Do One Practice Exercise for Your Skill", 15, 10, P,
  "Do one short exercise for the skill you are learning.", "What you made.", 1,
  weight=0.5, group='skill-session')

# ── ORGANIZATION ───────────────────────────────────────────────────────────
O = 'organization'
m("organization-clean-room-15", O, "Clean Your Room for 15 Minutes", 15, 10, BA,
  "Clean the messiest part of your room for 15 minutes.", "Before and after of the part you cleaned.", 2,
  anchor=True, group="room", also=['discipline'])
m('organization-clean-room', O, 'Clean Your Whole Room', 45, 20, BA,
  'Floor clear, surfaces clear, bed made, trash and dishes out.', 'Before and after.', 7, group='room')
m('organization-clean-desk', O, 'Clean Your Desk', 10, 10, BA,
  "Clear everything off your desk that doesn't belong there.", 'Before and after of your desk.', 3, group='desk', anchor=True,
  also=['discipline'])
m('organization-clear-surface', O, 'Clear One Cluttered Surface', 10, 10, BA,
  'Clear one table, counter or dresser until only what belongs there is left.', 'Before and after.', 3, group='desk')
m('organization-drawer', O, 'Organize One Drawer', 15, 10, BA,
  "Empty one drawer, throw out the junk and put back only what you use.", 'Before and after of the drawer.', 7)
m('organization-closet', O, 'Organize Your Closet for 15 Minutes', 15, 10, BA,
  "Hang, fold and sort your closet for 15 minutes and pull out what you don't wear.", 'Before and after.', 10)
m('organization-laundry', O, 'Do Your Laundry', 30, 15, P,
  'Wash, dry and fold one load of your own laundry.', 'The folded load.', 3, group='laundry')
m('organization-put-away-laundry', O, 'Put Away Your Laundry', 10, 10, P,
  'Fold and put away all of your clean laundry.', 'Your empty laundry basket.', 2, group='laundry')
m('organization-dishes', O, 'Do the Dishes', 15, 10, P,
  'Wash, dry and put away the dishes.', 'The empty sink.', 3)
m("organization-trash", O, "Take Out Your Trash", 5, 5, P,
  "Empty your trash and recycling and take them out.", "The empty bin.", 3,
  weight=0.4)
m('organization-bag', O, 'Clean Out Your Backpack or Work Bag', 10, 10, BA,
  'Empty your bag, throw out the trash and pack back only what you need.', 'Before and after, cards turned over.', 7,
  also=['discipline'])
m("organization-clothes-tomorrow", O, "Lay Out Your Clothes for Tomorrow", 5, 5, P,
  "Pick and lay out tomorrow's clothes tonight.", "Your clothes, laid out.", 1,
  group="tomorrow-ready", when="evening", weight=0.5)
m('organization-pack-bag', O, 'Pack Your Bag for Tomorrow', 5, 5, P,
  'Pack everything you need for tomorrow and put your bag by the door.', 'Your packed bag.', 1,
  group='tomorrow-ready', when='evening', days=WEEKNIGHTS)
m('organization-computer-desktop', O, 'Clean Up Your Computer Desktop', 15, 10, BA,
  'Delete, file or move everything on your computer desktop.', 'Before and after of the screen.', 14,
  group='computer', also=['discipline'])
m('organization-delete-files', O, 'Delete 20 Unnecessary Files', 15, 10, BA,
  'Delete or file 20 things in your downloads, desktop or drive on a computer.', 'Before and after of the folder.', 14,
  group='computer', also=['discipline'])
m('organization-notes', O, 'Organize Your Notes', 20, 10, BA,
  'Put your notes in one place, sorted by subject or project.', 'Before and after.', 10)
m('organization-car', O, 'Clean Your Car', 30, 15, BA,
  'Clear out the trash, wipe it down and vacuum the inside.', 'Before and after of the inside.', 14,
  requires=['age16'], weight=0.3)
m("organization-bathroom", O, "Clean the Bathroom", 30, 15, BA,
  "Clean the sink, toilet, shower and floor, and never mix cleaning products.", "Before and after of the sink, shot from above.", 10)
m('organization-calendar', O, 'Put Your Week Into a Calendar', 15, 10, P,
  'Add every class, shift, practice and deadline for the next 7 days to one calendar.',
  'Your calendar on paper or a computer, private details covered.', 6, group='planning-week')
m('organization-fix-broken', O, 'Fix One Broken Thing', 30, 15, BA,
  'Repair one thing you own: sew a button, patch a tire, tighten a loose handle.', 'Before and after of the item.', 14)
m('organization-kitchen', O, 'Clean the Kitchen', 30, 15, BA,
  'Wipe the counters, stove and sink, and throw out old food from the fridge.', 'Before and after of the counter and sink.', 3)
m('organization-declutter-30', O, 'Declutter for 30 Minutes', 30, 15, BA,
  "Pick one area and get rid of what you don't use for 30 minutes.", 'Before and after.', 3, group='room')
m("organization-inbox", O, "Clean Up Your Email Inbox", 15, 10, P,
  "Unsubscribe from what you never read and archive what you have dealt with.", "A note of how many lists you left and emails you archived.", 14,
  group="computer")


if __name__ == '__main__':
    root = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'content', 'missions.json')
    with open(root, 'w') as f:
        json.dump(L, f, indent=1, ensure_ascii=False)
        f.write('\n')
    from collections import Counter
    print(len(L), 'missions', dict(Counter(x['track'] for x in L)))
