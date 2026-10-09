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
      group=None, when=None, requires=None, also=None, weight=None, repeatable=True, tags=None):
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
    if weight:
        x['weight'] = weight
    x['tags'] = tags or [track]
    x['active'] = True
    L.append(x)


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
  'Put your phone in another room and spend 30 minutes on your most important task.',
  'What you worked on, after the timer.', 1, anchor=True, group='deep-work')
m('discipline-focus-20', D, 'Do a 20-Minute Focus Session', 20, 10, TP,
  'Pick one task and work on only that for 20 minutes, phone away.', 'What you got done, after the timer.', 1,
  group='deep-work')
m('discipline-lock-in-60', D, 'Lock In for 60 Minutes', 60, 25, TP,
  'Phone in another room, one hour on the work that matters most to you.', 'What you got done, after the timer.', 2,
  group='deep-work')
m('discipline-avoided-task', D, "Finish Something You've Been Avoiding", 30, 15, P,
  "Pick the task you keep putting off and get it done today.", 'The finished task, private details covered.', 3,
  group='finish-it')
m('discipline-most-important-first', D, 'Most Important Task Before Entertainment', 30, 15, P,
  'No games, videos or social apps until your most important task of the day is done.',
  'The finished task, before you open anything else.', 2, group='finish-it')
m('discipline-finish-unfinished', D, 'Finish One Unfinished Task', 20, 10, P,
  'Pick one thing you started and never finished, and finish it.', 'The finished task.', 3, group='finish-it')
m('discipline-prepare-tomorrow', D, 'Prepare Everything You Need for Tomorrow', 10, 10, P,
  'Pack your bag, lay out your clothes and charge what you need, tonight.', 'Everything ready to go.', 1,
  group='tomorrow-ready', when='evening', also=['organization'])
m('discipline-prepare-workspace', D, 'Prepare Your Workspace', 5, 5, P,
  'Clear your desk and set out only what you need for your next work session.', 'Your workspace, ready.', 2,
  group='desk')
m('discipline-plan-week', D, 'Plan Your Week', 15, 10, P,
  'Write your goals, deadlines and key tasks for the next 7 days on one page.',
  'Your week on one page, private details covered.', 6, group='planning-week')
m('discipline-clear-3-small', D, 'Knock Out 3 Small Tasks', 15, 10, P,
  'Do three small things you keep leaving: a reply, a form, a quick errand.',
  'Your list with all three crossed off.', 3)
m('discipline-phone-free-hour', D, 'Work for an Hour Without Your Phone', 60, 25, TP,
  'Leave your phone in another room and spend the hour on schoolwork, work or your project.',
  'What you got done, after the timer.', 3, group='deep-work')

# ── SCHOOL ─────────────────────────────────────────────────────────────────
S = 'school'
SC = ['school']
m('school-study-30', S, 'Study for 30 Minutes', 30, 15, TP,
  'Put your phone away and spend 30 focused minutes studying one subject.',
  'Your notes or study setup, after the timer.', 1, anchor=True, group='study', requires=SC)
m('school-study-60', S, 'Study for 60 Minutes', 60, 25, TP,
  'One hour of focused studying, phone in another room. One subject or two, no switching mid-way.',
  'Your notes or study setup, after the timer.', 2, group='study', requires=SC)
m('school-finish-assignment', S, 'Finish One Assignment', 30, 15, P,
  'Pick one assignment and finish it completely.', 'The finished assignment, name and grades covered.', 1,
  anchor=True, group='assignment', requires=SC)
m('school-start-early', S, 'Start an Assignment Early', 30, 15, P,
  "Do the first real part of an assignment that isn't due yet.", 'What you got done, name covered.', 3,
  group='assignment', requires=SC)
m('school-tonights-homework', S, "Finish Tonight's Homework", 45, 20, P,
  "Get all of tonight's homework done.", 'Your finished homework, name covered.', 1,
  group='assignment', requires=SC, anchor=True)
m('school-review-notes', S, "Review Today's Notes", 10, 10, P,
  "Go over today's class notes and mark anything you don't understand yet.", 'Your notes with what you marked.', 1,
  when='evening', requires=SC, anchor=True)
