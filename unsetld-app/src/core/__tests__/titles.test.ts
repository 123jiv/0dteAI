// 3.3: personalization only fills a mission's one slot from the user's own words; anything
// unclear keeps the approved title.
import { describe, expect, it } from 'vitest';
import { missionTitle, opportunityFrom, projectFrom, skillFrom, subjectFrom } from '../titles';

const P1 = { title: 'Work on Your Project for 30 Minutes', template: 'Work on {project} for 30 Minutes', personalize: 'project' as const };
const S1 = { title: 'Study One Subject for 30 Minutes', template: 'Study {subject} for 30 Minutes', personalize: 'subject' as const };
const C3 = { title: 'Find 3 Opportunities Worth Applying To', template: 'Find 3 {opportunities} Worth Applying To', personalize: 'opportunity' as const };
const C2 = { title: 'Apply to One Job or Internship', template: 'Apply to One {opportunity}', personalize: 'opportunity' as const };
const K1 = { title: 'Practice Your Skill for 30 Minutes', template: 'Practice {skill} for 30 Minutes', personalize: 'skill' as const };
const me = (goal: string | null, skills: string[] = []) => ({ goal, skills: skills as never[] });

describe('personalized titles', () => {
  it("fills the founder's examples", () => {
    expect(missionTitle(P1, me('Launch my clothing brand'))).toBe('Work on Your Clothing Brand for 30 Minutes');
    expect(missionTitle(P1, me('Launch UNSETLD'))).toBe('Work on UNSETLD for 30 Minutes');
    expect(missionTitle(C3, me('Get a finance internship'))).toBe('Find 3 Finance Internships Worth Applying To');
    expect(missionTitle(S1, me('Pass calculus'))).toBe('Study Calculus for 30 Minutes');
    expect(missionTitle(K1, me(null, ['coding']))).toBe('Practice Coding for 30 Minutes');
  });

  it('reads the five test personas sensibly', () => {
    expect(projectFrom('Build a clothing brand and save money')).toBe('Your Clothing Brand');
    expect(projectFrom('Build and ship an app')).toBe('Your App');
    expect(missionTitle(C2, me('Get a software job and improve coding'))).toBe('Apply to One Software Job');
    expect(skillFrom({ skills: ['coding', 'design'], goal: 'Get a software job and improve coding' })).toBe('Coding');
    expect(projectFrom('Grow my YouTube channel')).toBe('Your YouTube Channel');
  });

  it('keeps the approved title when the goal names nothing clear', () => {
    for (const goal of ['Improve grades and train consistently', 'Improve fitness, save money, and find a better job', 'Build muscle', 'Start running', 'Make the varsity team', '', null]) {
      expect(missionTitle(P1, me(goal))).toBe(P1.title);
      expect(missionTitle(S1, me(goal))).toBe(S1.title);
      expect(missionTitle(C3, me(goal))).toBe(C3.title);
    }
    // A capitalised word that's what they're doing, not a name; a count, an account or a sport's game isn't a project.
    for (const goal of ['Build Muscle', 'Start Running', 'Make Varsity', 'Finish Chemistry', 'Start College', 'Open a savings account', 'Make my basketball game better', 'Finish one book a month']) {
      expect(projectFrom(goal), goal).toBeNull();
    }
    // Abbreviations with another meaning ("my stats this season", "my Instagram bio") aren't subjects.
    expect(subjectFrom('Improve my stats this season')).toBeNull();
    expect(subjectFrom('Update my Instagram bio')).toBeNull();
    // Two subjects, or none: no guess.
    expect(subjectFrom('Pass chemistry and physics')).toBeNull();
    expect(opportunityFrom('find a better job')).toBeNull();
    // Two skills and a goal that names neither: the plain title.
    expect(missionTitle(K1, me('Get better every day', ['design', 'music']))).toBe(K1.title);
  });

  it('never changes a mission without a slot', () => {
    expect(missionTitle({ title: 'Clear Your Desk' }, me('Launch my clothing brand'))).toBe('Clear Your Desk');
  });
});