m('school-read-chapter', S, 'Read One Chapter', 30, 15, P,
  'Read one full chapter of a textbook or assigned book.', 'The book open to where you finished.', 2,
  group='school-reading', requires=SC)
m('school-assigned-reading', S, 'Read 10 Pages of Assigned Reading', 20, 10, P,
  "Read 10 pages of what's assigned for class.", 'The book open to where you stopped.', 1,
  group='school-reading', requires=SC)
m('school-hard-topic', S, 'Study One Difficult Topic', 30, 15, TP,
  "Pick the topic you understand least and work through it until it makes sense.",
  'Your notes on the topic, after the timer.', 3, group='study', requires=SC)
m('school-hardest-class', S, 'Spend 20 Minutes on Your Hardest Class', 20, 10, TP,
  "Spend 20 focused minutes on the class you're struggling with most.", 'Your work, after the timer.', 2,
  requires=SC)
m('school-practice-problems', S, 'Complete 10 Practice Problems', 30, 15, P,
  'Do 10 practice problems without looking at the answers, then check every one.', 'Your worked problems.', 2,
  requires=SC)
m('school-make-flashcards', S, 'Make Flashcards for One Topic', 20, 10, P,
  'Make at least 15 flashcards for one topic you need to know.', 'Your flashcards.', 4,
  group='flashcards', requires=SC)
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
m('school-essay-30', S, 'Write for 30 Minutes on an Essay', 30, 15, TP,
  'Spend 30 minutes writing your next essay or paper. Keep going, fix it later.',
  'Your draft, after the timer, name covered.', 3, requires=SC)

m('school-check-due', S, "Write Down What's Due This Week", 10, 10, P,
  'Write every assignment, test and deadline for the next 7 days on one list.', 'Your list.', 4, requires=SC)
m('school-plan-study-tomorrow', S, "Plan Tomorrow's Study Time", 5, 5, P,
  "Write what you'll study tomorrow, for how long and when.", 'Your plan.', 2, group='planning', requires=SC,
  when='evening')

# ── FITNESS ────────────────────────────────────────────────────────────────
F = 'fitness'
m('fitness-workout', F, 'Complete Your Workout', 45, 20, P,
  'Do your planned workout from start to finish.', 'Where you trained, right after. No people.', 1,
  anchor=True, group='workout')
m('fitness-gym', F, 'Go to the Gym', 60, 25, P,
  'Go to the gym and do a full session.', 'The gym, after your session. No people.', 1,
  group='workout', requires=['gym'])
m('fitness-train-30', F, 'Train for at Least 30 Minutes', 35, 20, TP,
  'Lift, practice your sport or do a full workout for at least 30 minutes.', 'Where you trained. No people.', 1,
  timer=30, group='workout')
m('fitness-home-workout', F, 'Do an At-Home Workout', 25, 15, TP,
  'Push-ups, squats, lunges and planks for 20 minutes at home. No equipment needed.',
  'Your workout spot, right after.', 2, timer=20, group='workout')
m('fitness-walk-30', F, 'Walk for 30 Minutes', 30, 15, TP,
  'Go for a 30-minute walk. Phone stays in your pocket.', 'Where you walked. No people.', 1, group='cardio', anchor=True)
m('fitness-run', F, 'Go for a Run', 25, 15, TP,
  'Run for at least 20 minutes at a pace you can keep. Walk breaks are fine.',
  'Your route after the run. No people.', 2, timer=20, group='cardio')
m('fitness-cardio-20', F, 'Do 20 Minutes of Cardio', 25, 15, TP,
  'Run, bike, swim, jump rope or use a cardio machine for 20 minutes.', 'Where you did it. No people.', 2,
  timer=20, group='cardio')
m('fitness-long-walk', F, 'Take a Long Walk Instead of Scrolling', 45, 20, TP,
  'Next time you reach for your phone to scroll, go for a 45-minute walk instead.',
  'Where you walked. No people.', 4, group='cardio')
m('fitness-outside-20', F, 'Get Outside and Move for 20 Minutes', 20, 10, TP,
  'Walk, bike or play outside for 20 minutes.', 'Where you were. No people.', 2, group='cardio')
m('fitness-bike-30', F, 'Bike for 30 Minutes', 30, 15, TP,
  'Ride for 30 minutes. Helmet on, routes you know.', 'Your bike after the ride. No people.', 3, group='cardio')
m('fitness-sport-30', F, 'Practice Your Sport for 30 Minutes', 30, 15, TP,
  'Work on the skills of your sport for 30 minutes: drills, shots, footwork.', 'Where you practiced. No people.', 3,
  group='workout', weight=0.3)
m('fitness-stretch-10', F, 'Stretch for 10 Minutes', 10, 10, T,
  'Stretch your hips, legs, back and shoulders for 10 minutes.', 'Run the 10-minute timer to the end.', 1,
  group='stretch', anchor=True)
m('fitness-mobility-10', F, 'Do a 10-Minute Mobility Session', 10, 10, T,
  'Ten minutes of mobility work for your hips, ankles, shoulders and back.', 'Run the 10-minute timer to the end.', 2,
  group='stretch')
m('fitness-balanced-meal', F, 'Prepare a Balanced Meal', 20, 10, P,
  'Make a meal with a protein, a carb and a fruit or vegetable.', 'Your plate before you eat.', 2, group='meal')
m('fitness-pack-meal', F, "Prepare Tomorrow's Meal", 15, 10, P,
  "Make or pack tomorrow's lunch tonight.", 'Your packed meal.', 2, group='meal', when='evening')
m('fitness-plan-week', F, "Plan This Week's Workouts", 10, 10, P,
  "Write which days you'll train this week, when, and what you'll do.", 'Your training plan.', 6)

m('fitness-core-10', F, 'Do a 10-Minute Core Workout', 10, 10, T,
  'Planks, side planks, dead bugs and glute bridges for 10 minutes.', 'Run the 10-minute timer to the end.', 2)
m('fitness-pack-gym-bag', F, 'Pack Your Gym Bag for Tomorrow', 5, 5, P,
  "Pack your shoes, clothes and water tonight for tomorrow's workout.", 'Your packed bag.', 2,
  group='tomorrow-ready', when='evening')

# ── MONEY ──────────────────────────────────────────────────────────────────
M = 'money'
m('money-track-spending', M, "Track Today's Spending", 5, 5, P,
  'Write down everything you spent today and the total.', 'Your handwritten list. No bank details.', 1,
  anchor=True, when='evening')
m('money-review-week', M, "Review This Week's Spending", 15, 10, P,
  "Add up what you spent this week and circle what you didn't need.", 'Your totals on paper. No bank details.', 6,
  group='money-review')
m('money-unneeded-purchases', M, "List This Week's Unnecessary Purchases", 10, 10, P,
  "List what you bought this week that you didn't need, and the total.", 'Your list with the total.', 6,
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
  'Your budget on paper or a laptop. No account details.', 30, group='money-plan')
m('money-cut-expense', M, 'Find a Way to Cut a Recurring Expense', 15, 10, P,
  'Look at one subscription or regular cost and find a way to lower or cancel it.',
  'Your notes: the cost and what you will do about it.', 14)
m('money-learn-concept', M, 'Learn One Personal Finance Concept', 20, 10, TP,
  'Learn one idea such as compound interest, credit scores or taxes, and write it in your own words.',
  'Your notes, after the timer.', 3, group='money-learning')
m('money-learn-budgeting', M, 'Spend 20 Minutes Learning About Budgeting', 20, 10, TP,
  'Learn one simple way to budget, like 50/30/20, and write how you would use it.',
  'Your notes, after the timer.', 10, group='money-learning')
m('money-no-impulse', M, 'Have a No-Impulse-Purchase Day', 10, 10, P,
  'Today, only buy what you planned to buy. Write down anything you skipped.',
  "Tonight's note: what you bought and what you skipped.", 3)
m('money-save-today', M, 'Put Money Into Savings', 5, 5, P,
  'Put any amount into savings today, even five dollars.', 'A note of the amount and your new total.', 7)
m('money-log-pay', M, "Log Today's Pay", 5, 5, P,
  "Write today's hours and pay, and this week's total so far.", 'Your pay log on paper.', 1,
  requires=['work'], when='evening')
m('money-sell-unused', M, "Sell One Thing You Don't Use", 30, 15, P,
  "List one thing you don't use for sale at a fair price. Under 18, a parent posts it.",
  'The item and its price on paper, or the listing on a laptop.', 14)

m('money-earn-options', M, 'Find One Way to Earn Money This Month', 20, 10, P,
  'List five ways you could earn money with what you can do, and pick one to try this month.',
  'Your list with one circled.', 14)
m('money-savings-account', M, 'Compare Two Savings Accounts', 20, 10, P,
  'Compare the interest rate and fees of two savings accounts and pick the better one.',
  'Your comparison on paper. No account details.', 60, requires=['age18'])

# ── CAREER ─────────────────────────────────────────────────────────────────
C = 'career'
m('career-apply-job', C, 'Apply to One Job', 30, 20, P,
  'Find one job you want and send a complete application.', 'The confirmation on a laptop, personal details covered.', 2,
  group='apply', requires=['age16'])
m('career-apply-internship', C, 'Apply to One Internship', 30, 20, P,
  'Find one internship you want and send a complete application.',
  'The confirmation on a laptop, personal details covered.', 2, group='apply', requires=['age16'])
m('career-find-opportunities', C, 'Find Three Opportunities', 20, 10, P,
  'Find three jobs, internships or programs you could apply to and write down each deadline.',
  'Your list of three with deadlines.', 4, group='opportunities')
m('career-research-internships', C, 'Research Internships for 20 Minutes', 20, 10, TP,
  'Look for internships in a field you want and save the ones you could apply to.', 'Your list, after the timer.', 5,
  group='opportunities')
m('career-improve-resume', C, 'Improve Your Resume', 30, 15, TP,
  'Spend 30 minutes making your resume clearer and stronger.', 'Your updated resume, contact details covered.', 5,
  group='resume')
m('career-resume-bullet', C, 'Improve One Resume Bullet', 10, 10, P,
  'Rewrite one line of your resume so it shows a result, with a number if you can.',
  'The old line and the new one, written down.', 4, group='resume')
m('career-first-resume', C, 'Write the First Draft of Your Resume', 45, 20, P,
  'Write a one-page resume: school, work, projects and skills. Short is fine.',
  'Your draft, contact details covered.', 365, repeatable=False, group='resume', weight=0.5)
m('career-linkedin', C, 'Improve Your LinkedIn', 20, 10, P,
  'Update one part of your LinkedIn: headline, about, experience or skills.',
  'The updated section on a laptop, photo and name out of frame.', 7, requires=['age16'])
m('career-portfolio', C, 'Work on Your Portfolio', 30, 20, TP,
  'Add or improve one piece in your portfolio.', 'Your portfolio on a laptop, or the piece you added.', 2,
  also=['projects', 'skills'], anchor=True)
m('career-learn-career', C, "Learn About One Career You're Interested In", 20, 10, P,
  'Find out what the job pays, what it takes to get in, and the first step toward it.', 'Your notes.', 7)
m('career-skill-30', C, 'Spend 30 Minutes Learning a Career Skill', 30, 15, TP,
  'Learn a skill employers pay for: spreadsheets, coding, writing, sales or a trade.',
  'Your notes or what you made, after the timer.', 1, anchor=True, also=['skills'])
m('career-network-message', C, 'Send One Professional Networking Message', 15, 10, P,
  'Message someone who works in a field you want and ask one specific question.',
  'A note of who you messaged (initials) and what you asked.', 4, requires=['age16'])
m('career-research-company', C, 'Research One Company', 20, 10, P,
  'Look into one company you would want to work for: what they do, who they hire, how to apply.', 'Your notes.', 5)
m('career-interview-practice', C, 'Practice Interview Questions for 20 Minutes', 20, 10, TP,
  'Answer common interview questions out loud and write down what to improve.', 'Your notes, after the timer.', 5)
m('career-application-part', C, 'Complete Part of an Application', 30, 15, P,
  'Finish one section of a job, college or scholarship application.',
  'A checklist of what you finished. Not the form.', 3)
m('career-resume-project', C, 'Build Something You Can Put on Your Resume', 45, 20, TP,
  'Spend 45 minutes on a project that shows a skill employers want.', 'What you built, after the timer.', 3,
  also=['projects', 'skills'])
m('career-cover-letter', C, 'Write a Cover Letter for One Job', 30, 15, P,
  'Write a cover letter for one job you want, tailored to that job.', 'Your letter, contact details covered.', 7,
  requires=['age16'])
m('career-manager-feedback', C, 'Ask Your Manager What to Improve', 10, 10, P,
  'Ask your manager or shift lead for one thing you could do better, and write it down.',
  'Their answer and your plan, on paper.', 21, requires=['work'])

m('career-target-skills', C, 'Find 3 Skills Your Target Job Asks For', 10, 10, P,
  'Read three postings for a job you want and write the skills they all ask for.', 'Your list of skills.', 10)
m('career-intro', C, 'Practice Introducing Yourself', 10, 10, P,
  'Write a 30-second introduction for interviews and networking, then say it out loud three times.',
  'Your written introduction.', 14, weight=0.5)

# ── BUSINESS ───────────────────────────────────────────────────────────────
B = 'business'
m('business-work-30', B, 'Work on Your Business for 30 Minutes', 30, 20, TP,
  'Spend 30 focused minutes on the part of your business that moves it forward.',
  'What you worked on, after the timer.', 1, anchor=True, group='business-session')
m('business-work-60', B, 'Work on Your Business for 60 Minutes', 60, 25, TP,
  'One focused hour on your business. Phone away, one task at a time.', 'What you got done, after the timer.', 2,
  group='business-session')
m('business-content', B, 'Create One Piece of Content', 30, 15, P,
  'Make one post, video or graphic for your business.', 'What you made.', 1, also=['projects'], anchor=True)
m('business-post', B, 'Post Something for Your Business', 15, 10, P,
  'Post one piece of content on your business account.', 'A note of what you posted and where.', 1)
m('business-website', B, 'Improve Your Website', 30, 15, P,
  'Improve one part of your website: a page, the copy, a photo or the checkout.', 'The improved page on a laptop.', 4)
m('business-competitors', B, 'Research Your Competitors for 20 Minutes', 20, 10, TP,
  'Look at what three competitors sell, what they charge and what they do better.', 'Your notes, after the timer.', 7)
m('business-reach-customer', B, 'Reach Out to One Potential Customer', 15, 10, P,
  'Contact one person or business who might buy from you.', 'A note of who (initials) and what you offered.', 2,
  requires=['age16'])
m('business-product', B, 'Work on Your Product', 30, 20, TP,
  'Spend 30 minutes making your product or service better.', 'Your product or your work, after the timer.', 2)
m('business-fix-problem', B, 'Fix One Problem With Your Business', 30, 15, P,
  "Pick one thing that's broken or slowing you down and fix it.", 'The fix, or your notes on what changed.', 3)
m('business-product-page', B, 'Improve One Product Page', 20, 10, P,
  'Improve the description, photos or price on one product page.', 'The updated page on a laptop.', 5,
  weight=0.7)
m('business-plan-tomorrow', B, "Plan Tomorrow's Business Tasks", 5, 5, P,
  "Write the 3 business tasks you'll do tomorrow, most important first.", 'Your list.', 1, group='planning', anchor=True)
m('business-marketing-idea', B, 'Create One Marketing Idea', 10, 10, P,
  'Write one way to get your business in front of more people, and the first step.', 'Your idea on paper.', 3)
m('business-customer-messages', B, 'Respond to Important Customer Messages', 15, 10, P,
  'Answer every customer message that is waiting for you.', 'A note of how many you answered. Not the messages.', 1,
  requires=['project'])
m('business-numbers', B, 'Update Your Business Numbers', 15, 10, P,
  "Write down this week's sales, costs and profit.", 'Your numbers on paper or a laptop. No account details.', 6)
m('business-idea-to-real', B, 'Turn One Idea Into Something Real', 45, 20, P,
  'Take one idea and make the first real version of it today.', 'What you made.', 7, also=['projects'])
m('business-customer-feedback', B, 'Ask a Customer for Feedback', 10, 10, P,
  'Ask one customer what they liked and what they would change.', 'Their answer, written down. No names.', 7,
  requires=['project'])

# ── PROJECTS ───────────────────────────────────────────────────────────────
PR = 'projects'
m('projects-build-30', PR, 'Build Your Project for 30 Minutes', 30, 20, TP,
  'Spend 30 focused minutes building your project.', 'What you built, after the timer.', 1,
  anchor=True, group='project-session')
m('projects-build-60', PR, 'Build Your Project for 60 Minutes', 60, 25, TP,
  'One focused hour on your project. Phone away.', 'What you built, after the timer.', 2, group='project-session')
m('projects-instead-of-scrolling', PR, 'Spend 30 Minutes Building Instead of Scrolling', 30, 20, TP,
  'Next time you reach for your phone, build something for 30 minutes instead.', 'What you built, after the timer.', 3,
  group='project-session')
m('projects-finish-feature', PR, 'Finish One Feature', 45, 20, P,
  'Finish one feature or part of your project so it fully works.', 'The finished part.', 2)
m('projects-fix-problem', PR, 'Fix One Bug or Problem in Your Project', 30, 15, P,
  "Pick one thing in your project that doesn't work right and fix it.", 'The fix, or your notes on what changed.', 2)
m('projects-design', PR, 'Create One Design', 30, 15, P,
  'Make one finished design: a logo, a layout, a graphic or a mockup.', 'Your design.', 2)
m('projects-write-page', PR, 'Write One Page', 30, 15, P,
  'Write one full page of your story, script, article or blog.', 'Your page.', 2)
m('projects-film-video', PR, 'Film One Video', 30, 15, P,
  'Film all the clips you need for one short video.', 'Your setup or shot list. No people.', 3, group='video')
m('projects-edit-video', PR, 'Edit One Video', 45, 20, P,
  'Edit one video from start to finished export.', 'The finished edit on a laptop screen.', 3, group='video')
m('projects-publish', PR, 'Publish Something You Created', 15, 10, P,
  'Put one finished thing out: post it, upload it, submit it or show it.',
  'A note of what you published and where.', 4)
m('projects-finish-not-start', PR, 'Finish One Thing Instead of Starting Another', 45, 20, P,
  'Pick one unfinished project and finish one piece of it before you start anything new.',
  'The finished piece.', 5)
m('projects-plan-steps', PR, "Plan Your Project's Next Steps", 10, 10, P,
  'Write the next 5 steps for your project, smallest first.', 'Your list.', 5)
m('projects-small-project', PR, 'Create One Small Project', 60, 25, P,
  'Start and finish one small thing in a single sitting.', 'What you made.', 5, also=['skills'])
m('projects-get-feedback', PR, 'Get Feedback on Your Project', 15, 10, P,
  'Show your project to one person and write down what they would change.', 'Their feedback, written down.', 5)

m('projects-small-fix', PR, 'Fix One Small Thing in Your Project', 15, 10, P,
  'Fix one small thing in your project: a typo, a broken link, a rough edge.', 'The fix.', 2)
m('projects-back-up', PR, 'Back Up Your Project Files', 10, 10, P,
  'Copy your project files to a second place: a cloud folder or a drive.', 'The backup folder on a laptop.', 14)

# ── SKILLS ─────────────────────────────────────────────────────────────────
K = 'skills'
m('skills-learn-30', K, 'Learn a Skill for 30 Minutes', 30, 15, TP,
  "Spend 30 focused minutes learning the skill you're working on.",
  'Your notes or what you made, after the timer.', 1, anchor=True, group='skill-session')
m('skills-course-lesson', K, 'Complete One Course Lesson', 30, 15, P,
  'Finish one lesson of a course you are taking, including any exercise.',
  'Your notes or the finished exercise.', 1, group='skill-session', anchor=True)
m('skills-practice-not-watch', K, 'Practice Instead of Just Watching Tutorials', 30, 15, TP,
  'Close the tutorials and practice on your own for 30 minutes.', 'What you made, after the timer.', 3,
  group='skill-session')
m('skills-coding', K, 'Practice Coding for 30 Minutes', 30, 15, TP,
  'Write code for 30 minutes: an exercise, a small feature or a bug fix.', 'Your code on a laptop, after the timer.', 1,
  requires=['coding'], group='skill-session')
m('skills-design', K, 'Practice Design for 30 Minutes', 30, 15, TP,
  'Spend 30 minutes designing: a layout, a logo, a type study or a redesign.', 'What you made, after the timer.', 1,
  requires=['design'], group='skill-session')
m('skills-editing', K, 'Practice Editing for 30 Minutes', 30, 15, TP,
  'Spend 30 minutes editing: cuts, pacing, color or sound on real footage.', 'Your timeline on a laptop, after the timer.', 1,
  requires=['video'], group='skill-session')
m('skills-writing', K, 'Practice Writing for 30 Minutes', 30, 15, TP,
  'Write for 30 minutes without stopping to fix anything.', 'Your pages, after the timer.', 1,
  requires=['writing'], group='skill-session')
m('skills-language', K, 'Practice a Language for 20 Minutes', 20, 10, TP,
  "Speak, read and write the language you're learning for 20 minutes.", 'Your notes, after the timer.', 1,
  requires=['language'])
m('skills-instrument', K, 'Practice Your Instrument for 30 Minutes', 30, 15, T,
  'Practice your instrument for 30 minutes, the hard parts first.', 'Run the 30-minute timer to the end.', 1,
  requires=['music'], group='skill-session')
m('skills-lesson-notes', K, 'Watch One Educational Lesson and Take Notes', 20, 10, P,
  'Watch one lesson on something useful and take notes as you go.', 'Your notes.', 2)
m('skills-build-with-skill', K, "Build Something With the Skill You're Learning", 45, 20, P,
  "Use what you've learned to make one small, real thing.", 'What you made.', 3)
m('skills-read-10', K, 'Read 10 Pages of a Useful Book', 15, 10, P,
  'Read 10 pages of a book that teaches you something.', 'The book open to where you stopped.', 1,
  anchor=True, group='reading')
m('skills-read-30', K, 'Read for 30 Minutes', 30, 15, TP,
  'Read a book that teaches you something for 30 minutes, phone away.', 'The book open to where you stopped.', 2,
  group='reading')
m('skills-notes-new', K, 'Take Notes on Something New You Learned', 10, 10, P,
  'Write down one new thing you learned today and how you will use it.', 'Your notes.', 2)
m('skills-typing', K, 'Practice Typing for 15 Minutes', 15, 10, TP,
  'Do a typing course or test for 15 minutes and write down your speed.', 'Your speed written down, after the timer.', 3)
m('skills-spreadsheets', K, 'Learn One Spreadsheet Skill', 20, 10, TP,
  'Learn one spreadsheet skill such as formulas, sorting or charts, and use it once.',
  'What you made on a laptop, after the timer.', 5, also=['career'])

m('skills-review-yesterday', K, "Review Yesterday's Notes for 10 Minutes", 10, 10, P,
  "Go over what you learned yesterday before you learn anything new.", 'Your notes.', 2)
m('skills-practice-exercise', K, 'Do One Practice Exercise for Your Skill', 15, 10, P,
  'Do one short exercise for the skill you are learning.', 'What you made.', 1)

# ── ORGANIZATION ───────────────────────────────────────────────────────────
O = 'organization'
m('organization-clean-room-15', O, 'Clean Your Room for 15 Minutes', 15, 10, BA,
  'Set the timer for 15 minutes and clean until it ends.', 'Before and after of the part you cleaned.', 2,
  group='room', anchor=True)
m('organization-clean-room', O, 'Clean Your Whole Room', 45, 20, BA,
  'Floor clear, surfaces clear, bed made, trash and dishes out.', 'Before and after.', 7, group='room')
m('organization-clean-desk', O, 'Clean Your Desk', 10, 10, BA,
  "Clear everything off your desk that doesn't belong there.", 'Before and after of your desk.', 3, group='desk', anchor=True)
m('organization-clear-surface', O, 'Clear One Cluttered Surface', 10, 10, BA,
  'Clear one table, counter or dresser until only what belongs there is left.', 'Before and after.', 3)
m('organization-drawer', O, 'Organize One Drawer', 15, 10, BA,
  "Empty one drawer, throw out the junk and put back only what you use.", 'Before and after of the drawer.', 7)
m('organization-closet', O, 'Organize Your Closet for 15 Minutes', 15, 10, BA,
  "Hang, fold and sort your closet for 15 minutes and pull out what you don't wear.", 'Before and after.', 10)
m('organization-laundry', O, 'Do Your Laundry', 30, 15, P,
  'Wash, dry and fold one load of your own laundry.', 'The folded load.', 4, group='laundry')
m('organization-put-away-laundry', O, 'Put Away Your Laundry', 10, 10, P,
  'Fold and put away all of your clean laundry.', 'Your empty laundry basket.', 2, group='laundry')
m('organization-dishes', O, 'Do the Dishes', 15, 10, P,
  'Wash, dry and put away the dishes.', 'The empty sink.', 3)
m('organization-trash', O, 'Take Out Your Trash', 5, 5, P,
  'Empty your trash and recycling and take them out.', 'The empty bin.', 3)
m('organization-bag', O, 'Clean Out Your Backpack or Work Bag', 10, 10, BA,
  'Empty your bag, throw out the trash and pack back only what you need.', 'Before and after, cards turned over.', 7)
m('organization-clothes-tomorrow', O, 'Lay Out Your Clothes for Tomorrow', 5, 5, P,
  "Pick and lay out tomorrow's clothes tonight.", 'Your clothes, laid out.', 1,
  group='tomorrow-ready', when='evening')
m('organization-pack-bag', O, 'Pack Your Bag for Tomorrow', 5, 5, P,
  'Pack everything you need for tomorrow and put your bag by the door.', 'Your packed bag.', 1,
  group='tomorrow-ready', when='evening')
m('organization-computer-desktop', O, 'Clean Up Your Computer Desktop', 15, 10, BA,
  'Delete, file or move everything on your computer desktop.', 'Before and after of the screen.', 14,
  group='computer')
m('organization-delete-files', O, 'Delete 20 Unnecessary Files', 15, 10, BA,
  'Delete or file 20 things in your downloads, desktop or drive on a computer.', 'Before and after of the folder.', 14,
  group='computer')
m('organization-notes', O, 'Organize Your Notes', 20, 10, BA,
  'Put your notes in one place, sorted by subject or project.', 'Before and after.', 10)
m('organization-car', O, 'Clean Your Car', 30, 15, BA,
  'Clear out the trash, wipe it down and vacuum the inside.', 'Before and after of the inside.', 14,
  requires=['age16'], weight=0.3)
m('organization-bathroom', O, 'Clean the Bathroom', 30, 15, BA,
  'Clean the sink, mirror, toilet, shower and floor.', 'Before and after, taken from above. No mirror shots.', 10)
m('organization-calendar', O, 'Put Your Week Into a Calendar', 15, 10, P,
  'Add every class, shift, practice and deadline for the next 7 days to one calendar.',
  'Your calendar on paper or a laptop, private details covered.', 6, group='planning-week')
m('organization-declutter-30', O, 'Declutter for 30 Minutes', 30, 15, BA,
  "Pick one area and get rid of what you don't use for 30 minutes.", 'Before and after.', 7, group='room')
m('organization-inbox', O, 'Clean Up Your Email Inbox', 15, 10, P,
  'Unsubscribe from what you never read and archive what you have dealt with.',
  'Your inbox on a laptop, addresses covered.', 14, group='computer')


if __name__ == '__main__':
    root = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'content', 'missions.json')
    with open(root, 'w') as f:
        json.dump(L, f, indent=1, ensure_ascii=False)
        f.write('\n')
    from collections import Counter
    print(len(L), 'missions', dict(Counter(x['track'] for x in L)))
